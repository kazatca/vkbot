var logger = require('log4js').getLogger()
var mongo = require('mongodb').MongoClient


var EventBuilder = require('./event-builder.js')



function Bot(vk){
  this.vk = vk;
  this.cache = {}

  this.eventBuilder = new EventBuilder(vk)
}

module.exports = Bot


Bot.prototype.setDb = function(url) {
  this.dbUrl = url
};

Bot.prototype.getDb = function(){
  var self = this;
  
  if(!self.db){
    return mongo.connect(self.dbUrl)
    .then(function(db){
      self.db = db;
      return db;
    })
  }
  return Promise.resolve(self.db);
}


Bot.prototype.getValue = function(key) {
  var self = this;

  if(this.cache[key]){
    return Promise.resolve(this.cache[key])
  }

  return this.getDb()
  .then(function(db){
    return db.collection('bot').findOne({key: key})
  })
  .then(function(result){
    if(!result){
      return
    }

    self.cache[key] = result.value
    return result.value
  })
};

Bot.prototype.setValue = function(key, value) {
  var self = this;
  return this.getDb()
  .then(function(db){
    return db.collection('bot').update({key: key}, {key: key, value: value}, {upsert: true})
  })
  .then(function(result){
    self.cache[key] = value
  })
};

Bot.prototype.getProtoEvents = function() {
  return this.eventBuilder.getEvents()
  .then(function(events){
    return events.filter(function(event) {
      return event.status && event.status == 'proto'
    })
  })

};

Bot.prototype.addContact = function(event_id, person) {
  return this.vk.api('groups.editManager', {
    group_id: event_id,
    user_id: person.id,
    role: person.role,
    is_contact: 1,
    contact_phone: person.phone
  })
};

Bot.prototype.createEvent = function(message) {
  var self = this;
  return self.getProtoEvents()
  .then(function(protos) {
    return protos.filter(function(proto) {
      return message.substr(0, proto.name.length) == proto.name
    })
  })
  .then(function(protos) {
    if(protos.length != 1){
      return {
        text: 'не понял что делать :('
      }
    }

    var proto = protos[0]
    var date = message.substr(proto.name.length+1)

    var promise = self.eventBuilder.create(proto.name, date)
    .then(function(target_id){
      return {
        text: 'готово https://vk.com/event'+target_id 
      }
    })
    .catch(function(error) {
      var text = 'не получилось';
      if(error.error_msg){
        text +=', ошибка: ' + error.error_msg 
      }
      return {
        text: text
      }
    })

    return {
      text: 'приступил',
      promise: promise
    }
  })
  
};


Bot.prototype.handleMessage = function(message) {
  var self = this;
  logger.info('получил собщение:', message)
  
  if(message == 'кто ты?'){
    return self.getValue('name')
    .then(function(name){
      if(name){
        return {
          text: 'я ' + name
        }
      }

      return {
        text: 'я не знаю'
      }
    })
  }

  if(message.indexOf('ты ')==0 && message.length > 3){
    var name = message.substr(3)

    return self.setValue('name', name)
    .then(function(){
      return {
        text: 'ок'
      }
    })
  }

  message = message.split(' ')
  if(message[0] == 'делай'){
    message.shift()
    message = message.join(' ')
    return self.createEvent(message)
  }

}