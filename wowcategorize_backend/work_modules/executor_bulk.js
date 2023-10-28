const { redirectedURL, addhttps, isPageExclude, getAllUrlsFromPage, getMetaDataLanguageAndCopyright } = require('./helper_function')
const { Cluster } = require('puppeteer-cluster')
const { getDataFromMongoDBForBulkDomains, sendSiteHTMLDataToMongoDB } = require('./db');
const vanillaPuppeteer = require('puppeteer')
const { addExtra } = require('puppeteer-extra')
const Stealth = require('puppeteer-extra-plugin-stealth')
const blockresources = require('puppeteer-extra-plugin-block-resources')
const anonymize_ua = require('puppeteer-extra-plugin-anonymize-ua')

async function getDataForBulkUrl(urlbatch, recrawl, ws) {
     let dataObject = {};
     let retriedUrls = []
     let urlList = urlbatch;
     let tasks = urlList.length;
     let progressPercentPerUrl = 100.0 / tasks
     let currentProgressPercent
     tasks == 1 ? currentProgressPercent = 25 : currentProgressPercent = 0.1
     await ws.send(JSON.stringify({ taskcount: currentProgressPercent }));

     //if recrawl is NOT checked, data will be fetched from database
     if (recrawl == false) {
          await ws.send(JSON.stringify({ progressStatus: "Checking in Database for given Domains..." }))
          let dataFromDB = await getDataFromMongoDBForBulkDomains(urlList)
          urlList = dataFromDB[1]
          //await ws.send(JSON.stringify(dataFromDB[0]));
          let dataPercentFromDB = currentProgressPercent + ((Object.keys(dataFromDB[0])).length) * progressPercentPerUrl

          //await sendDataInChunks(ws, dataFromDB[0], dataPercentFromDB)
          await ws.send(JSON.stringify(dataFromDB[0]));
          currentProgressPercent = dataPercentFromDB;
          await ws.send(JSON.stringify({ taskcount: currentProgressPercent }));
     }

     await ws.send(JSON.stringify({ progressStatus: "preparing to crawl..." }))

     //setting puppeteer plugins
     const puppeteer = addExtra(vanillaPuppeteer)
     //puppeteer.use(Stealth())
     puppeteer.use(blockresources({
          blockedTypes: new Set(['image', 'stylesheet', 'media', 'other', 'font', 'texttrack', 'eventsource', 'websocket', 'manifest'])
     }))
     //puppeteer.use(Adblocker({ blockTrackers: true }))
     puppeteer.use(anonymize_ua())
     //cluster is launched
     const cluster = await Cluster.launch({
          puppeteer,
          concurrency: Cluster.CONCURRENCY_CONTEXT,
          timeout: 5 * 60 * 1000,
          maxConcurrency: 8,
          puppeteerOptions: {
               headless: true,
               devtools: false,
               args: ["--no-sandbox", "--disable-setuid-sandbox", "--fast-start", "--disable-extensions"]
               // '--user-agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4182.0 Safari/537.36"'],
          }
     });


     await cluster.task(async ({ page, data: url }) => {
          try {

               await page.setRequestInterception(true);

               // page.on('request', (req) => {
               //      if (req.resourceType() === 'image') {
               //           req.abort();
               //      }
               //      else {
               //           req.continue();
               //      }
               // })
               //setting userAgent and adding https to url
               //await page.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4182.0 Safari/537.36");
               url = addhttps(url)
               let siteHTML = {} // this is where we will save all siteData to send to db
               let metadataFromSubpages = {};
               try {
                    await ws.send(JSON.stringify({ progressStatus: `navigating to ${url}...` }))
                    let isPageLoaded = await navigateToUrl(page, url);
                    url = isPageLoaded.url;
                    //await delay(10*1000)
                    //if page is loaded properly with https crawl and get data from it
                    if (isPageLoaded.UrlWorking) {
                         await page.evaluate(() => {
                              window.scrollTo(0, window.document.body.scrollHeight);
                         });
                         await ws.send(JSON.stringify({ progressStatus: `${url} loaded, checking for Exclude keywords...` }))

                         let excludePage = await isPageExclude(page);
                         // if (!excludePage.exclude) {
                         await ws.send(JSON.stringify({ progressStatus: ` getting data from ${url}...` }))
                         dataObject[url] = await crawl(page, url, excludePage.exclude);
                         try {// dont want sitedata errors to affect categorization process
                              // await ws.send(JSON.stringify({ progressStatus: `navigating to subpage ${url}...` }))
                              //siteHTML = await getSiteData(page, url)
                              //await sendSiteHTMLDataToMongoDB(siteHTML)

                              // let shortlistedSubUrls = await findShortlistedUrls(dataObject[url].urlList, url)
                              // for (let [subUrl, linkText] of shortlistedSubUrls) {
                              //      await ws.send(JSON.stringify({ progressStatus: `navigating to subpage ${subUrl}...` }))
                              //      await navigateToUrl(page, subUrl);
                              //      const subpageMetaData = await getMetaDataLanguageAndCopyright(page, url);
                              //      metadataFromSubpages[linkText] = subpageMetaData
                              // }
                              // dataObject[url].metadataFromSubpages = metadataFromSubpages
                         } catch (err) {
                              console.log(err.message)
                              //await ws.send(JSON.stringify({ progressStatus: `couldn't download HTMLdata for ${url}...` }))
                         }

                         // } else {
                         //      await ws.send(JSON.stringify({ progressStatus: `found exclude keywords on ${url}, not crawling...` }))
                         //      dataObject[url] = createExcludeData(url, excludePage)
                         // }
                         //otherwise change https to http and add to queue. if already http then mark as failed url with its error message
                    } else {
                         if ((isPageLoaded.url).includes('https')) { //&& isPageLoaded.errorMessage.includes("NAME_NOT_RESOLVED")) {
                              await ws.send(JSON.stringify({ progressStatus: `${url} is not working with https...will try with http again...` }))
                              cluster.queue(url.replace('https', 'http'));
                              tasks++;
                              currentProgressPercent -= progressPercentPerUrl
                              await ws.send(JSON.stringify({ taskcount: currentProgressPercent }));
                         } else {
                              await ws.send(JSON.stringify({ progressStatus: `Failed to load ${url}...` }))
                              dataObject[url] = [{ 'Site': url, 'error': isPageLoaded.errorMessage }];
                         }
                    }

                    //decrement task count and send to frontend 
                    tasks--;

                    currentProgressPercent += progressPercentPerUrl
                    await ws.send(JSON.stringify({ taskcount: currentProgressPercent }));
                    //if there is any data to send then send it.
                    if (dataObject[url]) {
                         //await ws.send(JSON.stringify({ progressStatus: `finished crawling ${url}...` }))
                         await ws.send(JSON.stringify([dataObject[url]]));
                    }
               } catch (err) {
                    tasks--;
                    currentProgressPercent += progressPercentPerUrl
                    await ws.send(JSON.stringify({ taskcount: currentProgressPercent }));
                    //if execution context was dstroyed then add the task back to queue and increment task count
                    if (err.message.includes("Execution context was destroyed") && !retriedUrls.includes(page.url())) {
                         retriedUrls.push(page.url())
                         await ws.send(JSON.stringify({ progressStatus: `unexpected error occured while crawling ${url}...adding for recrawl...` }))
                         cluster.queue(page.url())
                         tasks++;
                         currentProgressPercent -= progressPercentPerUrl
                         await ws.send(JSON.stringify({ taskcount: currentProgressPercent }));
                         // await ws.send(JSON.stringify([[{ 'Site': url, 'error': err.message }]]));
                         //otherwise marks as failed url and send with its error message
                    } else {
                         await ws.send(JSON.stringify({ progressStatus: `failed to crawl ${url}...` }))
                         await ws.send(JSON.stringify([[{ 'Site': url, 'error': err.message }]]));
                    }
                    console.log(err)
               }
          } catch (error) {
               console.log('puppeteer-cluster task :', error.message)
          }
     })



     //adding urls to queue
     for (let url of urlList) {
          cluster.queue(url);
     }

     await cluster.idle();
     await ws.send(JSON.stringify({ progressStatus: `All done...` }))//just before closing the cluster
     await cluster.close();
}


