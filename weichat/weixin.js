'use strict'

var config = require('./config');
var Wechat = require('./wechat/wechat');

var wechatApi = new Wechat(config.wechat);

exports.reply = function* (next) {
    var message = this.weixin;

    if (message.MsgType === 'event') {
        if (message.Event === 'subscribe') {
            if (message.EventKey) {
                console.log('扫描二维码进入的');
            }

            this.body = '这里是猫星乐园，欢迎订阅';
        } else if (message.Event === 'unsubscribe') {
            this.body = '';
            console.log('无情取关');
        } else if (message.Event === 'LOCATION') {
            this.body = '您上报的位置是' + message.Latitude + '/' +
                message.Longitude + '-' + message.Precision
        } else if (message.Event === 'CLICK') {
            this.body = '您点击了菜单' + message.EventKey;
        } else if (message.Event === 'SCAN') {
            console.log('关注后扫二维码' + message.EventKey + ' ' + message.Ticket);
            this.body = '看你扫了下二维码';
        } else if (message.Event === 'VIEW') {
            this.body = '您点击了菜单的连接：' + message.EventKey;
        }
    } else if (message.MsgType === 'location') {
        this.body = '您的位置是' + message.Label;
    } else if (message.MsgType === 'text') {
        var content = message.Content;
        var reply = '喵～～～我不太明白' + content + '是什么意思';

        if (content === '猫星') {
            reply = '喵喵喵'
        } else if (content === '猫猫') {
            reply = '咪唔咪唔'
        } else if (content === '猫星照片') {
            reply = [{
                title: 'hi',
                description: 'hi',
                picurl: 'http://img1.qq.com/ent/20051226/2916989.jpg',
                url: 'https://www.baidu.com/'
            }, {
                title: 'hello',
                description: 'hello',
                picurl: 'http://img1.qq.com/ent/20051226/2916989.jpg',
                url: 'https://www.baidu.com/'
            }]
        } else if (content === '1') {
            var data = yield wechatApi.uploadMaterial('image', __dirname + '/2.jpg');
            reply = {
                type: 'image',
                mediaId: data.media_id
            };
            this.body = reply;
        } else if (content === '2') {
            var data = yield wechatApi.uploadMaterial('image', __dirname + '/2.jpg', {type: 'image'});
            reply = {
                type: 'image',
                mediaId: data.media_id
            };
            this.body = reply;
        } else if (content === '3') {
            var picData = yield wechatApi.uploadMaterial('image', __dirname + '/2.jpg', {});
            console.log(picData);
            var media = {
                articles: [{
                    title: '测一测',
                    thumb_media_id: picData.media_id,
                    author: 'way',
                    digest: 'none',
                    show_cover_pic: 1,
                    content: 'CONTENT',
                    content_source_url: 'https://www.baidu.com/'
                }]
            };

            data = yield wechatApi.uploadMaterial('news', media, {});

            data = yield wechatApi.getMaterial(data.media_id, 'news', {});

            console.log('data:' + data);

            var items = data.news_item;
            var news = [];

            items.forEach(function (item) {
                news.push({
                    title: item.title,
                    description: item.digest,
                    picurl: picData.url,
                    url: item.url
                })
            });
            console.log(news);
            reply = news;
            this.body = reply;

        } else if (content === '4') {
            var counts = yield wechatApi.countMaterial();
            console.log(JSON.stringify(counts))
            var list1 = yield wechatApi.batchMaterial({
                type: 'image',
                offset: 0,
                count: 10
            })
            var list2 = yield wechatApi.batchMaterial({
                type: 'news',
                offset: 0,
                count: 10
            })
            console.log(list1);
            console.log(list2);
        } else if (content === '5') {
            var group = yield wechatApi.createtag('weichat');
            console.log('新分组 wechat');
            console.log(group);

            var groups = yield wechatApi.gettags();
            console.log('分组 wechat');
            console.log(groups);

            var groups = yield wechatApi.gettaglist(message.FromUserName);
            console.log('我的分组');
            console.log(groups);
        } else if (content === '6') {
            var user = yield wechatApi.getinfos(message.FromUserName,'en');
            console.log(user);

            var openIds = [
                {
                    openid: message.FromUserName,
                    lang: 'zh_CN'
                }
            ]
            var users = yield wechatApi.getinfos(openIds);
            console.log(users);
            reply = JSON.stringify(user);
        } else if (content === '7') {

            var text = {
                content : 'hello'
            }
            var msgData = yield wechatApi.sendbytag('text',text);

            console.log(msgData);
        } else if (content === '8') {
            var news = yield wechatApi.batchMaterial({
                type: 'news',
                offset: 0,
                count: 1
            });
             console.log(news);
            news = news.item[0].media_id;
            var mpnews = {
                media_id:news
            };
            var msgData = yield wechatApi.previewmass(message.FromUserName,'mpnews',mpnews);

        } else if (content === '9') {

            var msgData = yield wechatApi.checkmass('1000000001');
            console.log(msgData);

        } else if (content === '10') {

            var tempQr = {
                expire_seconds: 400000,
                action_name: 'QR_STR_SCENE',
                action_info: {
                    scene: {scene_str: 'test'}
                }
            };

            var qr = yield wechatApi.createqrcode(tempQr);
            console.log(qr)
        } else if (content === '11') {
            var longurl = 'https://www.baidu.com';

            var url = yield wechatApi.createshorturl(null,longurl);
            console.log(url);
        } else if (content === '12') {
            var semontic = {
                query:'查一下电影星球大战',
                city:'西安',
                category: 'movie',
                uid:message.FromUserName
            };

            var msgData = yield wechatApi.semantic(semontic);
            console.log(msgData);
            reply = JSON.stringify(msgData);
        }
        this.body = reply;
    }

    yield next
};