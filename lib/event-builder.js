var moment = require('moment')

var extend = require('extend')
var logger = require('log4js').getLogger()

var NUM_PHOTOS = 4

moment.locale('ru')

function EventBuilder(vk){
  this.vk = vk
}

module.exports = EventBuilder;

// EventBuilder.prototype.create = function() {
//   var self = this;
//   return vk.groups.createEvent(self.config.title + ' ' + moment(self.date).format('D MMMM YYYY'))
//   .then(function(event){
//     return self.edit(event.id)
//   })
  
// };

EventBuilder.prototype.getProto = function(event_id) {
  var self = this;
  var result;
  return this.vk.api('groups.getById', {
    group_id: event_id,
    fields: [
      'place',
      'links'
    ].join(',')
  })
  .then(function(resp){
    // logger.debug(resp)
    result = resp[0];
    return self.vk.fetchAll('photos.getAlbums', {
      owner_id: event_id *-1
    })
  })
  .then(function(albums){
    result.photoAlbums = {}
    albums.forEach(function(album){
      if(['photo', 'logo'].indexOf(album.title) != -1){
        result.photoAlbums[album.title] = album.id
      }
    })
  })
  .then(function(){
    return result;
  })
};

function formatPhotoList(photos){
  return photos.map(function(photo){
    var size = Object.keys(photo).reduce(function(maxSize, key){
      var m = key.match(/^photo_(\d+)$/);
      return (m && m[1]*1 > maxSize? m[1]*1: maxSize)
    }, 0)
    var result = {
      url: photo['photo_'+size]
    }
    for(var key in photo){
      if(key.indexOf('photo_')!=0){
        result[key]=photo[key]
      }
    }
    return result;
  })

}

EventBuilder.prototype.getSettings = function(event_id) {
  return this.vk.api('groups.getSettings', {
    group_id: event_id
  })
  .then(function(resp){
    resp.event_start_date = resp.start_date
    resp.event_finish_date = resp.finish_date
    
    var keys = [
      'address',
      'subject_list',
      'start_date',
      'finish_date',
      'market'
    ];

    keys.forEach(function(key){
      delete resp[key]
    })

    return resp
  })

};

function shuffle(list){
  var result = [];

  while(list.length){
    result.push( list.splice(Math.floor(Math.random()*list.length), 1 )[0] )
  }
  return result;
}


EventBuilder.prototype.getRandomPhotos=function(album, count) {
  var self = this;

  return self.vk.fetchAll('photos.get', {
    album_id: album.id,
    owner_id: album.owner_id
  })
  .then(formatPhotoList)
  .then(function(photos){
    if(!photos.length){
      return logger.error('В альбоме '+albumTitle + ' нет фотографий')
    }

    photos = shuffle(photos)

    return photos.slice(0, Math.min(count, photos.length))
  })
}

EventBuilder.prototype.edit = function(event_id, params) {
  // var date = new Date(self.date)
  // date.setHours(12)
  // var start = Math.floor(date/1000)
  // date.setHours(18)
  // var finish = Math.floor(date/1000)

  var self = this;
  return self.vk.api('groups.getSettings', {
    group_id: event_id
  })
  .then(function(settings){
    return self.vk.groups.edit(event_id, extend(settings, params))
  })
};

EventBuilder.prototype.getEvents = function() {
  return this.vk.fetchAll('groups.get', {
    filter: 'events',
    fields: [
      'start_date',
      'status',
      'fixed_post'
    ].join(','),
    extended: 1
  })
};



EventBuilder.prototype.create = function(protoTitle, date){
  var self = this;

  var proto = null
  var event = null
  var fullTitle = protoTitle + ' ' + moment(date).format('D MMMM YYYY')

  return this.getEvents()
  .then(function(events){
    var exists = events.filter(function(event){
      return event.status!='proto' && event.name == fullTitle
    })

    if(exists.length){
      logger.info('Мероприятие с таким названием (' + fullTitle + ') уже есть')
      event = exists[0]
    }

    var protos = events.filter(function(event){
      return event.status == 'proto' && event.name == protoTitle
    })
    if(protos.length==0){
      throw 'Прототип для ' + protoTitle + ' не найден'
    }
    proto = protos[0]
  })
  .then(function(){  
    if(!event){
      return self.vk.api('groups.create', {
        title: fullTitle,
        type: 'event'
      })
      .then(function(resp){
        event = resp
      })
    }
  })
  .then(function(){
    return self.getSettings(proto.id)
  })
  .then(function(settings){

    var tmpDate = new Date(date)
    tmpDate.setHours(12)
    var start = Math.floor(tmpDate/1000)
    tmpDate.setHours(18)
    var finish = Math.floor(tmpDate/1000)

    logger.info('Изменяю настройки (дата, время и пр.)')
    return self.vk.api('groups.edit', extend(settings, {
      group_id: event.id,
      event_start_date: start,
      event_finish_date: finish,
      title: fullTitle
    }))
  })

  .then(function(){
    return self.vk.fetchAll('photos.getAlbums', {
      owner_id: proto.id *-1
    })
  })
  .then(function(result){
    var albums = {}

    result.forEach(function(album){
      albums[album.title] = album
    })

    return self.setLogo(albums.logo, event)
    .then(function(){
      return self.setPhotos(albums.photo, event)
    })
  })
  .then(function(){
    return self.setPage(proto, event)
  })
}

