var request = require('./request.js');

var commonLogger = require('log4js').getLogger()
var logger = require('log4js').getLogger('2captcha')
var solver = require('2captcha');

function makeInvalidCb(id, text, invalidCb){
  return function(){
    logger.trace('invalid text. sid:', sid, 'text:', text)
    invalidCb()
  }
}

function solve(url) {
  var defer = Promise.defer();

  try{
    solver.decodeUrl(url, {pollingInterval: 10000}, function(err, result, invalid) {
      if(err) return defer.reject(err);
      defer.resolve({
        text:    result.text,
        invalid: makeInvalidCb(result.id, result.text, invalid),
        id:      result.id
      });
    });
    
  }
  catch(e){
    defer.reject(e);
  }
  return defer.promise;
}


module.exports.init = function(token){
  solver.setApiKey(token);
  this.apiKey = token;
}

module.exports.solve = function trySolve(sid) {
  return solve(sid)
  .catch(function(err){
    if(err.error && err.error.code == 'ETIMEDOUT'){
      commonLogger.trace('timeout');
      return trySolve(sid);
    }
    logger.error('captha solver error', err);
  })
}

module.exports.getBalance = function(){
  var ops = {
    url: 'https://2captcha.com/res.php?action=getbalance&key=' + this.apiKey,
    method: 'GET'
  }

  return request(ops);
}