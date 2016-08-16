var VK =require('../lib/vk.js')
var expect = require('expect.js')
var logger = require('log4js').getLogger()

logger.setLevel('DEBUG')


describe('invite', function() {
  var vk

  var group_id = 44615686

  before(function(done){
    var dbUrl = process.env[process.env.DB_URL_KEY]

    vk = new VK(process.env.VK_EMAIL, process.env.VK_PASS, process.env.VK_CLIENTID);
    vk.setDb(dbUrl)
    done()
  })

  it('get members', function() {
    return vk.fetchAll('groups.getMembers', {group_id: group_id})
    .then(function(members){
      expect(members).to.be.a('array')
    })
  });
});