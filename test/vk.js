var VK = require('../lib/vk.js');

var fs = require('fs');
var expect = require('expect.js');
var logger = require('log4js').getLogger()
logger.setLevel('TRACE');


var kazatca_id = 3600733;

var testEvent = 126604963
var testPage = 126604941


var albumId = 234761246
var realEvent = 126196049


describe('vk', function() {
  var vk;
  before(function(done){
    vk = new VK(process.env.VK_EMAIL, process.env.VK_PASS, process.env.VK_CLIENTID)
    vk.setDb(process.env.DB_URL)
    done();
  })

  it('get self', function(){
    return vk.api('users.get')
    .then(function(resp){
      expect(resp).to.be.an('array');
      expect(resp.length).to.eql(1);
      expect(resp[0].id).to.eql(377582930);
    });
  })

  it('get info', function(){
    return vk.groups.getById(44615686, ['members_count'])
    .then(function(resp){
      expect(resp).to.be.a('array');
      expect(resp[0]).to.have.property('members_count');
    })
  })

  it('get members', function(){
    return vk.groups.getMembers(44615686)
    .then(function(members){
      expect(members).to.be.a('array');
      // console.log(members.length)
    })
  })

  it('get invited users', function(){
    return vk.groups.getInvitedUsers(126196049)
    .then(function(users){
      expect(users).to.be.a('array');
    })
  })

  it('get messages', function(){
    return vk.messages.getHistory(kazatca_id)
    .then(function(messages){
      expect(messages).to.be.a('array')
      // console.log(messages);
    })
  })

  // it('get events', function(){
  //   return vk.groups.getFutureEvents(kazatca_id)
  //   .then(function(events){
  //     console.log(events);
  //   })
  // })

  it('set event params', function(){
    var date = new Date();
    date.setFullYear(2017)
    date.setMonth(0)
    date.setDate(1)
    date.setHours(12)
    date.setMinutes(0)
    date.setSeconds(0)
    var start = Math.floor(date/1000)
    date.setHours(18)
    var finish = Math.floor(date/1000)
    return vk.groups.edit(testEvent, {
      event_start_date: start,
      event_finish_date: finish,
      event_group_id: testPage
    })
    .then(function(answer){
      expect(answer).to.be(1)
    })
  })

  it('upload event logo', function(){
    return vk.photos.uploadToGroupLogo(testEvent, './res/logo.jpg', {
      x: 285,
      y: 102,
      w: 728
    })
    .then(function(resp){
      expect(resp).to.have.property('photo_hash')
      expect(resp).to.have.property('photo_src')
      expect(resp.saved).to.be(1)
    })
  })


  it('get photos from album by tag', function(){
    var tag = 'Мелькомбинат2way'
    return vk.photos.getByTag(albumId, tag)
    .then(function(resp) {
      expect(resp).to.be.a('array')
      resp.forEach(function(photo){
        expect(photo).have.property('url')
        expect(photo.text).to.contain(tag)
      })
    })
  })

  it('get album by title', function(){
    return vk.photos.getAlbumByTitle('Мелькомбинат2way.logo')
    .then(function(id){
      expect(id).to.be.ok()
    })
  })

  it('update event logo [x]', function(){
    return vk.photos.updateEventLogo(testEvent, 'Мелькомбинат2way')
    .then(function(resp){
      expect(resp).to.have.property('photo_hash')
      expect(resp).to.have.property('photo_src')
      expect(resp.saved).to.be(1)
    })
  })

  it('get page', function(){
    return vk.api('pages.get', {
      owner_id: realEvent*-1, 
      page_id: 52147814,
      need_source: 1
    })
    .then(function(resp) {
      console.log(resp);
    })
  })

  xit('create page', function(){
    var text = fs.readFileSync('./res/page.txt', 'utf-8')

    return vk.pages.create(testEvent, 'Подробности', text)
    .then(console.log)
  })


})
