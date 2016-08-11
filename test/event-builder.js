var VK =require('../lib/vk.js');
var EventBuilder = require('../lib/event-builder.js')
var expect= require('expect.js')
var logger = require('log4js').getLogger()


var protoEvent = 126604963;
var testEvent = 126685328;

var logoAlbum = 235566068;
var photoAlbum = 235566121;

function getGroup(vk, id){
  return vk.api('groups.getById', {
    group_id: id,
    fields: [
      'links',
      'status',
      'fixed_post'
    ].join(',')
  })
}

describe('event builder', function() {

  var vk;
  var builder
  before(function(){
    vk = new VK(process.env.VK_EMAIL, process.env.VK_PASS, process.env.VK_CLIENTID)
    vk.setDb(process.env.DB_URL)
    builder = new EventBuilder(vk)
    
    return getGroup(vk, testEvent)
    .then(function(events){
      testEvent = events[0]
    })
    .then(function(){
      return getGroup(vk, protoEvent)
    })
    .then(function(events){
      protoEvent = events[0]
    })

  })

  it('get proto', function() {
    return builder.getProto(protoEvent.id)
    .then(function(resp){
      expect(resp.name).to.be('Мелькомбинат 2way')
      expect(resp.links).to.be.a('array')
      expect(resp.photoAlbums).to.have.property('photo')
      expect(resp.photoAlbums).to.have.property('logo')
    })
  });

  it('get random photo', function() {
    return builder.getRandomPhoto(protoEvent.id, 'logo')
    .then(function(resp){
      expect(resp).to.have.property('url')
    })
  });

  it('get events', function() {
    return builder.getEvents()
    .then(function(events){
      events.forEach(function(event){
        expect(event).to.have.property('start_date')
      })
    })
  });

  it('get settings', function(){
    return builder.getSettings(protoEvent.id)
    .then(console.log)
  })

  it('create event', function(){
    return builder.create('Мелькомбинат 2way', new Date('2017-01-01'))
    .then(console.log)
  })

  it('set photos', function(){
    return builder.setPhotos({id: photoAlbum, owner_id: protoEvent.id * -1}, {id: testEvent})
  })

  it('set logo', function(){
    return vk.api('groups.getById', {group_id: testEvent})
    .then(function(events){
      return builder.setLogo({id: logoAlbum, owner_id: protoEvent.id * -1}, events[0])
    })
  })

  it('set page', function(){
    return builder.setPage(protoEvent, testEvent)

  })

  it('set links', function(){
    return builder.setLinks(protoEvent, testEvent)
  })

});