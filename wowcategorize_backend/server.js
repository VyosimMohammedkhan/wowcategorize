const express = require("express");
const app = express();
const cors = require('cors');
const expressWs = require('express-ws')(app);
const PORT =process.env.PORT || 5000;
const categorize = require("./routes/categorize");
const getkeywords =require("./routes/keywordsService")
const categorizeBulk = require("./routes/categorizeBulk")
const hrefKeywords = require("./routes/hrefkeywords")
const allcrawleddomains = require("./routes/allCrawledDomains")
const dbData = require("./routes/dbData")
const bodyParser = require('body-parser');


app.use(cors());
app.use(express.json({limit: "20mb", extended: true}))
app.use(express.urlencoded({limit: "20mb", extended: true, parameterLimit: 50000}))
const bodyParserConfig = {
  json: { limit: '20mb', extended: true },
  urlencoded: { limit: '20mb', extended: true }
};
app.use(bodyParser.json(bodyParserConfig.json));
app.use(bodyParser.urlencoded(bodyParserConfig.urlencoded));

app.use("/keywords", getkeywords)
//app.use("/categorize", categorize);// crawl single url
app.use("/categorizeBulk", categorizeBulk)// crawl multiple urls
app.use("/dbData",dbData )//getting and updating crawled urls from database
app.use("/hrefkeywords", hrefKeywords)//master keywords form HREF
app.use("/allcrawleddomains", allcrawleddomains)//master table for all crawled domains


app.listen(PORT, () => {
  console.log(`listening on port ${PORT}`)
})


