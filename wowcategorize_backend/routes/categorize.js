const express = require('express');
const router = express.Router();
const {getUrlData} = require('../work_modules/executor')


router.ws('/', (ws, req) => {

  ws.on('message',  async function (msg) {
    const url = await JSON.parse(msg).url;
    console.log(url)

    const dataArray = await getUrlData(url, ws);
    ws.send(JSON.stringify(dataArray))

    ws.close();
  });

});

module.exports = router;

