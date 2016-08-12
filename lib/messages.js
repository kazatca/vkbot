

function Messages(vk) {
  this.vk = vk
}

module.exports = Messages;

Messages.prototype.getHistory = function(user_id) {
  var count = 200;
  return this.vk.api('messages.getHistory', {
    user_id: user_id,
    count: count
  })
  .then(function(resp){
    if(resp.count > resp.length){
      var result = resp.items;
      var promise = Promise.resolve();
      
      for(var offset = count; offset < resp.count; offset += count){
        promise = promise.then(function(offset){
          return self.vk.api('messages.getHistory', {
            user_id: user_id,
            offset:  offset,
            count:   count
          })
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
