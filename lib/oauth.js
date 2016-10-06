var request = require('./request.js');
var cheerio = require('cheerio');
var qs = require('querystring');
var logger = require('log4js').getLogger('oauth')

// logger.setLevel('ERROR')

function init(clientId, email, pass, scope){
  logger.debug('init');
  request.cleanCookies()
  var query = {
    client_id: clientId,
    display: 'page',
    redirect_uri: 'https://oauth.vk.com/blank.html',
    scope: scope.join(','),
    response_type: 'token',
    v: '5.53',
    revoke: 1
  };


  var ops = {
    url: 'https://oauth.vk.com/authorize?' +qs.stringify(query),
    method: 'GET'
  };

  logger.debug(ops.url)

  return request(ops)
  .then(function(body){
    return login(email, pass, body)
  })
}

function login(email, pass, body){
  logger.debug('login');
  
  var $ = cheerio.load(body);
  var url = $('form').attr('action');
  var form = {};

  $('form input[type=hidden]').each(function(){
    form[$(this).attr('name')] = $(this).val();
  });
  
  form.email = email;
  form.pass = pass;
  
  logger.debug(url, form)
  
  var ops = {
    url: url,
    method: 'POST',
    form: form,
    resolveWithFullResponse: true
  };

  return request(ops)
  .then(function(resp){
    logger.debug(resp.request.href)
    // logger.debug(resp.body)

    if(resp.request.href.match(/security_check/)){
      return securityCheck(resp, email)
    }
      
    return grantAccess(resp.body);
  });
}

function securityCheck(resp, email){
  logger.debug('securityCheck')
  var host = resp.request.uri.protocol+'//'+resp.request.uri.host;
  var $ = cheerio.load(resp.body);
  var url = $('form').attr('action');
  
  var ops = {
    url: host + url,
    method: 'POST',
    form:{
      code: email.substr(2, 8)
    },
    resolveWithFullResponse: true
  }

  logger.debug(ops.url, ops.form)

  return request(ops)
  .then(function(resp){
    logger.debug(resp.request.href)
    logger.debug(resp.body)
    return grantAccess(resp.body)
  })
}

function grantAccess(body){
  logger.debug('grantAccess');
  var $ = cheerio.load(body);
  var url = $('form').attr('action');
  var ops = {
    url: url,
    method: 'POST',
    transform: function(body, resp){
      return resp.request.uri.hash.substr(1);
    }
  }
  return request(ops)
  .then(getCreds);
}

function getCreds(hash){
  creds = qs.parse(hash);
  logger.debug(creds);
  return creds;
}

module.exports = init

