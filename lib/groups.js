var extend = require('extend')


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


// Groups.prototype.getFutureEvents = function(user_id){
//   return this.vk.fetchAll('groups.get', {
//     user_id: user_id,
//     extended: 1,
//     fields: 'start_date',
//     filter: 'events'
//   })
// }



Groups.prototype.getInvitedUsers = function(group_id) {
  var self = this;
  var count = 100;
  return this.vk.api('groups.getInvitedUsers', {
    group_id: group_id,
    count: count
  })
  .then(function(resp){
    if(resp.items.length< resp.count){
      var result = resp.items;
      var promise = Promise.resolve();
      for(var offset = count; offset<resp.count; offset+=count){
        promise = promise.then(function(offset){
          return self.vk.api('groups.getInvitedUsers', {
            group_id: group_id,
            offset: offset,
            count: count
          })
          .then(function(resp){
            result = result.concat(resp.items);
          })
        }.bind(null, offset))
      }
      return promise
      .then(function(){
        return result;
      });
    }
    return resp.items;
  });
};

Groups.prototype.invite = function(group_id, user_id){
  return this.vk.api('groups.invite', {
    group_id: group_id,
    user_id: user_id
  });
}

Groups.prototype.createEvent = function(title) {
  return this.vk.api('groups.create', {
    type: 'event',
    title: title
  })
};

Groups.prototype.edit = function(group_id, params) {
  return this.vk.api('groups.edit', extend({
    group_id: group_id
  }, params))
};