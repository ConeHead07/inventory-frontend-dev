"use strict";
exports.__esModule = true;
require("es6-shim");
require("reflect-metadata");
var path = require("path");
var bodyParser = require("body-parser");
var moment = require("moment");
var express = require('express');
const https = require('https');
const fs = require('fs');
var allowedExt = [
  '.js',
  '.ico',
  '.css',
  '.png',
  '.jpg',
  '.woff2',
  '.woff',
  '.ttf',
  '.svg',
];
var Server = (function () {
  function Server() {
    var _this = this;
    this.useSSL = true;
    this.appRoot = "dist/frontend/";
    this.port = 9090;
    this.httpsport = 9015;
    // Create expressjs application
    this.app = express();
    //Route our backend calls
    this.app.get('/api', function (req, res) { return res.json({ application: 'Reibo collection' }); });
    //Redirect all the other resquests
    this.app.get('*', function (req, res) {
      if (allowedExt.filter(function (ext) { return req.url.indexOf(ext) > 0; }).length > 0) {
        res.sendFile(path.resolve(_this.appRoot + req.url));
      }
      else {
        res.sendFile(path.resolve(_this.appRoot + 'index.html'));
      }
    });
    this.app.use(bodyParser.json({ limit: '50mb' }));
    this.app.use(bodyParser.raw({ limit: '50mb' }));
    this.app.use(bodyParser.text({ limit: '50mb' }));
    this.app.use(bodyParser.urlencoded({
      limit: '50mb',
      extended: true
    }));

    this.app.on('error', function (error) {
      console.error(moment().format(), 'ERROR', error);
    });

    if (!this.useSSL) {
      this.app.listen(this.port, function () {
        return console.log("http is started " + _this.port);
      });
    } else {

      https.createServer({
          key: fs.readFileSync('./ssl/localhost.key'),
          cert: fs.readFileSync('./ssl/localhost.crt')

          // key: fs.readFileSync('./ssh_certs_medium_com/key.pem'),
          // cert: fs.readFileSync('./ssh_certs_medium_com/cert.pem')

          // key: fs.readFileSync('./ssh_certs_timonweb_com/server.key'),
          // cert: fs.readFileSync('./ssh_certs_timonweb_com/server.cert')

          // key: fs.readFileSync('./ssh_certs/key.pem'),
          // cert: fs.readFileSync('./ssh_certs/cert.pem'),
          // passphrase: '12345'
        },
        server
      ).listen(
        _this.httpsport,
        function () {
          return console.log("https is started " + _this.httpsport);
        });
    }

    process.on('uncaughtException', function (error) {
      console.log(moment().format(), error);
    });
  }
  Server.bootstrap = function () {
    return new Server();
  };
  return Server;
}());
//Bootstrap the server, so it is actualy started
var server = Server.bootstrap();
exports["default"] = server.app;
