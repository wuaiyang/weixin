'use strict'

var Promise = require('bluebird');
var _ = require('lodash');
var request = Promise.promisify(require('request'));
var utill = require('./utill');
var fs = require('fs');
var prefix = 'https://api.weixin.qq.com/cgi-bin/';
var api = {
    accessToken: prefix + 'token?grant_type=client_credential',
    temporary: {
        upload: prefix + 'media/upload?',
        get: prefix +'media/get?'
    },
    permanent: {
        upload: prefix + 'material/add_material?',
        get: prefix +'material/get_material?',
        delete: prefix + 'material/del_material?',
        update: prefix + 'material/update_news?',
        uploadNews: prefix + 'material/add_news?',
        uploadNewsPic: prefix + 'media/uploadimg?',
        count: prefix + 'material/get_materialcount?',
        batch: prefix + 'material/batchget_material?'
    },
    group: {
        create: prefix + 'tags/create?',
        get: prefix + 'tags/get?',
        update: prefix + 'tags/update?',
        delete: prefix + 'tags/delete?',
        gettag: prefix + 'user/tag/get?',
        batchadd: prefix + 'tags/members/batchtagging?',

    }
};

// 票据的读取
function Wechat(opts) {
    var that = this;
    this.appID = opts.appID;
    this.appSecret = opts.appSecret;
    this.getAccessToken = opts.getAccessToken;
    this.saveAccessToken = opts.saveAccessToken;

    this.fetchAccessToken()
}

Wechat.prototype.isValidAccessToken = function (data) {
    if (!data || !data.access_token || !data.expires_in) {
        return false;
    }

    var expires_in = data.expires_in;
    var now = (new Date().getTime());

    if (now < expires_in) {
        return true;
    } else {
        return false;
    }
};

Wechat.prototype.updateAccessToken = function () {
    var appID = this.appID;
    var appSecret = this.appSecret;
    var url = api.accessToken + '&appid=' + appID + '&secret=' + appSecret;


    return new Promise(function (resolve, reject) {
        request({url: url, json: true}).then(function (response) {
            var data = response.body;
            var now = (new Date().getTime());
            var expires_in = now + (data.expires_in - 20) * 1000;
            data.expires_in = expires_in;
            resolve(data);
        })
    })
};
Wechat.prototype.fetchAccessToken = function () {
    var that = this;

    if (this.access_token && this.expires_in) {
        if (this.isValidAccessToken(this)) {
            return Promise.resolve(this)
        }
    }

    this.getAccessToken()
        .then(function (data) {

            try {
                data = JSON.parse(data)
            }
            catch (e) {
                return that.updateAccessToken()
            }

            if (that.isValidAccessToken(data)) {

                return Promise.resolve(data)
            } else {
                return that.updateAccessToken()
            }
        })
        .then(function (data) {

            that.access_token = data.access_token;
            that.expires_in = data.expires_in;

            that.saveAccessToken(data);

            return Promise.resolve(data);
        })
};

Wechat.prototype.uploadMaterial = function (type, material, permanent) {
    var that = this;
    var form = {};
    var uploadUrl = api.temporary.upload;
    if (permanent) {
        uploadUrl = api.permanent.upload;
        _.extend(form, permanent)
    }
    if (type === 'pic') {
        uploadUrl = api.permanent.uploadNewsPic;
    }
    if (type === 'news') {
        uploadUrl = api.permanent.uploadNews;
        form = material
    } else {
        form.media = fs.createReadStream(material)
    }

    return new Promise(function (resolve, reject) {
        that.fetchAccessToken()
            .then(function (data) {
                var url = uploadUrl + 'access_token=' + data.access_token;

                if(!permanent) {
                    url += '&type=' + type
                }else {
                    form.access_token = data.access_token
                }

                var options = {
                    method: 'POST',
                    url: url,
                    json: true
                };

                if(type === 'news') {
                    options.body = form
                } else {
                    options.formData = form
                }

                console.log(options);

                request(options).then(function (response) {
                    var _data = response.body;
                    console.log(_data);

                    if (_data) {
                        resolve(_data);
                    } else {
                        throw new Error('Upload material fails')
                    }
                }).catch(function (err) {
                    reject(err)
                })
            });
    })
};

