var moment = require('moment')

var extend = require('extend')
var logger = require('log4js').getLogger()

var NUM_PHOTOS = 4
var NUM_VIDEOS = 4

moment.locale('ru')

function EventBuilder(vk){
  this.vk = vk
}

module.exports = EventBuilder;

EventBuilder.prototype.getEventById = function(event_id) {
  return this.vk.api('groups.getById', {
    group_id: event_id,
    fields: [
      'links',
      'place',
      'start_date',
      'finish_date',
      'status',
      'fixed_post'
    ].join(',')
  })
  .then(function(events){
    return events[0]
  })
};



EventBuilder.prototype.getSettings = function(event_id) {
  return this.vk.api('groups.getSettings', {
    group_id: event_id
  })
  .then(function(resp){
    var result = {}
    
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
      if(typeof resp[key] != 'undefined'){
        result[key] = resp[key]
      }
    })

    return result
  })

};


function shuffle(list){
  var result = [];

  while(list.length){
    result.push( list.splice(Math.floor(Math.random()*list.length), 1 )[0] )
  }
  return result;
}

function formatPhotoList(photos){
  return photos.map(function(photo){
    var maxSize = Object.keys(photo).reduce(function(maxSize, key){
      var m = key.match(/^photo_(\d+)$/);
      return (m && m[1]*1 > maxSize? m[1]*1: maxSize)
    }, 0)
    var result = {
      url: photo['photo_'+maxSize]
    }
    for(var key in photo){
      if(key.indexOf('photo_')!=0){
        result[key]=photo[key]
      }
    }
    return result;
  })

}


EventBuilder.prototype.getRandomPhotos=function(albums, albumTitle, count) {
  var self = this;

  var albums = albums.filter(function(album) {
    return album.title == albumTitle
  })

  if(!albums.length){
    return {error: 'not exists'}
  }
  if(!albums[0].photos.length){
    return {error: 'empty'}
  }

  var photos = shuffle(albums[0].photos)

  return photos.slice(0, Math.min(count, photos.length))
}

EventBuilder.prototype.getRandomVideos=function(videos, count) {
  var videos = shuffle(videos)
  return videos.slice(0, Math.min(count, videos.length))
}


EventBuilder.prototype.getPhotos = function(event_id, album_id) {
  return this.vk.fetchAll('photos.get', {
    album_id: album_id,
    owner_id: event_id * -1
  })
  .then(formatPhotoList)
};


EventBuilder.prototype.getEvents = function() {
  return this.vk.fetchAll('groups.get', {
    filter: 'events',
    fields: [
      'status'
    ].join(','),
    'extended': 1
  })
};

EventBuilder.prototype.getAlbums = function(event_id) {
  var self = this;
  return self.vk.fetchAll('photos.getAlbums', {
    owner_id: event_id *-1
  }) 
 .catch(function(err) {
    if(err.error_code == 15 && err.error_msg.indexOf('is disabled') >= 0){
      logger.info('Фотографии не доступны')
      return []
    }
    throw err
  })

};





EventBuilder.prototype.getFixedPost = function(event) {
  var self = this; 

  if(!event.fixed_post){
    return Promise.resolve()
  }

  return self.vk.api('wall.getById', {
    posts: '-' + event.id + '_' + event.fixed_post
  })
  .then(function(resp){
    return resp[0]
  })

};

EventBuilder.prototype.getPage = function(event) {
  var self = this;

  return self.getFixedPost(event)
  .then(function(post){
    if(!post){
      logger.info('Нет закрепленного поста')
      return Promise.resolve()
    }

    if(!post.attachments){
      logger.info('В закрепелнном посте нет ссылок')
      return Promise.resolve()
    }

    var pages = post.attachments.filter(function(att){
      return att.type=='page'
    })
    .map(function(att){
      return att.page
    })
    
    if(!pages){
      logger.info('В закрепленном посте нет ссылки на страницу')
      return Promise.resolve()
    }

    return pages[0]
  })
  .then(function(page){
    if(!page){
      return
    }
    return self.vk.api('pages.get', {
      owner_id: event.id*-1,
      page_id: page.id,
      need_source: 1
    })
  })


};

