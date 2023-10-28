const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const getData = require('../work_modules/aggridToMysql')

const app = express();
const tablename = ' FROM hrefkeywords.hrefkeywords '
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

router.get('/', async (req, res) => {
    console.log('reading file')
    res.status(200).json({ error: 'hrefkeywords route is working' });
});

router.post('/', function (req, res) {
    getData(req.body, tablename, (rows, lastRow) => {
        res.json({ rows: rows, lastRow: lastRow 
        });
    });
});

module.exports = router;