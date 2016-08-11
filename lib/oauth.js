var request = require('./request.js');
var cheerio = require('cheerio');
var qs = require('querystring');
var logger = require('log4js').getLogger('oauth')

logger.setLevel('ERROR')

function init(clientId, scope){
  logger.debug('oauth init');
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

  return request(ops)
  .then(function(body){
    var $ = cheerio.load(body);
    var url = $('form').attr('action');
    var form = {};

    $('form input[type=hidden]').each(function(){
      form[$(this).attr('name')] = $(this).val();
    });

    logger.debug(url, form)
    
    return {
      url: url,
      method: 'POST',
      form: form
    }
  });
}

function login(email, pass, ops){
  logger.debug('oauth login');
  ops.form.email = email;
  ops.form.pass = pass;

  return request(ops)
  .then(function(body) {
    // logger.debug(body)
    var $ = cheerio.load(body);
    var url = $('form').attr('action');
    logger.debug(url)
    return url;
  });
}

function grantAccess(url){
  logger.debug('oauth grantAccess');
  var ops = {
    url: url,
    method: 'POST',
    transform: function(body, resp){
      return resp.request.href;
    }
  }
  return request(ops)
  .then(function(href){
    var query = href.split('#')[1];
    creds = qs.parse(query);
    logger.debug(creds);
    return creds;
  });
}

function getToken(clientId, email, pass, scope){
  return init(clientId, scope)
  .then(login.bind(null, email, pass))
  .then(grantAccess);
}

module.exports = getToken

