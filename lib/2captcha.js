var request = require('request-promise');
var querystring = require('querystring');
var extend = require('extend');
var logger = require('log4js').getLogger('2Captcha')

var apiInUrl = 'http://2captcha.com/in.php';
var apiResUrl = 'http://2captcha.com/res.php';

var defaultOptions = {
  apiCallDelay: 2000
};


function CaptchaSolver(apiKey, options){
  this.apiKey = apiKey;
  this.options = extend(defaultOptions, options);
  this.lastApiCall = 0
}

module.exports = CaptchaSolver;

function now(){
  return new Date()*1
}

CaptchaSolver.prototype.wait = function() {
  var self = this;

  var defer = Promise.defer()
  var delay = this.options.apiCallDelay - (now() - this.lastApiCall)
  
  setTimeout(function(){
    self.lastApiCall = now()
    defer.resolve()
  }, Math.max(0, delay))

  return defer.promise;
};


CaptchaSolver.prototype.api = function(method, params){
  logger.debug(method, params)

  var ops = {
    url: apiResUrl + '?' + querystring.stringify(extend({
      action: method,
      key: this.apiKey,
    }, params))
  };
  return this.wait()
  .then(function() {
    return request(ops)
  })
  .then(function(resp){
    logger.debug(resp);
    return resp;
  })
}

CaptchaSolver.prototype.pollCaptcha = function(id){
  var self = this;
  var ops = {
    url: apiResUrl + '?' + querystring.stringify({
      action: 'get',
      key: self.apiKey,
      id: id,
    })
  }

  return self.api('get', {id: id})
  .then(function(resp){
    resp = resp.split('|')
    var status = resp[0], text = resp[1];
    
    if(status == 'CAPCHA_NOT_READY'){
      logger.debug('captcha not ready')
      return self.pollCaptcha(id)
    }
    if(status == 'OK'){
      logger.debug('captcha ready. text = ' + text)
      return {
        id: id,
        text: text
      }
    }

    logger.error('2captcha error: ' + status)
    throw '2captcha error: ' + status;
  })

}

CaptchaSolver.prototype.decode = function(body, options){
  var self = this;

  var ops = {
    url: apiInUrl,
    method: 'POST',
    form: {
      method: 'base64',
      key: this.apiKey,
      body: body
    }
  }

  return request(ops)
  .then(function(resp){
    resp = resp.split('|');
    var status = resp[0], id = resp[1];

    if (status == 'OK'){
      logger.debug('image uploaded. id =', id)
      return id;
      // return self.pollCaptcha(id);
    }

    logger.error('2captcha error: ' + status);
    throw '2captcha error: ' + status;
  });
}

CaptchaSolver.prototype.decodeUrl = function(url, options) {
  var self = this;

  logger.debug('fetch image '+url)
  var ops = {
    url: url,
    encoding: 'base64'
  };

  return request(ops)
  .then(function(body){
    logger.debug('image fetched')
    return self.decode(body, options)
  });
}

CaptchaSolver.prototype.reportBad = function(id){
  return this.api('reportbad', {id: id});
}

CaptchaSolver.prototype.solve = function(url, options){
  var self = this;

  return self.decodeUrl(url, options)
  .then(function(id){
    return self.pollCaptcha(id)
  })
}