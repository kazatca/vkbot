var dbConnect =require('./db.js').connect;
var getToken = require('./oauth.js');
var request = require('./request.js');

var Groups = require('./groups.js');

function VK(email, pass, clientId) {
  this.email = email;
  this.pass = pass;
  this.clientId = clientId;

  this.groups = new Groups(this);
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
    console.log('connect to db');
    return dbConnect(self.dbUrl)
    .then(function(db){
      console.log('ok')
      self.db = db;
      return db;
    })
    .catch(console.error);
  }
  return Promise.resolve(self.db);
}

VK.prototype.updateToken= function(){
  var self = this;
  console.log('update token');
  return self.getCredsFromDb(self.email)
  .then(function(creds){
    console.log('use token from db')
    if(creds){
      self.creds = creds;
      return;
    }
    console.log('renew token')
    return getToken(self.clientId, self.email, self.pass)
    .then(function(creds){
      creds.email = self.email;
      creds.expire = creds.expire_in + Math.floor(new Date()/1000)
      self.creds = creds;
      return self.saveCredsToDb(creds);
    })
  })
  .catch(console.error);
}

VK.prototype.api=function(method, params, captcha){
  var self = this;
  
  if(!self.creds){
    return self.updateToken()
    .then(function(){
      return self.api(method, params)
    });
  }

  console.log(method, params, captcha)
  var ops = {
    url: 'https://api.vk.com/method/' + method,
    method: 'POST',
    form: params || {},
    transform: function(body){
      return JSON.parse(body);
    }
  }
  
  ops.form.access_token = self.creds.access_token;
  ops.form.v = '5.53';
  if(captcha){
    ops.form.captcha_sid = captcha.sid;
    ops.form.captcha_key = captcha.key;
  }
  
  return request(ops)
  .then(function(body) {

    if(body.error){
      
      if(body.error.error_code == 14 && self.captchaSolver){ //captcha needed
        if(captcha){
          console.log('invalid captcha (sid: ' + captcha.sid + ', 2captcha_id: ' + captcha.id + ')');
          captcha.invalid();
        }
        console.log('send captcha to solver');
        return self.captchaSolver.solve(body.error.captcha_img)
        .then(function(result){
          console.log('captcha text: ' + result.text)
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
    return body.response
  })
}

VK.prototype.saveCredsToDb = function(creds){
  console.log('save creds');
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
  console.log('get creds from db');

  return this.getDb()
  .then(function(db){
    var defer = Promise.defer();
    db.collection('token').find({email: email}).toArray(function(err, docs){
      if(err){
        return defer.reject(err);
      }
      console.log(docs)
      var doc = docs[0];
      if(!doc || new Date()*1 > doc.expire){
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