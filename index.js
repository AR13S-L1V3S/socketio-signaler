/* jshint node:true */

'use strict';

var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var signaller = require('./signaler')(io, 'default', {
  debug: true
});

server.listen(8083);

signaller.start();

app.use(express.static(__dirname + '/'));

console.log('server listening at 8083');