//work functions ------------------------------------------------------------------------------------------------------------------------
async function navigateToUrl(page, url) {
     let UrlWorking = true;
     let errorMessage = '';
     try {
          await page.goto(url, {
               networkIdleTimeout: 60000,
               waitUntil: 'networkidle2',
               timeout: 60 * 1000
          })
     } catch (error) {
          UrlWorking = false;
          errorMessage = error.message;
          console.log(errorMessage)
     }

     return { UrlWorking, errorMessage, url };
}

async function navigateToUrlAndWaitUntilDomcontentloaded(page, url) {
     let UrlWorking = true;
     let errorMessage = '';
     try {
          await page.goto(url, {
               networkIdleTimeout: 5000,
               waitUntil: 'domcontentloaded',
               timeout: 60 * 1000
          })
     } catch (error) {
          UrlWorking = false;
          errorMessage = error.message;
          console.log(errorMessage)
     }

     return { UrlWorking, errorMessage, url };
}


async function crawl(page, url, exclude) {
     const urlList = await getAllUrlsFromPage(page);
     const redirectedUrl = await redirectedURL(page, url)
     const metaData = await getMetaDataLanguageAndCopyright(page, url);
     let isEnglish = await iswebPageEnglish(metaData, page)
     let dataObject = {};
     dataObject.urlList = urlList
     dataObject.metaData = metaData;
     dataObject.exclude = exclude;
     dataObject.redirectedUrl = redirectedUrl;
     dataObject.isEnglish = isEnglish
     dataObject.CrawledData = true;
     return dataObject
}


