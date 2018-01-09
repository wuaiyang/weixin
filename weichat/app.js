'use strict'

var Koa = require('koa');
var wechat = require('./wechat/g');
var config = require('./config');
var weixin = require('./weixin');
var ejs = require('ejs');
//var staticServer = require('koa-static');
var render = require('koa-ejs');
var path = require('path');
var crypto = require('crypto');
var Wechat = require('./wechat/wechat')

var app = new Koa();

render(app, {
    root: path.join(__dirname, 'views'),
    layout: '_layout',
    viewExt: 'html',
    cache: false,
    debug: false
});

var createNonceStr = function () {
    return Math.random().toString(36).substr(2,15)
};

var createTimestamp = function () {
    return parseInt(new Date().getTime()/1000,10) + ''
};

var _sign = function (noncestr, ticket, timestamp, url) {
    var params = [
        'noncestr=' + noncestr,
        'jsapi_ticket=' + ticket,
        'timestamp=' + timestamp,
        'url=' + url
    ];

    var str = params.sort().join('&');
    var shasum = crypto.createHash('sha1');

    shasum.update(str);

    return shasum.digest('hex')
}

function sign(ticket,url) {
    var noncestr = createNonceStr();
    var timestamp = createTimestamp();
    var signature = _sign(noncestr, ticket, timestamp, url);

    return {
        noncestr: noncestr,
        timestamp: timestamp,
        signature: signature
    }
}

app.use(function *(next) {
   if (this.url.indexOf('/movie') > -1){
       var wechatApi = new Wechat(config.wechat);
       var data = yield wechatApi.fetchAccessToken();

       var access_token = data.access_token;

       var ticketData = yield wechatApi.fetchTicket(access_token);

       var ticket = ticketData.ticket;

       var url = this.href;

       var param = sign(ticket, url);
       param.layout = false;

       console.log(param);
       yield this.render('index',param)
   }
});

app.use(wechat(config.wechat, weixin.reply));

app.listen(3000);
console.log('listening 3000');