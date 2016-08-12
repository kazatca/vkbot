var logger = require('log4js').getLogger()
var mongo = require('mongodb').MongoClient
var VK = require('./lib/vk.js');
var Bot = require('./lib/bot.js')
var captchaSolver = require('./lib/2captcha.js');


var vk = new VK(process.env.VK_EMAIL, process.env.VK_PASS, process.env.VK_CLIENTID);
vk.setDb(process.env.DB_URL)
captchaSolver.init(process.env.CAPTCHA_SOLVER_TOKEN)
vk.setCaptchaSolver(captchaSolver);

var bot = new Bot(vk)
bot.setDb(process.env.DB_URL)

var master = 3600733

function getLastMessage(){
  return vk.api('messages.getHistory', {user_id:master, count:1})
  .then(function(messages){
    return messages.items[0]
  })
}

function wait(delay){
  defer = Promise.defer();
  setTimeout(defer.resolve, delay)
  return defer.promise;
}



function send(answer) {
  if(answer){ 
    if(answer.promise){
      answer.promise.then(send)
    }
    if(!answer.text && !answer.attachments){
      return
    }

    return vk.api('messages.send', {
      user_id: master,
      message: answer.text,
      random_id: new Date()*1
    })
  }
  
}


function loop(){
  return wait(5000)
  .then(getLastMessage)
  .then(function(message){
    if(message.from_id == master){
      return Promise.resolve(bot.handleMessage(message.body))
      .then(send)
    }
  })
  .then(loop)

  .catch(function(err){
    vk.done()
    logger.error(err);
  })
}

loop();

