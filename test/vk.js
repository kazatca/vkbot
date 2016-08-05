var VK = require('../lib/vk.js');
var expect = require('expect.js');

describe('vk', function() {
  var vk;
  it('create app', function(done){
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
})