EventBuilder.prototype.getDocs = function(event_id) {
  return this.vk.fetchAll('docs.get', {
    owner_id: event_id * -1
  })
  .catch(function(err) {
    if(err.error_code == 15 && err.error_msg.indexOf('is disabled') >= 0){
      logger.info('Документы не доступны')
      return []
    }
    throw err
  })
};


EventBuilder.prototype.getVideos = function(event_id) {
  return this.vk.fetchAll('video.get', {
    owner_id: event_id*-1
  }, 200)
  .catch(function(err) {
    if(err.error_code == 15 && err.error_msg.indexOf('is disabled') >= 0){
      logger.info('Видео не доступны')
      return []
    }
    throw err
  })
};

EventBuilder.prototype.getFullInfo = function(event_id) {
  var self = this;
  var result = {}
  return this.getEventById(event_id)
  .then(function(resp){
    result = resp
  })
  .then(function(){
    return self.getSettings(event_id)
    .then(function(settings){
      result.settings = settings
    })
  })
  .then(function(){
    return self.getAlbums(event_id)
    .then(function(albums){
      return albums.reduce(function(promise, album){
        return promise.then(function(){
          if(!album.size){
            return
          }

          return self.getPhotos(event_id, album.id)
          .then(function(photos){
            album.photos = photos
          })
        })
      }, Promise.resolve())
      .then(function(){
        result.albums = albums
      })
    })
  })
  .then(function () {
    return self.getDocs(event_id)
    .then(function(docs) {
      result.docs = docs
    })
  })
  .then(function() {
    return self.getPage(result)
    .then(function(page) {
      result.page = page
    })
  })
  .then(function(){
    return self.getVideos(event_id)
    .then(function(videos){
      result.videos = videos
    })
  })
  .then(function(){
    return result
  })
};


EventBuilder.prototype.setSettings = function(settings, target_id, replace) {
  var self = this;
  logger.info('Изменяю настройки (дата, время и пр.)')

  return self.vk.api('groups.edit', extend({}, settings, replace, {
    group_id: target_id
  }))
};


EventBuilder.prototype.setPage = function(page, event_id) {
  var self= this;
  logger.info('Добавляю страницу с описанием')
  return self.vk.api('pages.save', {
    group_id: event_id,
    title: page.title,
    text: page.source
  })
  .then(function(pageId){
    logger.info(' публикую')
    return self.vk.api('wall.post', {
      owner_id: event_id*-1,
      from_group: 1,
      attachments: 'page' + (event_id*-1) + '_'+pageId,
      guid: new Date()*1
    })
  })
  .then(function(post){
    logger.info(' закрепляю')
    return self.vk.api('wall.pin', {
      owner_id: event_id*-1,
      post_id: post.post_id
    })
  })
};

EventBuilder.prototype.setPhotos = function(photos, target_id, album_id) {
  var self = this;

  logger.info('Загружаю фотографии (' + photos.length + ' шт)')
  return photos.reduce(function(promise, photo){
    return promise.then(function(){
      return self.vk.photos.uploadToGroupAlbumFromUrl(target_id, album_id, photo.url)
    })
  }, Promise.resolve())
  
};

EventBuilder.prototype.setLogo = function(photo, target_id) {
  var self = this;

  logger.info('Загружаю лого')

  var crop
  if(photo.text && photo.text.match(/\d+,\d+,\d+/)){
    crop = photo.text
  }
  return this.vk.photos.uploadToGroupLogoFromUrl(target_id, photo.url, crop)
  
}


EventBuilder.prototype.setLinks = function(links, target_id) {
  var self = this;

  logger.info('Добавляю ссылки')
  return links.reverse().reduce(function(promise, link){
    return promise.then(function(){
      return self.vk.api('groups.addLink', {
        group_id: target_id,
        link: link.url
      })
    })
  }, Promise.resolve())
};

EventBuilder.prototype.setDocs = function(docs, target_id) {
  var self = this;

  return docs.reduce(function(promise, doc) {
    return promise.then(function() {
      return self.vk.docs.uploadToGroup(target_id, doc)
    })
  }, Promise.resolve())
};

EventBuilder.prototype.setVideos = function(videos, target_id) {
  var self = this;
  logger.info('Добавляю видео')
  return videos.reduce(function(promise, video){
    return promise.then(function(){
      return self.vk.api('video.add', {
        target_id: target_id*-1,
        video_id: video.id,
        owner_id: video.owner_id
      })
    })
  }, Promise.resolve())
};

