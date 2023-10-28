const express = require('express');
const router = express.Router();
const { setCompletedAllTasks, categorizeBulk, dequeue, isQueueEmpty, isCompletedAllTasks } = require('../work_modules/executor_bulk');



router.get('/', (req, res) => {
    res.json({ message: "ok" });

})


let interval; // Declare the interval variable outside the WebSocket handler

router.ws('/', (ws, req) => {
  if (interval) {
    console.log("interval is still on")
    clearInterval(interval); // Clear the previous interval if it exists
  }
  ws.on('message', function (msg) {
    const urlList = JSON.parse(msg).urlList;
    categorizeBulk(urlList);

    interval = setInterval(() => {
      while (!isQueueEmpty()) {
        let data = dequeue();
        console.log("emptying queue");
        ws.send(JSON.stringify(data));
      }

      console.log("tasks completed: " + isCompletedAllTasks() + " queueEmpty: " + isQueueEmpty());

      if (isCompletedAllTasks() && isQueueEmpty()) {
        console.log('closing connection');
        clearInterval(interval);
        setCompletedAllTasks(false)
        ws.close();
      }
    }, 500);
  });
});


module.exports = router;