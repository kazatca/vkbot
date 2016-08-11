var requestPromise = require('request-promise');
var requestOriginal = require('request');

var logger = require('log4js').getLogger()
var extend = require('extend')

var jar = requestPromise.jar();

requestPromise = requestPromise.defaults({
  followAllRedirects: true,
  jar: jar,
  timeout: 3000
});

function request(ops){
  return requestPromise(extend({jar: jar}, ops))
  .catch(function(err) {
    if(err.error.code == 'ETIMEDOUT'){
      logger.debug('timeout');
      return request(ops);
    }
    throw err;
  })
}

module.exports = request;

module.exports.cleanCookies = function(){
  jar = requestPromise.jar();
}

module.exports.pipe = function(ops){
  logger.debug(ops)
  return requestOriginal(extend({jar: jar}, ops))
}

