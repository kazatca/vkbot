var extend = require('extend');

var mongo =require('mongodb').MongoClient;
var getToken = require('./oauth.js');
var request = require('./request.js');

var logger = require('log4js').getLogger()

var Groups = require('./groups.js');
var Messages = require('./messages.js')
var Photos = require('./photos.js')
var Pages = require('./pages.js')
var Docs = require('./docs.js')

var API_VERSION = '5.53';

function VK(email, pass, clientId) {
  this.email = email;
  this.pass = pass;
  this.clientId = clientId;

  this.apiCallDelay = 1000; //one second  
  this.scope = ['groups', 'messages', 'pages', 'photos', 'wall', 'docs', 'video']

  this.groups = new Groups(this);
  this.messages = new Messages(this);
  this.photos = new Photos(this);
  this.pages = new Pages(this);
  this.docs = new Docs(this);
}


module.exports = VK

VK.prototype.setDb = function(url){
  this.dbUrl = url;
}

VK.prototype.setCaptchaSolver = function(solver){
  this.captchaSolver = solver;
}

VK.prototype.getDb = function(){
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

VK.prototype.renewCreds = function() {
  var self = this;
  logger.debug('renew creds')
  return getToken(self.clientId, self.email, self.pass, self.scope)
  .then(function(creds){
    // logger.trace(creds)
    creds.email = self.email;
    creds.expires = Math.floor(new Date()/1000) + creds.expires_in*1
    self.creds = creds;
    
    self.saveCredsToDb(creds); //dont wait
  })
  
};

VK.prototype.getCreds= function(){
  var self = this;
  logger.debug('get creds');
  return self.getCredsFromDb(self.email)
  .then(function(creds){
    if(creds){
      logger.debug('use creds from db');
      self.creds = creds;
      return;
    }
    return self.renewCreds();
  })
}

VK.prototype.fetchAll = function(method, params, portion) {
  var self = this;
  portion = portion || 1000;
  return this.api(method, extend({count: portion, offset: 0}, params))
  .then(function(resp){
    if(resp.count > resp.items.length){
      var promise = Promise.resolve()
      var result = resp.items;

      for (var offset = portion; offset< resp.count; offset += portion){
        promise = promise.then(function(offset){
          return self.api(method, extend({offset: offset, count: portion}, params))
          .then(function(resp){
            result = result.concat(resp.items)
          })
        }.bind(null, offset))
      }

      return promise
      .then(function(){
        return result
      })
    }
    
    return resp.items
  })
};

VK.prototype.api=function(method, params, captcha){
  var self = this;
  
  if(!self.creds){
    return self.getCreds()
    .then(function(){
      return self.api(method, params, captcha)
    });
  }

  logger.debug(method, params, captcha)
  
  var form = extend({}, params, {
    access_token: self.creds.access_token,
    v: API_VERSION
  });

  if(captcha){
    form = extend(form, {
      captcha_sid: captcha.sid,
      captcha_key: captcha.key
    });
  }

  var ops = {
    url: 'https://api.vk.com/method/' + method,
    method: 'POST',
    form: form,
    transform: function(body){
      return JSON.parse(body);
    }
  }
  
  return self.wait()
  .then(request.bind(null, ops))
  .then(function(body) {

    if(body.error){
      logger.debug(body.error)
      if(body.error.error_code == 5){ // user authorization failed
        logger.info('token renew needed')
        return self.renewCreds()
        .then(function(){
          return self.api(method, params, captcha);
        })
      }

      if(body.error.error_code == 14 && self.captchaSolver){ // captcha needed
        if(captcha){
          captcha.invalid();
        }
        logger.debug('send captcha to solver');
        return self.captchaSolver.solve(body.error.captcha_img)
        .then(function(result){
          logger.debug('captcha text: ' + result.text)
          return self.api(method, params, {
            sid: body.error.captcha_sid,
            key: result.text,
            id:  result.id,
            invalid: result.invalid
          });
        })
      }

      throw body.error
    }

    logger.debug(body.response)
    return body.response
  })
}

VK.prototype.saveCredsToDb = function(creds){
  logger.debug('save creds');
  return this.getDb()
  .then(function(db){
    var defer = Promise.defer();
    db.collection('token').update({email: creds.email}, creds, {upsert: true}, function(err){
      if(err){
        return defer.reject(err);
      }
      defer.resolve();
    })
    return defer.promise;
  })
};

VK.prototype.getCredsFromDb = function(email){
  logger.debug('get creds from db');

  return this.getDb()
  .then(function(db){
    var defer = Promise.defer();
    db.collection('token').find({email: email}).toArray(function(err, docs){
      if(err){
        return defer.reject(err);
      }
      var doc = docs[0];
      if(!doc || Math.floor(new Date()/1000) > doc.expires){
        return defer.resolve();
      }
      defer.resolve(doc);
    });
    return defer.promise;
  });
}

VK.prototype.done= function(){
  if(this.db){
    this.db.close();
  }
}
VK.prototype.setApiCallDelay = function(delay) {
  this.apiCallDelay = delay
};

function now(){
  return new Date()*1
} 

VK.prototype.wait = function() {
  var self = this;

  var defer = Promise.defer()
  var delay = this.apiCallDelay - (now() - this.lastApiCall)
  
  setTimeout(function(){
    self.lastApiCall = now()
    defer.resolve()
  }, Math.max(0, delay))

  return defer.promise;
};
