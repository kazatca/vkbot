var VK =require('../lib/vk.js');
var EventBuilder = require('../lib/event-builder.js')
var expect= require('expect.js')
var logger = require('log4js').getLogger()

var protoEvent = 126604963;
var testEvent = 126728658;

var docUrl ='https://vk.com/doc-126604963_437738617?hash=f711b606041fe13bff&dl=1470974169b2a10568b19ccda37b&api=1'

describe('event builder', function() {

  var vk;
  var builder
  
  before(function(done){
    vk = new VK(process.env.VK_EMAIL, process.env.VK_PASS, process.env.VK_CLIENTID)
    vk.setDb(process.env.DB_URL)
    builder = new EventBuilder(vk)
    
    done()
  })

  it('get proto', function(){
    return builder.getFullInfo(protoEvent)
    .then(function(event){
      expect(event.id).to.be(protoEvent)
      expect(event.status).to.be('proto')
      expect(event.name).to.be('Мелькомбинат 2way')
      expect(event.place).to.be.ok()
      expect(event.links).to.be.a('array')
      var keys = [
        'description',
        'access',
        'subject',
        'wall',
        'topics',
        'photos',
        'video',
        'audio',
        'docs',
        'age_limits'      
      ];
      keys.forEach(function(key){
        expect(event.settings).to.have.property(key)
      })
      expect(event.albums).to.be.a('array')
      event.albums.forEach(function(album) {
        expect(album).to.have.property('title')
        if(album.size){
          expect(album.photos).to.be.a('array')
          album.photos.forEach(function(photo) {
            expect(photo).to.have.property('url')
          })
        }
      })
      expect(event.docs).to.be.a('array')
      event.docs.forEach(function(doc) {
        expect(doc).to.have.property('title')
        expect(doc).to.have.property('url')
      })
      expect(event.page).to.be.a('object')
      expect(event.page).to.have.property('title')
      expect(event.page).to.have.property('source')
    })
  })

  it('get target', function(){
    return builder.getFullInfo(testEvent)
    .then(function(event){
      expect(event.id).to.be(testEvent)
      expect(event.name).to.be('Тестовое мероприятие')
      var keys = [
        'description',
        'access',
        'subject',
        'wall',
        'topics',
        'photos',
        'video',
        'audio',
        'docs',
        'age_limits'      
      ];
      keys.forEach(function(key){
        expect(event.settings).to.have.property(key)
      })
      expect(event.albums).to.be.a('array')
      event.albums.forEach(function(album) {
        if(album.size){
          expect(album.photos).to.be.a('array')
          album.photos.forEach(function(photo) {
            expect(photo).to.have.property('url')
          })
        }
      })
      expect(event.docs).to.be.a('array')
      event.docs.forEach(function(doc) {
        expect(doc).to.have.property('title')
        expect(doc).to.have.property('url')
      })
    })
  })

  it('create event', function() {
    return builder.create('Мелькомбинат 2way', '2.01.2000')
  })


  it('copy doc', function(){
    return vk.docs.uploadToGroup(testEvent, {
      url: docUrl,
      title: 'Тестовый документ '+ (new Date()*1) +'.doc'
    })
  })

  it('update logo', function () {
    return builder.setLogo({
      url: 'http://cs636724.vk.me/v636724930/2eccf/a5zszwky7U8.jpg',
      text: '362,74,357'
    }, testEvent)
  })


  it('get videos', function(){
    return builder.getVideos(protoEvent)
    .then(function(videos){
      expect(videos).to.be.a('array')
      videos.forEach(function(video){
        expect(video).to.have.property('title')
        expect(video).to.have.property('owner_id')
      })
    })
  })


});