EventBuilder.prototype.create = function(title, date) {
  var self = this;
  date = moment(date, 'D.M.Y')
  var fullTitle = title + ' ' + date.format('DD MMMM YYYY')

  var proto = null
  var target = null

  return self.getEvents()
  .then(function(events){
    var exists = events.filter(function(event){
      return event.status!='proto' && event.name == fullTitle
    })

    if(exists.length){
      logger.info('Мероприятие с таким названием (' + fullTitle + ') уже есть')
      target = exists[0]
    }

    var protos = events.filter(function(event){
      return event.status == 'proto' && event.name == title
    })
    if(protos.length==0){
      throw 'Прототип для ' + protoTitle + ' не найден'
    }
    proto = protos[0]      
  })
  .then(function() {
    if(!target){
      logger.info('Создаю мероприятие')
      return self.vk.api('groups.create', {
        title: fullTitle,
        type: 'event'
      })
      .then(function(resp) {
        target = resp
      })
    }
  })
  .then(function() {
    return self.getFullInfo(proto.id)
    .then(function(result) {
      proto = result
    })
  })
  .then(function() {
    return self.getFullInfo(target.id)
    .then(function(result) {
      target = result
    })
  })
  .then(function() {
    var start = moment(date).hour(12)
    var finish = moment(date).hour(18)
  
    return self.setSettings(proto.settings, target.id, {
      event_start_date: start.format('X'),
      event_finish_date: finish.format('X'),
      title: fullTitle
    })
  })
  .then(function() {
    if(!proto.links){
      logger.error('В прототипе нет ссылок')
      return 
    }

    if(target.links && target.links.length == proto.links.length){
      logger.info('Ссылки уже добавлены')
      return 
    }
    return self.setLinks(proto.links, target.id)
  })
  .then(function() {
    if(target.photo_50.indexOf('images/community') == -1 ){
      logger.info('Лого уже загружено')
      return
    }

    var logos = self.getRandomPhotos(proto.albums, 'logo', 1)
    if(logos.error){
      if(logos.error == 'not exists'){
        logger.info('В прототипе нет альбома logo')
      }
      if(logos.error == 'empty'){
        logger.info('В прототипе альбом logo пустой')
      }
      return
    }

    return self.setLogo(logos[0], target.id)
    // todo: remove post resp.post_id
    // .then(function(resp){
    //   return self.vk.api('')
    // })
  })
  .then(function() {
    if(target.albums.length > 1){
      logger.error('В мероприятии несколько альбомов')
      return
    }

    var targetAlbum = target.albums[0]
    if(targetAlbum.size >= NUM_PHOTOS){
      logger.info('Фотографии уже загруженны')
      return
    }

    var photos = self.getRandomPhotos(proto.albums, 'photo', NUM_PHOTOS - targetAlbum.size)
    
    if(photos.error){
      if (photos.error == 'not exists'){
        logger.info('В прототипе нет альбома photo')
      }
      if (photos.error == 'empty'){
        logger.info('В прототипе альбом photo пустой')
      }
      return
    }

    return self.setPhotos(photos, target.id, targetAlbum.id)
  })
  .then(function() {
    if(!proto.page){
      logger.info('В прототипе нет страницы с описанием')
      return 
    }

    if(target.page){
      logger.info('Страница с описанием уже добавлена')
      return
    }

    return self.setPage(proto.page, target.id)
  })
  .then(function() {
    if(!proto.docs){
      logger.info('В прототипе нет документов')
      return
    }
    if(target.docs && target.docs.length == proto.docs.length){
      logger.info('Документы уже загружены')
      return
    }

    return self.setDocs(proto.docs, target.id)
  })
  .then(function(){
    if(!proto.videos){
      logger.info('В прототипе нет видео')
      return
    }

    var count = NUM_VIDEOS
    if(target.videos){
      if(target.videos.length >= NUM_VIDEOS){
        logger.info('Видео уже добавлены')
        return
      }
      count-= target.videos.length
    }

    var videos = self.getRandomVideos(proto.videos, count)
    return self.setVideos(videos, target.id)

  })

};