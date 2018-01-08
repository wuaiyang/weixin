'use strict'

var Promise = require('bluebird');
var _ = require('lodash');
var request = Promise.promisify(require('request'));
var utill = require('./utill');
var fs = require('fs');
var prefix = 'https://api.weixin.qq.com/cgi-bin/';
var mpprefix = 'https://mp.weixin.qq.com/cgi-bin/';
var semantic = 'https://api.weixin.qq.com/semantic/semproxy/search?';
var api = {
    semantic: semantic,
    accessToken: prefix + 'token?grant_type=client_credential',
    temporary: {
        upload: prefix + 'media/upload?',
        get: prefix + 'media/get?'
    },
    permanent: {
        upload: prefix + 'material/add_material?',
        get: prefix + 'material/get_material?',
        delete: prefix + 'material/del_material?',
        update: prefix + 'material/update_news?',
        uploadNews: prefix + 'material/add_news?',
        uploadNewsPic: prefix + 'media/uploadimg?',
        count: prefix + 'material/get_materialcount?',
        batch: prefix + 'material/batchget_material?'
    },
    tag: {
        create: prefix + 'tags/create?',
        get: prefix + 'tags/get?',
        update: prefix + 'tags/update?',
        delete: prefix + 'tags/delete?',
        gettagfan: prefix + 'user/tag/get?',
        batchtag: prefix + 'tags/members/batchtagging?',
        batchuntag: prefix + 'tags/members/batchuntagging?',
        getidlist: prefix + 'tags/getidlist?',
    },
    user: {
        remark: prefix + 'user/info/updateremark?',
        get: prefix + 'user/info?',
        batchget: prefix + 'user/info/batchget?',
        users: prefix + 'user/get?'
    },
    mass: {
        sendbytag: prefix + 'message/mass/sendall?',
        sendbyId: prefix + 'message/mass/send?',
        delete: prefix + 'message/mass/delete?',
        preview: prefix + 'message/mass/preview?',
        check: prefix + 'message/mass/get?'
    },
    qrcode:{
        create: prefix + 'qrcode/create?',
        show: mpprefix + 'showqrcode?'
    },
    shortUrl:{
        create: prefix + 'shorturl?'
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

                if (!permanent) {
                    url += '&type=' + type
                } else {
                    form.access_token = data.access_token
                }

                var options = {
                    method: 'POST',
                    url: url,
                    json: true
                };

                if (type === 'news') {
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
                } else {
                    if (type === 'video') {
                        url = url.replace('https://', 'http://')
                    }
                    url += '&media_id=' + mediaId
                }

                if (type === 'news' || type === 'video') {
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

Wechat.prototype.createtag = function (name) {
    var that = this;

    return new Promise(function (resolve, reject) {
        that.fetchAccessToken()
            .then(function (data) {
                var url = api.tag.create + 'access_token=' + data.access_token;
                var options = {
                    tag: {name: name}
                };
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

Wechat.prototype.gettags = function () {
    var that = this;

    return new Promise(function (resolve, reject) {
        that.fetchAccessToken()
            .then(function (data) {
                var url = api.tag.get + 'access_token=' + data.access_token;

                request({url: url, json: true}).then(function (response) {
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

Wechat.prototype.updatetag = function (id, name) {
    var that = this;

    return new Promise(function (resolve, reject) {
        that.fetchAccessToken()
            .then(function (data) {
                var url = api.tag.update + 'access_token=' + data.access_token;
                var options = {
                    tag: {
                        id: id,
                        name: name
                    }
                };
                request({method: 'POST', url: url, body: options, json: true}).then(function (response) {
                    var _data = response.body;

                    if (_data) {
                        resolve(_data);
                    } else {
                        throw new Error('update tag fails')
                    }
                }).catch(function (err) {
                    reject(err)
                })
            });
    })
};

Wechat.prototype.deletetag = function (id) {
    var that = this;

    return new Promise(function (resolve, reject) {
        that.fetchAccessToken()
            .then(function (data) {
                var url = api.tag.delete + 'access_token=' + data.access_token;
                var options = {
                    tag: {
                        id: id,
                    }
                };
                request({method: 'POST', url: url, body: options, json: true}).then(function (response) {
                    var _data = response.body;

                    if (_data) {
                        resolve(_data);
                    } else {
                        throw new Error('delet tag fails')
                    }
                }).catch(function (err) {
                    reject(err)
                })
            });
    })
};

Wechat.prototype.gettagfan = function (id, nextOpenId) {
    var that = this;

    return new Promise(function (resolve, reject) {
        that.fetchAccessToken()
            .then(function (data) {
                var url = api.tag.gettagfan + 'access_token=' + data.access_token;
                var options = {
                    tagid: id,
                    next_openid: nextOpenId || ""
                };
                request({method: 'POST', url: url, body: options, json: true}).then(function (response) {
                    var _data = response.body;

                    if (_data) {
                        resolve(_data);
                    } else {
                        throw new Error('gettagfan fails')
                    }
                }).catch(function (err) {
                    reject(err)
                })
            });
    })
};

Wechat.prototype.batchtag = function (tagid, openidList) {
    var that = this;

    return new Promise(function (resolve, reject) {
        that.fetchAccessToken()
            .then(function (data) {
                var url = api.tag.ba + 'access_token=' + data.access_token;
                var options = {
                    openid_list: openidList,
                    tagid: tagid
                };
                request({method: 'POST', url: url, body: options, json: true}).then(function (response) {
                    var _data = response.body;

                    if (_data) {
                        resolve(_data);
                    } else {
                        throw new Error('batchtag fails')
                    }
                }).catch(function (err) {
                    reject(err)
                })
            });
    })
};

Wechat.prototype.batchuntag = function (tagid, openidList) {
    var that = this;

    return new Promise(function (resolve, reject) {
        that.fetchAccessToken()
            .then(function (data) {
                var url = api.tag.batchuntag + 'access_token=' + data.access_token;
                var options = {
                    openid_list: openidList,
                    tagid: tagid
                };
                request({method: 'POST', url: url, body: options, json: true}).then(function (response) {
                    var _data = response.body;

                    if (_data) {
                        resolve(_data);
                    } else {
                        throw new Error('batchuntag fails')
                    }
                }).catch(function (err) {
                    reject(err)
                })
            });
    })
};

Wechat.prototype.gettaglist = function (openid) {
    var that = this;

    return new Promise(function (resolve, reject) {
        that.fetchAccessToken()
            .then(function (data) {
                var url = api.tag.getidlist + 'access_token=' + data.access_token;
                var options = {
                    openid: openid,
                };
                request({method: 'POST', url: url, body: options, json: true}).then(function (response) {
                    var _data = response.body;

                    if (_data) {
                        resolve(_data);
                    } else {
                        throw new Error('gettaglist fails')
                    }
                }).catch(function (err) {
                    reject(err)
                })
            });
    })
};

Wechat.prototype.remarkuser = function (openid, remark) {
    var that = this;

    return new Promise(function (resolve, reject) {
        that.fetchAccessToken()
            .then(function (data) {
                var url = api.user.remark + 'access_token=' + data.access_token;
                var options = {
                    openid: openid,
                    remark: remark
                };
                request({method: 'POST', url: url, body: options, json: true}).then(function (response) {
                    var _data = response.body;

                    if (_data) {
                        resolve(_data);
                    } else {
                        throw new Error('remarkuser fails')
                    }
                }).catch(function (err) {
                    reject(err)
                })
            });
    })
};

Wechat.prototype.getinfos = function (openids, lang) {

    var that = this;

    lang = lang || 'zh_CN';

    return new Promise(function (resolve, reject) {
        that.fetchAccessToken()
            .then(function (data) {

                var options = {
                    json: true
                }
                if (_.isArray(openids)) {
                    options.url = api.user.batchget + 'access_token=' + data.access_token;
                    options.body = {
                        user_list: openids
                    };
                    options.method = 'POST';
                } else {
                    options.url = api.user.get + 'access_token=' + data.access_token +
                        '&openid=' + openids + '&lang=' + lang;
                }

                request(options).then(function (response) {
                    var _data = response.body;

                    if (_data) {
                        resolve(_data);
                    } else {
                        throw new Error('getinfos fails')
                    }
                }).catch(function (err) {
                    reject(err)
                })
            });
    })
};

Wechat.prototype.getusers = function (openid) {
    var that = this;

    return new Promise(function (resolve, reject) {
        that.fetchAccessToken()
            .then(function (data) {
                var url = api.user.users + 'access_token=' + data.access_token;
                if (openid) {
                    url += '&next_openid=' + openid;
                }

                request({url: url, json: true}).then(function (response) {
                    var _data = response.body;

                    if (_data) {
                        resolve(_data);
                    } else {
                        throw new Error('getusers fails')
                    }
                }).catch(function (err) {
                    reject(err)
                })
            });
    })
};

Wechat.prototype.sendbytag = function (type, message, tagid) {
    var that = this;
    var msg = {
        filter: {},
        msgtype: type,
    };

    msg[type] = message;

    if (!tagid) {
        msg.filter.is_to_all = true;
    } else {
        msg.filter = {
            is_to_all : false,
            tag_id : tagid
        }
    }

    return new Promise(function (resolve, reject) {
        that.fetchAccessToken()
            .then(function (data) {
                var url = api.mass.sendbytag + 'access_token=' + data.access_token;

                request({method: 'POST', url: url, body: msg, json: true}).then(function (response) {
                    var _data = response.body;

                    if (_data) {
                        resolve(_data);
                    } else {
                        throw new Error('sendbytag fails')
                    }
                }).catch(function (err) {
                    reject(err)
                })
            });
    })
};

Wechat.prototype.sendbyid = function (type, message, openids) {
    var that = this;
    var msg = {
        msgtype: type,
        touser : openids
    };

    msg[type] = message;

    return new Promise(function (resolve, reject) {
        that.fetchAccessToken()
            .then(function (data) {
                var url = api.mass.sendbyId + 'access_token=' + data.access_token;
                console.log(msg);
                request({method: 'POST', url: url, body: msg, json: true}).then(function (response) {
                    var _data = response.body;

                    if (_data) {
                        resolve(_data);
                    } else {
                        throw new Error('sendbyid fails')
                    }
                }).catch(function (err) {
                    reject(err)
                })
            });
    })
};

Wechat.prototype.deletemass = function (msgid,index) {
    var that = this;

    return new Promise(function (resolve, reject) {
        that.fetchAccessToken()
            .then(function (data) {
                var url = api.mass.delete + 'access_token=' + data.access_token;
                console.log(msg);
                request({method: 'POST', url: url, body: {msg_id:msgid, article_idx:index}, json: true}).then(function (response) {
                    var _data = response.body;

                    if (_data) {
                        resolve(_data);
                    } else {
                        throw new Error('sendbyid fails')
                    }
                }).catch(function (err) {
                    reject(err)
                })
            });
    })
};

Wechat.prototype.checkmass = function (msgid ) {
    var that = this;

    return new Promise(function (resolve, reject) {
        that.fetchAccessToken()
            .then(function (data) {
                var url = api.mass.check + 'access_token=' + data.access_token;

                request({method: 'POST', url: url, body: {msg_id:msgid}, json: true}).then(function (response) {
                    var _data = response.body;

                    if (_data) {
                        resolve(_data);
                    } else {
                        throw new Error('checkmass fails')
                    }
                }).catch(function (err) {
                    reject(err)
                })
            });
    })
};


Wechat.prototype.previewmass = function (openid, type, message ) {
    var that = this;
    var msg = {
        touser: openid,
        msgtype: type,
    };

    msg[type] = message;

    return new Promise(function (resolve, reject) {
        that.fetchAccessToken()
            .then(function (data) {
                var url = api.mass.preview + 'access_token=' + data.access_token;
                console.log(msg);
                request({method: 'POST', url: url, body: msg, json: true}).then(function (response) {
                    var _data = response.body;

                    if (_data) {
                        resolve(_data);
                    } else {
                        throw new Error('previewmass fails')
                    }
                }).catch(function (err) {
                    reject(err)
                })
            });
    })
};

Wechat.prototype.createqrcode = function (qr) {
    var that = this;

    return new Promise(function (resolve, reject) {
        that.fetchAccessToken()
            .then(function (data) {
                var url = api.qrcode.create + 'access_token=' + data.access_token;

                request({method: 'POST', url: url, body: qr, json: true}).then(function (response) {
                    var _data = response.body;

                    if (_data) {
                        resolve(_data);
                    } else {
                        throw new Error('createqrcode fails')
                    }
                }).catch(function (err) {
                    reject(err)
                })
            });
    })
};

Wechat.prototype.showqrcode = function (ticket) {
    var that = this;

    return new Promise(function (resolve, reject) {
        that.fetchAccessToken()
            .then(function (data) {
                var url = api.qrcode.show + 'ticket=' + encodeURI(ticket);
                request({url: url, json: true}).then(function (response) {
                    var _data = response.body;

                    if (_data) {
                        resolve(_data);
                    } else {
                        throw new Error('showqrcode fails')
                    }
                }).catch(function (err) {
                    reject(err)
                })
            });
    })
};

Wechat.prototype.createshorturl = function (urlType, url) {
    urlType = urlType || 'long2short';

    var that = this;

    return new Promise(function (resolve, reject) {
        that.fetchAccessToken()
            .then(function (data) {
                var url = api.shortUrl.create + 'access_token=' + data.access_token;
                var form = {
                    action:  urlType,
                    long_url: url
                }
                request({method: 'POST', url: url, body: form, json: true}).then(function (response) {
                    var _data = response.body;

                    if (_data) {
                        resolve(_data);
                    } else {
                        throw new Error('createshorturl fails')
                    }
                }).catch(function (err) {
                    reject(err)
                })
            });
    })
};

Wechat.prototype.semantic = function (msg) {

    var that = this;

    return new Promise(function (resolve, reject) {
        that.fetchAccessToken()
            .then(function (data) {
                var url = api.semantic + 'access_token=' + data.access_token;

                msg.appid = data.appID;

                console.log(msg);

                request({method: 'POST', url: url, body: msg, json: true}).then(function (response) {
                    var _data = response.body;

                    if (_data) {
                        resolve(_data);
                    } else {
                        throw new Error('createshorturl fails')
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

