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
const error_result = { code: 500, data: [], message: '噢~出错了，程序员又要加班了！' };

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

//获取线路
app.get('/api/getline', async (req, res) => {
  var path = req.originalUrl;
  let param = querystring.parse(req.url.split('?')[1] || '');
  let { cityCode, lineName } = param;

  try {
    const resLinebase = await getLineBase(lineName);
    const { line_id, line_name, start_stop, start_earlytime, start_latetime, end_stop, end_earlytime, end_latetime } = JSON.parse(resLinebase);
    if (!line_id) return res.send({ code: -1, datas: {}, message: '没有查询到该公交线路' });
    const lineResponse = await getBusStop(line_id, lineName);
    // console.log(JSON.parse(lineResponse));
    const stops0 = JSON.parse(lineResponse)[`lineResults0`].stops || [];
    const stops1 = JSON.parse(lineResponse)[`lineResults1`].stops || [];

    let result_data = {
      line_id,// 线路id
      line_name,// 线路名称
      start_stop,// 起点站
      end_stop,// 终点站
      start_earlytime,// 起点站首班车时间
      start_latetime,// 终点站末班车时间
      end_earlytime,// 反向起点站首班车时间
      end_latetime,// 反向终点站末班车时间
      line_stops: { stops0, stops1 },// 站点列表
    }
    res.send({ code: 1, datas: result_data, message: '成功' });

  } catch (error) {
    console.log(error);
    res.send(error_result);
  }
});

// 获取站点信息
app.get('/api/carmonitor', async (req, res) => {
  var path = req.originalUrl;
  let param = querystring.parse(req.url.split('?')[1] || '');
  let { lineId, lineName, direction, stopid } = param;

  try {
    const getResponse = await getArriveBase(lineId, lineName, direction, stopid);
    // console.log(JSON.parse(getResponse));
    let B = getResponse.replace('cars', 'realtime')
    B = B.replace('[', '')
    B = B.replace(']', '')
    if (B == "{ }") {
      B = {};
    } else {
      B = { ...JSON.parse(B) }
      // console.log(B);
    }
    res.send({ code: 1, datas: B, message: '成功' });

  } catch (error) {
    console.log(error);
    res.send(error_result);
  }
});

// 创建https服务器实例
const httpsServer = https.createServer(credentials, app)
// 启动服务器，监听对应的端口
app.listen(80, () => console.log('开始监听80端口!'));
httpsServer.listen(443, () => { console.log(`开始监听443端口!`) })