var logger = require('log4js').getLogger()
var VK = require('./lib/vk.js');


var vk = new VK(process.env.VK_EMAIL, process.env.VK_PASS, process.env.VK_CLIENTID);
vk.setDb(process.env.OPENSHIFT_MONGODB_DB_URL)

var abonent = 3600733

function getLastMessage(){
  return vk.api('messages.getHistory', {user_id:abonent, count:1})
  .then(function(messages){
    return messages.items[0]
  })
}

function wait(delay){
  defer = Promise.defer();
  setTimeout(defer.resolve, delay)
  return defer;
}

function handleCommand(message){
  var defer = Promise.defer();
  logger.debug(message)
  if(message == 'кто ты?'){
    return defer.resolve('я бот');
  }
  defer.resolve()
  return defer.promise
}

function loop(){
  return getLastMessage()
  .then(function(message){
    if(message.from_id == abonent){
      return handleCommand(message)
      .then(function(answer){
        if(answer){ 
          return vk.api('messages.send', {
            user_id: abonent,
            message: result 
          })
        }
      })
    }
  })
  .then(wait.bind(null, 5000))
  .then(loop)
  .catch(function(err){
    vk.done()
    logger.error(err);
  })
}

loop();