//method to find whether  page is english
const langdetect = require('langdetect');

async function iswebPageEnglish(metaData, page) {
     let ispageEnglish = true;

     if ((metaData.contentLanguage?.includes('en')) ||
          (metaData.languageLocale?.includes('en')) ||
          (metaData.languageHtmtlLang?.includes('en'))) {
          ispageEnglish = true;
     } else {
          ispageEnglish = false
     }

     if (!metaData.contentLanguage && !metaData.languageLocale && !metaData.languageHtmtlLang) {
          try {
               const textContent = await page.$eval('body', body => body.textContent); 
               if (textContent.trim() !== '') {
                    textContent = textContent
                         .replace(/^[^\S\r\n]+/gm, '')
                         .replace(/^\s*$/gm, '')
                         .replace(/<[^>]*>/g, '');

                    const detectedLanguage = langdetect.detectOne(textContent + ' ');// adding space in case textcontent is null
                    if (detectedLanguage == "en") {
                         ispageEnglish = true
                    } else {
                         ispageEnglish = false
                    }
               }
          } catch {
               ispageEnglish = true
          }
     }
     return ispageEnglish
}

//method to get keywords from json
const fs = require('fs');
const util = require('util');
const readFileAsync = util.promisify(fs.readFile);

async function getkeywordsfromjson() {
     try {
          const data = await readFileAsync('./work_modules/keywords.json', 'utf8');
          const keywords = JSON.parse(data);
          return keywords;
     } catch (err) {
          console.error('Error reading or parsing JSON file:', err);
          return {};
     }
}

function filterKeywordsForGetSiteData(keywords) {
     const filteredEntries = Object.entries(keywords).filter(([key]) =>
          key === 'About' || key === 'Contact' || key === 'Team' || key === 'Product'
     );

     // Create a new object from the filtered entries
     const filteredKeywords = Object.fromEntries(filteredEntries);
     return filteredKeywords
}

//method for downloading site html data. need to refactor
async function getSiteData(page, domainUrl) {
     let url = domainUrl
     let siteData = { url: url }

     let keywords = {};
     await getkeywordsfromjson().then((keywordsfromjson) => keywords = keywordsfromjson);
     keywords = filterKeywordsForGetSiteData(keywords)
     //getting anchorTags and selecting the suburls that contain keywords
     let anchorTags = await page.$$('a');
     let subUrls = await findHrefsContainingKeywords(anchorTags, keywords, url)
     //getting html data of homepage and putting it to siteData
     let homePageHtmlData = await getHtmlDataFromPage(page)
     siteData.homePage = homePageHtmlData;

     //getting html for selected suburls
     for (let [subUrl, linkText] of subUrls) {
          await navigateToUrl(page, subUrl);
          let subPageHtmlData = await getHtmlDataFromPage(page);
          let SubPagePath = subUrl.replace(url, "").replace('/', '')
          siteData[`${linkText}`] = subPageHtmlData;
     }
     return siteData
}

