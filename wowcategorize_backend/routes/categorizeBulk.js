const express = require('express');
const router = express.Router();
const { getDataForBulkUrl } = require('../work_modules/executor_bulk');

let interval;

router.ws('/', async (ws, req) => {

  ws.on('message', async function (msg) {

    const urlList = await JSON.parse(msg).urlList;
    const recrawl = await JSON.parse(msg).recrawl;

    await getDataForBulkUrl(urlList, recrawl, ws);

    ws.close();
  });
});

module.exports = router;