const express = require('express');
const fs = require('fs')
const http = require('http');
const https = require('https');
const axios = require('axios');
const querystring = require("querystring");
const app = express();
const port = process.env.NODE_PORT || 8801;

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

const reqBody = {
  "userSystemData": {
    "system": "iOS 15.5",
    "platform": "ios",
    "model": "iPhone 12 Pro<iPhone13,3>",
    "brand": "iPhone",
    "version": "8.0.29",
    "SDKVersion": "2.27.0",
    "windowWidth": 390
  },
  "sessionId": "9388a318801c40f78278bff6e44fb764",
};
const reqHeader = {
  "x-tif-did": "1nwLbL8esT",
  "x-tif-sid": "856179f6eb44e042a6ab",
  "Content-Type": "application/json",
  "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.29(0x18001d32) NetType/WIFI Language/zh_CN"
};

const disposeLineName = lineName => {
  var regExp = /^\d+(\.\d+)?$/;
  if (regExp.test(lineName)) {
    lineName = lineName + '路';
  }
  return encodeURI(lineName);
}

const getLineBase = (lineName) => {
  lineName = disposeLineName(lineName);

  return new Promise((resolve, reject) => {
    axios.post('https://smartgate.ywtbsupappw.sh.gov.cn/ebus/jtw/trafficline/base', JSON.parse(JSON.stringify({
      ...reqBody,
      "name": lineName,
      "params": {
        "name": lineName,
      }
    })), {
      headers: reqHeader
    }).then(({ data }) => {
      // console.log(data.data);
      resolve(data.data)
    });

  });
}

const getBusStop = (line_id, lineName) => {
  lineName = disposeLineName(lineName);

  return new Promise((resolve, reject) => {
    axios.post('https://smartgate.ywtbsupappw.sh.gov.cn/ebus/jtw/trafficline/stoplist', JSON.parse(JSON.stringify({
      ...reqBody,
      "lineid": line_id,
      "name": lineName,
      "params": {
        "lineid": line_id,
        "name": lineName,
      }
    })), {
      headers: reqHeader
    }).then(({ data }) => {
      resolve(data.data)
    });
  });
}

const getArriveBase = (line_id, lineName, direction, stopid) => {
  lineName = disposeLineName(lineName);

  return new Promise((resolve, reject) => {
    axios.post('https://smartgate.ywtbsupappw.sh.gov.cn/ebus/jtw/trafficline/carmonitor', JSON.parse(JSON.stringify({
      ...reqBody,
      "lineid": line_id,
      "name": lineName,
      stopid,
      direction,
      "params": {
        "lineid": line_id,
        "name": lineName,
        stopid,
        direction,
      }
    })), {
      headers: reqHeader
    }).then(({ data }) => {
      resolve(data.data)
    });
  });
}

//获取线路
app.get('/api/getline', async (req, res) => {
  var path = req.originalUrl;
  let param = querystring.parse(req.url.split('?')[1] || '');
  let { cityCode, lineName } = param;

  try {
    const { line_id, line_name, start_stop, start_earlytime, start_latetime, end_stop, end_earlytime, end_latetime } = await getLineBase(lineName);
    if (!line_id) return res.send({ code: -1, datas: {}, message: '没有查询到该公交线路' });
    const lineResponse = await getBusStop(line_id, lineName);
    const stops0 = lineResponse[`lineResults0`].stop || [];
    const stops1 = lineResponse[`lineResults1`].stop || [];

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
    let B = { realtime: typeof getResponse == 'object' ? getResponse.cars.car : null };
    res.send({ code: 1, datas: B, message: '成功' });

  } catch (error) {
    console.log(error);
    res.send(error_result);
  }
});

// 创建https服务器实例
const httpsServer = https.createServer(credentials, app)
// 启动服务器，监听对应的端口
app.listen(port, () => console.log('\033[42;30m DONE \033[40;32m Access to the address:\033[40;36m', `http://localhost:${port}`, '\033[0m'));
// httpsServer.listen(443, () => { console.log(`开始监听443端口!`) })