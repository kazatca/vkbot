var logger = require('log4js').getLogger()
var MongoClient = require('mongodb').MongoClient;


module.exports.connect = function(url) {
  logger.debug('connect to db');
  var defer = Promise.defer();
  MongoClient.connect(url, function (err, db) {
    if(err){
      return defer.reject(err);
    }
    defer.resolve(db);
  })
  return defer.promise;
}