EventBuilder.prototype.getFixedPost = function(group) {
  var self = this; 

  if(!group.fixed_post){
    return Promise.resolve()
  }

  return self.vk.api('wall.getById', {
    posts: '-' + group.id + '_' + group.fixed_post
  })
  .then(function(resp){
    return resp[0]
  })

};

EventBuilder.prototype.getPage = function(proto) {
  var self = this;

  return self.getFixedPost(proto)
  .then(function(post){
    if(!post){
      logger.error('В прототипе нет закрепленного поста')
      return Promise.resolve()
    }

    if(!post.attachments){
      logger.error('В закрепелнном посте прототипа нет ссылок')
      return Promise.resolve()
    }

    var pages = post.attachments.filter(function(att){
      return att.type=='page'
    })
    .map(function(att){
      return att.page
    })
    
    if(!pages){
      logger.error('В закрепленном посте прототипа нет ссылки на страницу')
      return Promise.resolve()
    }

    return pages[0]
  })

};

EventBuilder.prototype.setPage = function(proto, event) {
  var self= this;

  return self.getFixedPost(event)
  .then(function(post){
    if(post){
      logger.info('В мероприятии уже есть закрепленный пост')
      return Promise.resolve();
    }

    return self.getPage(proto)
    .then(function(page){
      return self.vk.api('pages.get', {
        owner_id: page.group_id*-1,
        page_id: page.id,
        need_source: 1
      })
    })
    .then(function(page){
      return self.vk.api('pages.save', {
        group_id: event.id,
        title: page.title,
        text: page.source
      })
    })
    .then(function(pageId){
      return self.vk.api('wall.post', {
        owner_id: event.id*-1,
        from_group: 1,
        attachments: 'page' + (event.id*-1) + '_'+pageId,
        guid: new Date()*1
      })
    })
    .then(function(resp){
      return self.vk.api('wall.pin', {
        owner_id: event.id*-1,
        post_id: resp.post_id
      })
    })
  })

};

EventBuilder.prototype.setPhotos = function(fromAlbum, event) {
  var self = this;

  if(!fromAlbum){
    logger.error('В группе нет альбома photo')
    return Promise.resolve() 
  }

  return self.vk.fetchAll('photos.getAlbums', {
    owner_id: event.id * -1
  })
  .then(function(albums){
    if(albums.length != 1){
      logger.error('В группе несколько альбомов')
      return Promise.resolve()
    }
    
    var album = albums[0]
    if(album.size >= NUM_PHOTOS){
      logger.info('В альбоме уже есть фотографии')
      return Promise.resolve() 
    }

    logger.info('Загружаю фотографии (' + (NUM_PHOTOS - album.size) + ' шт)')
    return self.getRandomPhotos(fromAlbum, NUM_PHOTOS - album.size)
    .then(function(photos){
      return photos.reduce(function(promise, photo){
        return promise.then(function(){
          return self.vk.photos.uploadToGroupAlbumFromUrl(event.id, album.id, photo.url)
        })
      }, Promise.resolve())
    })
  })
  
};

EventBuilder.prototype.setLogo = function(fromAlbum, event) {
  var self = this;

  if(!fromAlbum){
    logger.error('В группе нет альбома logo')
    return Promise.resolve()
  }

  if(event.photo_50.indexOf('images/community') ==-1 ){
    logger.info('Лого уже загружено')
    return Promise.resolve() 
  }
  
  var albums = {};

  logger.info('Загружаю лого')
  return self.getRandomPhotos(fromAlbum, 1)
  .then(function(photos){
    var photo = photos[0]
    return self.vk.photos.uploadToGroupLogoFromUrl(event.id, photo.url)
  })
  // todo: remove post resp.post_id
  // .then(function(resp){
  //   return self.vk.api('')
  // })
  
}

EventBuilder.prototype.setLinks = function(proto, event) {
  var self = this;
  if(!proto.links){
    logger.error('В прототипе нет ссылок')
    return Promise.resolve()
  }
  if(event.links && event.links.length == proto.links.length){
    logger.info('Ссылки уже добавлены')
    return Promise.resolve()
  }

  return proto.links.reverse().reduce(function(promise, link){
    return promise.then(function(){
      return self.vk.api('groups.addLink', {
        group_id: event.id,
        link: link.url
      })
    })
  }, Promise.resolve())
};

