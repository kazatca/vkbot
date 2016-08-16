module.exports = function(list, cb) {
  return list.reduce(function(promise, item){
    return promise.then(function() {
      return cb(item)
    })
  }, Promise.resolve())
}