'use strict'

var path = require('path');
var wechat_file = path.join(__dirname, './config/wechat.txt');
var wechat_ticket_file =  path.join(__dirname, './config/ticket.txt');
var utill = require('./libs/utill');

var config = {
    /* wechat:{
        appID:'wx48dcef3923bdb0eb',
        appSecret:'728eedb9f54b40f0db2ae679f50642f4',
        token:'waytovictory',
        getAccessToken: function () {
            return utill.readFileSync(wechat_file);
        },
        saveAccessToken: function (data) {
            data = JSON.stringify(data);
            return utill.writeFileSync(wechat_file, data);
        }
    } */
    wechat:{
        appID:'wxa41e6f1262caabcd',
        appSecret:'23c26ebbff0d2c404b6f5dc8c0309594',
        token:'waytovictory',
        getAccessToken: function () {
            return utill.readFileSync(wechat_file);
        },
        saveAccessToken: function (data) {
            data = JSON.stringify(data);
            return utill.writeFileSync(wechat_file, data);
        },
        getTicket: function () {
            return utill.readFileSync(wechat_ticket_file);
        },
        saveTicket: function (data) {
            data = JSON.stringify(data);
            return utill.writeFileSync(wechat_ticket_file, data);
        }
    }
};

module.exports = config;