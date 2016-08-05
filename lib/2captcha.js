var solver = require('2captcha');



function solve(url) {
  var defer = Promise.defer();

  try{
    solver.decodeUrl(url, {pollingInterval: 10000}, function(err, result, invalid) {
      if(err) return defer.reject(err);
      defer.resolve({
        text:    result.text,
        invalid: invalid,
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
}

module.exports.solve = function trySolve(sid) {
  return solve(sid)
  .catch(function(err){
    if(err.error && err.error.code == 'ETIMEDOUT'){
      console.log('timeout');
      return trySolve(sid);
    }
    console.error('captha solver error: ' + err);
  })
}