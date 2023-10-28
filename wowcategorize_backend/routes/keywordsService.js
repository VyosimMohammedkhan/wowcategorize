const express = require('express');
const router = express.Router();
const fs = require('fs')


const app = express();
app.use(express.json());

router.get('/', async (req, res) => {
  console.log('reading file')
  fs.readFile('./work_modules/keywords.json', 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading JSON file:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    let jsonData;
    jsonData = JSON.parse(data);
    res.json(jsonData);
    res.status(200);
  });
})

router.post('/', async (req, res) => {
  const updatedData = req.body;

  fs.writeFile('./work_modules/keywords.json', JSON.stringify(updatedData), 'utf8', err => {
    if (err) {
      console.error('Error writing JSON file:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    console.log('Data updated successfully');
    res.status(200).json({ message: 'Data updated successfully' });
  });
});
module.exports = router;