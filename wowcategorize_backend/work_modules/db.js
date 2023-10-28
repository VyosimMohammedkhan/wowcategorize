const { query } = require('express');
const { MongoClient } = require('mongodb');
const axios = require('axios')
const mysql = require('mysql2/promise');

//---------------This method was used for when mongodb + solr was user. now replaced by mysql -----------------------
// async function sendDataToMongoDB(data) {
//   const site = data.url;
//   //const uri = "mongodb+srv://vyosimmohammedk:Vyosim%402023@wowcategorize.opwfdbe.mongodb.net?retryWrites=true&w=majority";
//   const uri = "mongodb://localhost:27017"
//   const client = new MongoClient(uri);

//   try {
//     const solrBaseUrl = 'http://localhost:8983/solr/hrefkeywords_v2';
//     await client.connect();
//     const db = client.db('wowcategorize');


//     const categoriesCollection = db.collection('categories');
//     const keywordsCollection = db.collection('hrefsKeywords')

//     let categoriesData = { url: data.url, totalCount: data.totalCount, categoryData: data.categoryData, metaData: data.metaData, metadataFromSubpages: data.metadataFromSubpages }
//     let keywordsData = data.keywordsTableData
//     const categoryUpdateResult = await categoriesCollection.updateOne({ 'url': site }, { $set: categoriesData }, { upsert: true });
//     console.log(`cateogory Document updated for ${site} with id: ${categoryUpdateResult.upsertedId}`);

//     try {

//       keywordsData.forEach(async keyword => {
//       let response = await axios.post(`${solrBaseUrl}/update/json/docs`, keyword);
//      //console.log('Document added:', response);
//       })


//       await axios.post(`${solrBaseUrl}/update?commit=true`);
//       console.log('Changes committed');
//     } catch (error) {
//       console.error('Error adding document:', error);
//     }

//   } catch (error) {
//     console.error('Error occurred while sending data to MongoDB:', error);
//   } finally {
//     client.close();
//   }
// }


async function sendDataToMongoDB(data) {
  const site = data.url;
  const uri = "mongodb://localhost:27017"
  const client = new MongoClient(uri);


  const connectionConfig = {
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'hrefkeywords'
  };

  let categoriesData = { url: data.url, totalCount: data.totalCount, categoryData: data.categoryData, metaData: data.metaData, metadataFromSubpages: data.metadataFromSubpages }
  let totalCount = data.totalCount
  let keywordsData = data.keywordsTableData


  //------------inserting data to mongodb
  try {
    await client.connect();
    const db = client.db('wowcategorize');
    const categoriesCollection = db.collection('categories');

    const categoryUpdateResult = await categoriesCollection.updateOne({ 'url': site }, { $set: categoriesData }, { upsert: true });
    //console.log(`cateogory Document updated for ${site} with id: ${categoryUpdateResult.upsertedId}`);

  } catch (error) {
    console.error('Error adding document:', error.message);
  } finally {
    client.close();
  }

  //------------inserting data to mysql
  const connection = await mysql.createConnection(connectionConfig);
  try {
    //adding totalcount to db
    let totalCountValues = Object.values(totalCount).map(value => (typeof value === 'string') ? `'${value}'` : value).join(', ');
    const totalCountQuery = `INSERT INTO totalCount (${Object.keys(totalCount).join(', ').replace('Exclude', 'Exclude_url')}) values (${totalCountValues})`;
    // Execute the query to insert the data
    // console.log(totalCountQuery) 
    const [results] = await connection.execute(totalCountQuery);
    console.log('totalCountQuery result :', results.message)
    //adding keywords to db
    for (const keywordData of keywordsData) {
      const { customUniqueKey, domain, href, keyword } = keywordData;
      const query = `INSERT INTO hrefkeywords (customUniqueKey, domain, href, keyword) VALUES (?, ?, ?, ?)`;
      const values = [customUniqueKey, domain, href, keyword];
      await connection.execute(query, values);
      console.log(`Inserted: ${customUniqueKey}`);
    }


    console.log('All data inserted.');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (connection)
      connection.end();
  }


}







async function getDataFromMongoDB(Site) {

  //const uri = "mongodb+srv://vyosimmohammedk:Vyosim%402023@wowcategorize.opwfdbe.mongodb.net?retryWrites=true&w=majority";
  const uri = "mongodb://localhost:27017"
  const client = new MongoClient(uri);

  try {

    await client.connect();
    const db = client.db('wowcategorize');
    const collection = db.collection('categories');
    const data = await collection.findOne({ 'url': Site });
    return data;

  } catch (error) {

    console.error('Error occurred while retrieving data from MongoDB:', error);

  } finally {

    client.close();

  }
}

async function getDataFromMongoDBForBulkDomains(urlList) {
  //const uri = "mongodb+srv://vyosimmohammedk:Vyosim%402023@wowcategorize.opwfdbe.mongodb.net?retryWrites=true&w=majority";
  const uri = "mongodb://localhost:27017"
  const client = new MongoClient(uri);

  try {

    urlList = urlList.map(url => {
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        return "https://" + url;
      }
      return url = url.trim();
    })

    await client.connect();
    const db = client.db('wowcategorize');
    const collection = db.collection('categories');

    // let data=await fetchData(urlList, collection)
    // let urlsfound = data.map(obj => obj);

    let query = { 'url': { $in: urlList } };
    let dataForHttps = await collection.find(query).toArray();

    let urlsfound = dataForHttps.map(obj => obj['url']);
    let urlsToCrawl = urlList.filter(url => !urlsfound.includes(url));

    urlList = urlsToCrawl.map(url => {
      return url = url.replace('https', 'http');
    })
    query = { 'url': { $in: urlList } };
    let dataForHttp = await collection.find(query).toArray();

    let data = [...dataForHttps, ...dataForHttp]

    urlsfound = data.map(obj => obj['url']);
    urlsToCrawl = urlList.filter(url => !urlsfound.includes(url));

    //console.log('urls found : ', urlsfound)
    //console.log('urls to crawl : ', urlsToCrawl)
    return [data, urlsToCrawl];

  } catch (error) {

    console.error('Error occurred while retrieving data from MongoDB:', error);

  } finally {

    client.close();

  }
}


async function sendSiteHTMLDataToMongoDB(data) {
  //console.log(data.url)
  const site = data.url;
  const uri = "mongodb://localhost:27017"
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('wowcategorize');
    const collection = db.collection('siteData');

    const result = await collection.updateOne({ 'url': site }, { $set: data }, { upsert: true });
    //console.log(`Document updated for ${site} with id: ${result.upsertedId}`);

  } catch (error) {
    console.error('Error occurred while sending data to MongoDB:', error);
  } finally {
    client.close();
  }
}

async function getHTMLDataFromMongoDB(Site) {

  const uri = "mongodb://localhost:27017"
  const client = new MongoClient(uri);

  try {

    await client.connect();
    const db = client.db('wowcategorize');
    const collection = db.collection('siteData');
    const data = await collection.findOne({ 'url': Site });
    return data;

  } catch (error) {

    console.error('Error occurred while retrieving data from MongoDB:', error);

  } finally {

    client.close();

  }
}
module.exports = { getHTMLDataFromMongoDB, sendSiteHTMLDataToMongoDB, sendDataToMongoDB, getDataFromMongoDB, getDataFromMongoDBForBulkDomains }
