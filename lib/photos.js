var logger = require('log4js').getLogger()

var request = require('./request.js');
var fs = require('fs');

function Photos(vk) {
  this.vk = vk
}

module.exports = Photos;

Photos.prototype.uploadToGroupLogo = function(group_id, filename, crop) {
  var self = this;
  return this.vk.api('photos.getOwnerPhotoUploadServer', {owner_id: group_id*-1})
  .then(function(resp){
    var formData = {
      photo: fs.createReadStream(filename)
    }
    if(crop){
      formData._square_crop = [crop.x, crop.y, crop.w].join(',')
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
    return self.vk.api('photos.saveOwnerPhoto', {
      server: resp.server,
      photo: resp.photo,
      hash: resp.hash
    })
  })
};

Photos.prototype.uploadToGroupLogoFromUrl = function(group_id, url, crop) {
  var self = this;
  return this.vk.api('photos.getOwnerPhotoUploadServer', {owner_id: group_id*-1})
  .then(function(resp){
    var formData = {
      photo: request.pipe({url: url})
    }
    if(crop){
      formData._square_crop = [crop.x, crop.y, crop.w].join(',')
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
    return self.vk.api('photos.saveOwnerPhoto', {
      server: resp.server,
      photo: resp.photo,
      hash: resp.hash
    })
  })
};


Photos.prototype.uploadToGroupAlbumFromUrl = function(group_id, album_id, url) {
  var self = this;
  return this.vk.api('photos.getUploadServer', {
    group_id: group_id,
    album_id: album_id
  })
  .then(function(resp){
    var formData = {
      file1: request.pipe({url: url})
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
    return self.vk.api('photos.save', {
      server: resp.server,
      photos_list: resp.photos_list,
      album_id: album_id,
      group_id: group_id,
      hash: resp.hash
    })
  })
};



Photos.prototype.getByTag = function(album_id, tag) {
  return this.vk.fetchAll('photos.get', {
    album_id: album_id
  })
  .then(function(photos){
    return photos.map(function(photo){
      var size = Object.keys(photo).reduce(function(maxSize, key){
        var m = key.match(/^photo_(\d+)$/);
        return (m && m[1]*1 > maxSize? m[1]*1: maxSize)
      }, 0)
      return {url: photo['photo_'+size], text: photo.text}
    })
  })
  .then(function(photos){
    if(!tag){
      return photos
    }

    return photos.filter(function(photo){
      return photo.text.split(' ').filter(function(str){
        return str == tag
      }).length>0
    })
  })
};


Photos.prototype.getAlbumByTitle = function(title) {
  return this.vk.fetchAll('photos.getAlbums')
  .then(function(albums){
    var album = albums.filter(function(album){
      return album.title == title
    })[0];
    if(album){
      return album.id
    }
  })
};

Photos.prototype.getRandomPhotoFromAlbum = function(album_id) {
  return this.vk.fetchAll('photos.get', {
    album_id: album_id
  })
  .then(function(photos){
    return photos.map(function(photo){
      var size = Object.keys(photo).reduce(function(maxSize, key){
        var m = key.match(/^photo_(\d+)$/);
        return (m && m[1]*1 > maxSize? m[1]*1: maxSize)
      }, 0)
      return {url: photo['photo_'+size], text: photo.text}
    })
  })
  .then(function(photos){
    // logger.debug(photos)
    return photos[Math.floor((Math.random()*photos.length) % photos.length)]
  })
};

Photos.prototype.updateEventLogo = function(event_id, albumTitle) {
  var self = this;
  return this.getAlbumByTitle(albumTitle+'.logo')
  .then(function(album_id){
    if(!album_id){
      throw 'Album not exists'
    }
    return self.getRandomPhotoFromAlbum(album_id)
  })
  .then(function(photo){
    return self.uploadToGroupLogoFromUrl(event_id, photo.url)
  })
};