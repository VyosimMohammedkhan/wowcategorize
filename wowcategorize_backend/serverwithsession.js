// const express = require("express");
// const app = express();
// const cors = require('cors');
// const expressWs = require('express-ws')(app);
// const PORT =process.env.PORT || 5000;
// const categorize = require("./routes/categorize");
// const getkeywords =require("./routes/keywordsService")
// const categorizeBulk = require("./routes/categorizeBulk")
// const dbData = require("./routes/dbData")
// const ProgressStatus = require('./routes/statusupdate')
// const mainPageProgress = require('./routes/progressForMainPage')
// const bodyParser = require('body-parser');

// const bodyParserConfig = {
//   json: { limit: '10mb', extended: true },
//   urlencoded: { limit: '10mb', extended: true }
// };

// app.use(bodyParser.json(bodyParserConfig.json));
// app.use(bodyParser.urlencoded(bodyParserConfig.urlencoded));

// app.use(cors());
// //app.use(express.json());
// app.use(express.json({limit: "10mb", extended: true}))
// app.use(express.urlencoded({limit: "10mb", extended: true, parameterLimit: 50000}))

// app.get("/", (req, res) => {
//   res.json({ message: "ok" });
// });

// app.use("/keywords", getkeywords)
// app.use("/categorize", categorize);
// app.use("/categorizeBulk", categorizeBulk)
// app.use("/dbData",dbData )

// app.use("/bulkStatus", ProgressStatus)
// app.use("/mainPageProgress", mainPageProgress)

// app.listen(PORT, () => {
//   console.log(`listening on port ${PORT}`)
// })





require('sticky-cluster')(
 
  // server initialization function
  function (callback) {
    var http = require('http');
    var express = require('express');
    const app= express();
    var server = http.createServer(app);
      
    // configure an app
      // do some async stuff if needed
  
  const cors = require('cors');
  const expressWs = require('express-ws')(app);
  const categorize = require("./routes/categorize");
  const getkeywords = require("./routes/keywordsService")
  const categorizeBulk = require("./routes/categorizeBulk")
  const dbData = require("./routes/dbData")
  const ProgressStatus = require('./routes/statusupdate')
  const mainPageProgress = require('./routes/progressForMainPage')
  const bodyParser = require('body-parser');

  const bodyParserConfig = {
    json: { limit: '10mb', extended: true },
    urlencoded: { limit: '10mb', extended: true }
  };

  app.use(bodyParser.json(bodyParserConfig.json));
  app.use(bodyParser.urlencoded(bodyParserConfig.urlencoded));

  app.use(cors());
  app.use(express.json({ limit: "10mb", extended: true }))
  app.use(express.urlencoded({ limit: "10mb", extended: true, parameterLimit: 50000 }))

  app.get("/", (req, res) => {
    res.json({ message: "ok" });
  });

  app.use("/keywords", getkeywords)
  app.use("/categorize", categorize);
  app.use("/categorizeBulk", categorizeBulk)
  app.use("/dbData", dbData)

  app.use("/bulkStatus", ProgressStatus)
  app.use("/mainPageProgress", mainPageProgress)


    // don't do server.listen(), just pass the server instance into the callback
    callback(server);
  },
  
  // options
  {
    concurrency: 10,
    port: 5000,
    debug: true,
    env: function (index) { return { stickycluster_worker_index: index }; }
  }
);