var logger = require('log4js').getLogger()
var mongo = require('mongodb').MongoClient
var VK = require('./lib/vk.js');
var Bot = require('./lib/bot.js')
var captchaSolver = require('./lib/2captcha.js');


var dbUrl = process.env[process.env.DB_URL_KEY]

var vk = new VK(process.env.VK_EMAIL, process.env.VK_PASS, process.env.VK_CLIENTID);
vk.setDb(dbUrl)
captchaSolver.init(process.env.CAPTCHA_SOLVER_TOKEN)
vk.setCaptchaSolver(captchaSolver);

var bot = new Bot(vk)
bot.setDb(dbUrl)

var master = 3600733

var droprope_kms = 44615686
var event = 126196049

bot.getInviteList(droprope_kms, event)
.then(function(users) {
  logger.debug(users)
  return bot.invite(event, users)
})
.catch(function(err) {
  logger.error(err)
  vk.done()
  bot.done()
})
