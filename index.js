const express = require('express');
const fs = require('fs')
const http = require('http');
const https = require('https');
const app = express();

var privateKey = fs.readFileSync('./certificate/private.key', 'utf8');
var certificate = fs.readFileSync('./certificate/certificate.pem', 'utf8');
const credentials = {
  key: privateKey,
  cert: certificate,
}

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*') // 第二个参数表示允许跨域的域名，* 代表所有域名
  res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS') // 允许的 http 请求的方法
  // 允许前台获得的除 Cache-Control、Content-Language、Content-Type、Expires、Last-Modified、Pragma 这几张基本响应头之外的响应头
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With')
  if (req.method == 'OPTIONS') {
    res.sendStatus(200)
  } else {
    next()
  }
})

app.use('/bus', express.static('bushere'))

//获取线路
app.get('/api/getline', (req, res) => {
  var path = req.originalUrl;
  let param = req.url.split('?')[1] || '';
  var b = new Date
    , a = b.getMonth() + 1 + ""
    , d = b.getDate() + ""
    , c = b.getHours() + ""
    , e = b.getMinutes() + ""
    , b = b.getFullYear() + ""
    , b = b + (1 == a.length ? "0" + a : a)
    , b = b + (1 == d.length ? "0" + d : d)
    , b = b + (1 == c.length ? "0" + c : c)
    , b = b + (1 == e.length ? "0" + e : e)
    , a = "TYMON_" + b;
  http.get({
    hostname: 'www.trafficeye.com.cn',
    path: '/fkgis-gateway/' + a + '/gis/keyquery.json?' + param
  }, function (data) {
    var body = [];
    data.on('data', function (chunk) {
      body.push(chunk);
    });
    data.on('end', function () {
      body = Buffer.concat(body);
      res.send(body.toString())
    });
  });
});

//获取站点信息
app.get('/api/carmonitor', (req, res) => {
  var path = req.originalUrl;
  let param = req.url.split('?')[1] || '';
  http.get({
    hostname: 'www.jtcx.sh.cn',
    path: '/dynamictraffic_interface/web/trafficline/carmonitor?' + param
  }, function (data) {
    var body = [];
    data.on('data', function (chunk) {
      body.push(chunk);
    });
    data.on('end', function () {
      body = Buffer.concat(body);
      res.send(body.toString())
    });
  });
});

// 创建https服务器实例
const httpsServer = https.createServer(credentials, app)
// 启动服务器，监听对应的端口
app.listen(80, () => console.log('开始监听80端口!'));
httpsServer.listen(443, () => { console.log(`开始监听443端口!`) })