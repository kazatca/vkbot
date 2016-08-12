var request = require('./request.js')
var fs = require('fs')
var logger = require('log4js').getLogger()

function Docs(vk) {
  this.vk = vk
}

module.exports = Docs


Docs.prototype.uploadToGroup = function(group_id, doc) {
  var self = this;

  if(!doc.url && !doc.path){
    throw 'need url or path'
  }

  return this.vk.api('docs.getUploadServer', {group_id: group_id})
  .then(function(resp){
    var formData = {}
    if(doc.url){
      formData = {
        file: {
          value: request.pipe({url: doc.url}),
          options: {
            filename: doc.title
          }
        }
      }
    }
    if(doc.path){
      formData = {
        file: fs.createReadStream(doc.path)
      }
    }
    return request({
      url: resp.upload_url,
      method: 'POST',
      formData: formData,
      timeout: 120000,
      transform: function(resp){
        return JSON.parse(resp)
      }
    })
  })
  .then(function(resp){
    logger.debug(resp);
    if(!resp.file){
      logger.error('Не удалось загрузить файл')
      return
    }
    return self.vk.api('docs.save', {
      file: resp.file,
      title: doc.title
    })
  })
};



Docs.prototype.download = function(url, filename) {
  var self  = this;
  var defer = Promise.defer()


  request.pipe({url: url})
  .on('response', function(response) {
    console.log(response.statusCode) // 200
    console.log(response.headers['content-type']) // 'image/png'
  })
  .on('error', console.error)
  .on('end', defer.resolve)
  .pipe(fs.createWriteStream(filename))

  return defer.promise
};