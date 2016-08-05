var request = require('./request.js');
var cheerio = require('cheerio');
var qs = require('querystring');

function init(clientId){
  var query = {
    client_id: clientId,
    display: 'page',
    redirect_uri: 'https://oauth.vk.com/blank.html',
    scope: 'groups',
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

    return {
      url: url,
      method: 'POST',
      form: form
    }
  });
}

function login(ops, email, pass){
  ops.form.email = email;
  ops.form.pass = pass;

  return request(ops)
  .then(function(body) {
    var $ = cheerio.load(body);
    return $('form').attr('action');
  });
}

function grantAccess(url){
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
    return qs.parse(query);
  });
}

function getToken(clientId, email, pass){
  return init(clientId)
  .then(function(ops){
    return login(ops, email, pass);
  })
  .then(grantAccess)
  .catch(console.error);
}

module.exports = getToken

