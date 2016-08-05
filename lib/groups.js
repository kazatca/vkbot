


function Groups(vk){
  this.vk = vk;
}

module.exports = Groups;

Groups.prototype.getById=function(group_id, fields){
  fields = fields || []
  return this.vk.api('groups.getById', {
    group_id: group_id,
    fields: fields.join(',')
  });
}


Groups.prototype.getMembers = function(group_id){
  var self = this;
  var portion = 1000;
  return this.getById(group_id, ['members_count'])
  .then(function(resp){
    return resp[0].members_count;
  })
  .then(function(cnt){
    var result = [];
    var promise = Promise.resolve();

    for(var offset=0; offset<cnt; offset += portion){
      promise = promise.then(function(offset){
        return self.vk.api('groups.getMembers', {group_id: group_id, offset: offset, count: portion})
      }.bind(null, offset))
      .then(function(resp){
        result = result.concat(resp.items)
      })
    }
    return promise.then(function(){
      return result;
    });
  })
}


Groups.prototype.invite = function(group_id, user_id){
  return this.vk.api('groups.invite', {
    group_id: group_id,
    user_id: user_id
  });
}