async function findHrefsContainingKeywords(anchorTags, keywords, url) {

     let subUrls = new Set();
     for (let anchorTag of anchorTags) {
          let href = await anchorTag.getProperty('href');
          let hrefValue = await href.jsonValue();
          const regex = new RegExp(`-|${url}|\\\/`, 'g')
          hrefValue = new URL(hrefValue, url).href
          let linkText = await (await anchorTag.getProperty('textContent')).jsonValue();
          linkText = linkText.replace(/\r?\n|\r/g, "").replace(/\s+/g, ' ').replaceAll('.', '').toLowerCase().trim()

          let flattenedKeywords = [...Object.values(keywords)].flat()
          for (let keyword of flattenedKeywords) {
               if ((linkText.includes(keyword.replace(' ', '').toLowerCase()) || hrefValue.toLowerCase().replace(regex, '').includes(keyword.replace(' ', '').toLowerCase())) && ![...subUrls].flat().includes(hrefValue) && !hrefValue.toLowerCase().replace(regex, '').includes("javascript:void(0)") && !hrefValue.includes("mailto:") && !hrefValue.includes("tel:")) {
                    subUrls.add([hrefValue, linkText]);
               }
          }
     }
     return subUrls;
}

async function findShortlistedUrls(subUrlList, url) {

     let keywords = {};
     await getkeywordsfromjson().then((keywordsfromjson) => keywords = keywordsfromjson);
     keywords = filterKeywordsForGetSiteData(keywords)

     let subUrls = new Set();
     for (let [hrefValue, linkText] of subUrlList) {
          const regex = new RegExp(`-|${url}|\\\/`, 'g')
          linkText = linkText.replace(/\r?\n|\r/g, "").replace(/\s+/g, ' ').replaceAll('.', '').toLowerCase().trim()

          let flattenedKeywords = [...Object.values(keywords)].flat()

          for (let keyword of flattenedKeywords) {
               if ((linkText.includes(keyword.replace(' ', '').toLowerCase()) || hrefValue.toLowerCase().replace(regex, '').includes(keyword.replace(' ', '').toLowerCase())) && ![...subUrls].flat().includes(hrefValue) && !hrefValue.toLowerCase().replace(regex, '').includes("javascript:void(0)") && !hrefValue.includes("mailto:") && !hrefValue.includes("tel:")) {
                    subUrls.add([hrefValue, linkText]);
               }
          }
     }
     subUrls = removeSocialLinksFromHrefs(subUrls)
     return subUrls;
}

function removeSocialLinksFromHrefs(urlList) {
     //urlList //= urlList.filter(item => !item[0].replace(/^(https?:\/\/)?(www\.)?/i, '').includes(url.replace(/^(https?:\/\/)?(www\.)?/i, '')) && !item[0].includes("javascript:"))
     let socialKeywords = ['Facebook', 'Twitter', 'Instagram', 'Youtube', 'LinkedIn', 'Houzz', 'Pinterest', 'Reddit']
     const regex = new RegExp(socialKeywords.join("|"), "i");
     const filteredArray = [...urlList].filter(([url, linktext]) => !regex.test(url));

     return filteredArray;
}

async function getHtmlDataFromPage(page) {
     //let content = await page.evaluate(() => {
     let content = await page.evaluate(() => {
          return document.body.outerHTML;
     });
     //let content = await page.content()
     // let content = '';
     // if (body.innerHTML) {
     //      content = body.innerHTML;
     // } else if (document.querySelector('frameset')) {
     //      content = document.querySelector('frameset').innerHTML;
     // }
     // for removing indentation
     content = content.replace(/^[^\S\r\n]+/gm, '');
     //for removing comments
     content = content.replace(/<!--[\s\S]*?-->/g, '');
     // for removing scripts and style tags
     content = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
     // content = content.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
     // to remove onload attribute.(otherwise function not found error may occur on rendering)
     content = content.replace(/onload\s*=\s*['"][^'"]*['"]/gi, '');
     return content;
     // },);
     //return content;
}

async function sendDataInChunks(ws, dataFromDB, dataPercentFromDB) {
     const chunkSize = 50;
     const dataLength = dataFromDB.length;
     let percentPerChunk = dataPercentFromDB / chunkSize
     let currentProgressPercent = 0;
     for (let i = 0; i < dataLength; i += chunkSize) {
          const chunk = dataFromDB.slice(i, i + chunkSize);
          currentProgressPercent += percentPerChunk;
          console.log(currentProgressPercent)
          await ws.send(JSON.stringify(chunk));
          await ws.send(JSON.stringify({ taskcount: currentProgressPercent }));
          await delay(100)
     }
}

function delay(time) {
     return new Promise(function (resolve) {
          setTimeout(resolve, time)
     })
}
module.exports = { getDataForBulkUrl };
