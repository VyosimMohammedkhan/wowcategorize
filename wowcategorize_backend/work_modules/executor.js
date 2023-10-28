const { setProgress, crawler } = require('./helper_function')
const { getDataFromMongoDB } = require('./db');


async function getUrlData(url, ws) {

     //let datainDB = await getDataFromMongoDB(url);
     await setProgress('Checking if data exists in db for ' + url);
     let data;
     //  if (!datainDB) {
     console.log("crawling")

     data = await crawler(url, ws);
     ws.send(JSON.stringify({message:'...'}));

     // } else {
     //      console.log("Not crawling" , datainDB)
     //      setProgress('Data exists in DB. getting data from DB');
     //      data = datainDB
     // }
     

     return data;
}


module.exports = { getUrlData };
