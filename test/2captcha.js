var cap = require('../lib/2captcha.js');
var expect = require('expect.js');

describe('2captcha', function() {
  before(function(done){
    cap.init(process.env.CAPTCHA_SOLVER_TOKEN)
    done()
  })

  it('get balance', function(){
    return cap.getBalance()
    .then(function(balance){
      // console.log(balance);
      expect(balance).to.be.ok()
    })
  })
})