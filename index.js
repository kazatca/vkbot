var VK = require('./lib/vk.js');
var captchaSolver = require('./lib/2captcha.js');



var vk = new VK(process.env.VK_EMAIL, process.env.VK_PASS, process.env.VK_CLIENTID)
vk.setDb(process.env.DB_URL);
captchaSolver.init(process.env.CAPTCHA_SOLVER_TOKEN)
vk.setCaptchaSolver(captchaSolver);


function wait(delay){
  var defer = Promise.defer()
  
  setTimeout(function () {
    defer.resolve()
  }, delay)

  return defer.promise
}

var group_id = 44615686;
var event_id = 126196049;

function inviteAll(vk, fromGroup, toEvent){
  return vk.groups.getMembers(fromGroup)
  .then(function(members){
    return members.reduce(function(promise, member){
      return promise.then(function(){
        return vk.groups.invite(toEvent, member)
        .catch(function(err){
          console.error(err);
        })
        .then(console.log)
        .then(wait(1000))
      })
    }, Promise.resolve())
  })
}

inviteAll(vk, group_id, event_id)
.catch(console.error)
