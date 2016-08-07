var VK = require('./lib/vk.js');
var captchaSolver = require('./lib/2captcha.js');

var logger= require('log4js').getLogger()

logger.setLevel('TRACE');

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
        .then(function(resp) {
          if(resp == 1){
            logger.trace('invited', member);
          }
        })
        .catch(function(err){
          if(err.error_code == 15){
            logger.trace(err.error_msg, member);
            return;
          }
          logger.error('invite error', err);
          throw err;
        })
        .then(wait(1000))
      })
    }, Promise.resolve())
  })
}

inviteAll(vk, group_id, event_id)
.catch(console.error)
