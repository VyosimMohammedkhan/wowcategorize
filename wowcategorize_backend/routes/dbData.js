const express = require('express');
const router = express.Router();
const { getDataFromMongoDB, sendDataToMongoDB, getHTMLDataFromMongoDB} = require("../work_modules/db")


router.get('/', async (req, res) => {

    try {
        let site = req.query.Site;
        let data = await getDataFromMongoDB(site);
        if(data){
            res.status(200).send(data);
        }else{
            console.log("no data in db")
            res.status(200).send({message:"failed"});
        }
        
    } catch {
        res.status(401).send({
            message: `Could not get data: ${err}`,
        });
    }

})

router.get('/HTMLdata', async (req, res) => {

    try {
        let site = req.query.Site;
        let data = await getHTMLDataFromMongoDB(site);
        if(data){
            console.log("sending htmldata for " , site)
            res.status(200).send(data);
        }else{
            console.log("no data in db")
            res.status(200).send({message:"failed"});
        }
  
    } catch {
        res.status(401).send({
            message: `Could not get data: ${err}`,
        });
    }

})


router.post('/', async (req, res) => {
    try{
        let data = req.body;
        await sendDataToMongoDB(data);
        res.status(200).send("success");
    }catch(err){
        res.status(200).send({
            message: `Could not push data: ${err}`,
        });
    }
})



module.exports = router;