Wechat.prototype.getMaterial = function (mediaId, type, permanent) {
    var that = this;
    var getUrl = api.temporary.get;

    if (permanent) {
        getUrl = api.permanent.get;
    }



    return new Promise(function (resolve, reject) {
        that.fetchAccessToken()
            .then(function (data) {
                var url = getUrl + 'access_token=' + data.access_token +
                    '&media_id=' + mediaId;


                var form = {};

                var options = {
                    method: 'POST',
                    url: url,
                    json: true
                };

                if (permanent) {
                    form.media_id = mediaId;
                    form.access_token = data.access_token;
                    options.body = form;
                }else {
                    if (type === 'video'){
                        url = url.replace('https://', 'http://')
                    }
                    url += '&media_id=' + mediaId
                }

                if( type === 'news' || type === 'video'){
                    console.log(options);
                    request(options).then(function (response) {
                        var _data = response.body;
                        console.log(_data);

                        if (_data) {
                            resolve(_data);
                        } else {
                            throw new Error('delet material fails')
                        }
                    }).catch(function (err) {
                        reject(err)
                    })
                } else {
                    resolve(url);
                }
            });
    })
};

Wechat.prototype.deletMaterial = function (mediaId) {
    var that = this;
    var form = {
        media_id: mediaId,
    };

    return new Promise(function (resolve, reject) {
        that.fetchAccessToken()
            .then(function (data) {
                var url = api.permanent.delete + 'access_token=' + data.access_token +
                    '&media_id=' + mediaId;

                request({method: 'POST', url: url, body: form, json: true}).then(function (response) {
                    var _data = response.body;

                    if (_data) {
                        resolve(_data);
                    } else {
                        throw new Error('delet material fails')
                    }
                }).catch(function (err) {
                    reject(err)
                })
            });
    })
};

Wechat.prototype.updateMaterial = function (mediaId, news) {
    var that = this;
    var form = {
        media_id: mediaId,
    };

    _.extend(form, news);

    return new Promise(function (resolve, reject) {
        that.fetchAccessToken()
            .then(function (data) {
                var url = api.permanent.update + 'access_token=' + data.access_token +
                    '&media_id=' + mediaId;

                request({method: 'POST', url: url, body: form, json: true}).then(function (response) {
                    var _data = response.body;

                    if (_data) {
                        resolve(_data);
                    } else {
                        throw new Error('delet material fails')
                    }
                }).catch(function (err) {
                    reject(err)
                })
            });
    })
};

Wechat.prototype.countMaterial = function (mediaId, news) {
    var that = this;

    return new Promise(function (resolve, reject) {
        that.fetchAccessToken()
            .then(function (data) {
                var url = api.permanent.count + 'access_token=' + data.access_token

                request({method: 'GET', url: url, json: true}).then(function (response) {
                    var _data = response.body;

                    if (_data) {
                        resolve(_data);
                    } else {
                        throw new Error('delet material fails')
                    }
                }).catch(function (err) {
                    reject(err)
                })
            });
    })
};

Wechat.prototype.batchMaterial = function (options) {
    var that = this;

    options.type = options.type || 'image';
    options.offset = options.offset || 0;
    options.count = options.count || 1;

    return new Promise(function (resolve, reject) {
        that.fetchAccessToken()
            .then(function (data) {
                var url = api.permanent.batch + 'access_token=' + data.access_token

                request({method: 'POST', url: url, body: options, json: true}).then(function (response) {
                    var _data = response.body;

                    if (_data) {
                        resolve(_data);
                    } else {
                        throw new Error('delet material fails')
                    }
                }).catch(function (err) {
                    reject(err)
                })
            });
    })
};

Wechat.prototype.reply = function () {
    var content = this.body;
    var message = this.weixin;

    var xml = utill.tpl(content, message);

    this.status = 200;
    this.type = 'application/xml';
    this.body = xml;

    console.log(this.body);
};

module.exports = Wechat;
