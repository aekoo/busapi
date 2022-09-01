const express = require('express');
const fs = require('fs')
const http = require('http');
const https = require('https');
const querystring = require("querystring");
const app = express();

var privateKey = fs.readFileSync('./certificate/private.key', 'utf8');
var certificate = fs.readFileSync('./certificate/certificate.pem', 'utf8');
const credentials = {
  key: privateKey,
  cert: certificate,
}

const getLineBase = (lineName) => {
  var regExp = /^\d+(\.\d+)?$/;
  if (regExp.test(lineName)) {
    lineName = lineName + '路';
  }
  lineName = encodeURI(lineName)

  return new Promise((resolve, reject) => {
    http.get({
      hostname: 'apps.eshimin.com',
      path: '/traffic/gjc/getBusBase?name=' + lineName
    }, function (data) {
      var body = [];
      data.on('data', function (chunk) {
        body.push(chunk);
      });
      data.on('end', function (e) {
        body = Buffer.concat(body);
        resolve(body)
      });
    });
  });
}

const getBusStop = (line_id, lineName) => {
  lineName = encodeURI(lineName)
  return new Promise((resolve, reject) => {
    http.get({
      hostname: 'apps.eshimin.com',
      path: `/traffic/gjc/getBusStop?name=${lineName}&lineid=${line_id}`
    }, function (data) {
      var body = [];
      data.on('data', function (chunk) {
        body.push(chunk);
      });
      data.on('end', function (e) {
        body = Buffer.concat(body);
        resolve(body)
      });
    });
  });
}

const getArriveBase = (line_id, lineName, direction, stopid) => {
  lineName = encodeURI(lineName)
  return new Promise((resolve, reject) => {
    http.get({
      hostname: 'apps.eshimin.com',
      path: `/traffic/gjc/getArriveBase?name=${lineName}&lineid=${line_id}&stopid=${stopid}&direction=${direction}`
    }, function (data) {
      var body = [];
      data.on('data', function (chunk) {
        body.push(chunk);
      });
      data.on('end', function (e) {
        body = Buffer.concat(body);
        resolve(body.toString())
      });
    });
  });
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

//获取线路
// app.get('/api/getline', (req, res) => {
//   var path = req.originalUrl;
//   let { lineName } = req.query;
//   console.log(req.query);
//   let regExp = /^\d+(\.\d+)?$/;
//   if (regExp.test(lineName)) {
//     lineName = lineName + '路';
//   }
//   http.get({
//     hostname: 'apps.eshimin.com',
//     path: '/traffic/gjc/getBusBase?name=' + encodeURI(lineName)
//   }, function (data) {
//     var body = [];
//     data.on('data', function (chunk) {
//       console.log('chunk', chunk);
//       body.push(chunk);
//     });
//     data.on('end', function () {
//       body = Buffer.concat(body);
//       console.log('body', body.toString());
//       res.send(body.toString())
//     });
//   });
// });

//获取站点信息
// app.get('/api/carmonitor', (req, res) => {
//   var path = req.originalUrl;
//   let param = req.url.split('?')[1] || '';
//   http.get({
//     hostname: 'www.jtcx.sh.cn',
//     path: '/dynamictraffic_interface/web/trafficline/carmonitor?' + param
//   }, function (data) {
//     var body = [];
//     data.on('data', function (chunk) {
//       body.push(chunk);
//     });
//     data.on('end', function () {
//       body = Buffer.concat(body);
//       res.send(body.toString())
//     });
//   });
// });


//获取站点信息
app.get('/api/carmonitor', async (req, res) => {
  var path = req.originalUrl;
  let param = querystring.parse(req.url.split('?')[1] || '');

  let lineName = param.busname;
  try {

    const resLinebase = await getLineBase(lineName);
    const { line_id, line_name, start_stop, start_earlytime, start_latetime, end_stop, end_earlytime, end_latetime } = JSON.parse(resLinebase);
    // console.log(line_id);
    const lineResponse = await getBusStop(line_id, lineName);
    // console.log(JSON.parse(lineResponse));
    const direction = param.startstop == start_stop ? 0 : 1;
    const stops = JSON.parse(lineResponse)[`lineResults${direction}`].stops || [];

    let stopids = stops.filter((val) => {
      if (val.zdmc == param.stopname) {
        return val.id;
      } else {
        return 0;
      }
    });
    
    if (stopids.length) {
      let stopid = stopids[0].id

      const getResponse = await getArriveBase(line_id, lineName, direction, stopid);
      // console.log(JSON.parse(getResponse));
      let B = getResponse.replace('cars', 'realtime')
      B = B.replace('[', '')
      B = B.replace(']', '')
      if (B == "{ }") {
        B = { "result": {} };
      } else {
        B = { "result": JSON.parse(B) }
        console.log(B);
      }
      res.send(B);
    } else {
      res.send({ "result": {} });
    }

  } catch (error) {
    console.log(error);
  }
});

// 创建https服务器实例
const httpsServer = https.createServer(credentials, app)
// 启动服务器，监听对应的端口
app.listen(80, () => console.log('开始监听80端口!'));
httpsServer.listen(443, () => { console.log(`开始监听443端口!`) })