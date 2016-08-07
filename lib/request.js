var requestPromise = require('request-promise');

var jar = requestPromise.jar();

requestPromise = requestPromise.defaults({
  followAllRedirects: true,
  jar: jar,
  timeout: 3000
});

function request(ops){
  return requestPromise(ops)
  .catch(function(err) {
    if(err.error.code == 'ETIMEDOUT'){
      console.log('timeout');
      return request(ops);
    }
    throw err;
  })
}

module.exports = request;

