var VK =require('../lib/vk.js');
var Bot = require('../lib/bot.js')

var expect= require('expect.js')
var logger = require('log4js').getLogger()

var protoEvent = 126604963;
var testEvent = 126728658;


var kazatca_id = 3600733;


var docUrl ='https://vk.com/doc-126604963_437738617?hash=f711b606041fe13bff&dl=1470974169b2a10568b19ccda37b&api=1'

describe('bot', function() {

  var vk;
  var bot
  before(function(done){
    vk = new VK(process.env.VK_EMAIL, process.env.VK_PASS, process.env.VK_CLIENTID)
    vk.setDb(process.env.DB_URL)
    
    bot = new Bot(vk)
    bot.setDb(process.env.DB_URL)
    
    done()
  })

  it('invalid date to eventBuilder.create args', function() {
    _getProtoEvents = bot.getProtoEvents
    bot.getProtoEvents = function() {
      bot.getProtoEvents = _getProtoEvents
      return Promise.resolve([
        {id: 42, name: 'Назад в будущее'}
      ])
    }


    return bot.createEvent('Назад в будущее xxx')
    .then(function (answer) {
      expect(answer.text).to.be('приступил')
      return answer.promise.then(function(answer) {
        expect(answer.text).to.be('не получилось, ошибка: непонятная дата')
      })
    })
  })

  it('parse message to eventBuilder.create args', function() {

    var _create = bot.eventBuilder.create
    bot.eventBuilder.create = function(title, date) {
      expect(title).to.be('Назад в будущее')
      expect(date).to.be('2.01.2000')
      return Promise.resolve(43)
      bot.eventBuilder.create = _create
    }

    _getProtoEvents = bot.getProtoEvents
    bot.getProtoEvents = function() {
      bot.getProtoEvents = _getProtoEvents
      return Promise.resolve([
        {id: 42, name: 'Назад в будущее'}
      ])
    }

    return bot.createEvent('Назад в будущее 2.01.2000')
    .then(function(answer) {
      expect(answer.text).to.be('приступил')
      expect(answer.promise).to.be.a(Promise)
      return answer.promise.then(function(answer) {
        expect(answer.text).to.be('готово https://vk.com/event43')
      })
    })
  })

  it('add contact', function() {
    return bot.addContact(testEvent, {
      id: kazatca_id,
      role: 'administrator',
      phone: '+79242283113'
    })
  })

})
