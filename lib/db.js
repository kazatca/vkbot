var MongoClient = require('mongodb').MongoClient;

module.exports.connect = function(url) {
  var defer = Promise.defer();
  MongoClient.connect(url, function (err, db) {
    if(err){
      return defer.reject(err);
    }
    defer.resolve(db);
  })
  return defer.promise;
}

