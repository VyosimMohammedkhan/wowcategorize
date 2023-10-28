const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

let progress = 'loading ... '
async function setProgress(p) {
  progress = p;
}
async function getProgress() {
  return progress;
}

function addhttps(url) {
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return "https://" + url;
  }
  return url = url.trim();
}

async function crawler(url, ws) {
  console.log('got request for ' + url)

  let data = {};

  const browser = await puppeteer.launch({
    headless: true,
    devtools: false,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--fast-start", "--disable-extensions"],
  });
  try {

    const page = await browser.newPage();
    page.setDefaultTimeout(60 * 1000)
    page.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4182.0 Safari/537.36");

    ws.send(JSON.stringify({ message: 'Opening newpage ...' }));
    let isPageLoaded = await naviateToUrl(page, url)

    if (isPageLoaded.UrlWorking) {
      let excludePage = await isPageExclude(page);
      if (!excludePage.exclude) {

        ws.send(JSON.stringify({ message: "getting url List from page ..." }));
        let urlList = await getAllUrlsFromPage(page);
        ws.send(JSON.stringify({ message: "getting metaData from page ..." }));
        let metaData = await getMetaDataLanguageAndCopyright(page, url);
        data.urlList = urlList;
        data.metaData = metaData;
      } else {
        ws.send(JSON.stringify({ message: "page contains exclude keywords ..." }));

        data = ExcludeData(url, excludePage.wordmatched)
      }
      ws.send(JSON.stringify({ message: "completed crawling page ..." }));

    } else {
      data = { 'Site': url, 'error': isPageLoaded.errorMessage };
    }
  } catch (err) {
    console.log(err.message)
    data = { 'Site': url, 'error': isPageLoaded.errorMessage };
  } finally {
    await browser.close();
    return data;
  }
}

async function naviateToUrl(page, url) {
  let UrlWorking = true;
  let errorMessage = '';
  try {
    await page.goto(url, {
      networkIdleTimeout: 5000,
      waitUntil: 'domcontentloaded',
      timeout: 30000
    })
  } catch {
    try {
      url = url.replace('https', 'http');
      await page.goto(url, {
        networkIdleTimeout: 5000,
        waitUntil: 'domcontentloaded',
        timeout: 30000
      })
    } catch (error) {
      UrlWorking = false;
      errorMessage = error.message;
      console.log(errorMessage)
    }
  }
  return { UrlWorking, errorMessage };
}

async function isPageExclude(page) {
  let keywords = require("./keywords.json");
  const content = await page.content();
  let isexclude = false;
  let excludewords = keywords.Exclude;
  let wordmatched = '';
  for (let word of excludewords) {
    if (content.includes(word)) {
      isexclude = true;
      wordmatched = word;
      break;
    }
  }

  return { exclude: isexclude, wordmatched: wordmatched };
}

async function redirectedURL(page, url) {

  const givenUrl = new URL(url).hostname
  const currentUrl = new URL(page.url()).hostname 
  if (currentUrl.includes(givenUrl)) {return "" }
  else { return page.url() }
}

async function getAllUrlsFromPage(page) {
  //console.log("started getting all urls from page")
  const links = await page.$$('a');
  
  const uniqueMap = new Map();

  for (const link of links) {
    const href = await link.evaluate(node => node.href);
    const text = await link.evaluate(node => node.textContent.replace(/\n|\t|\r|\r\n/g, "").replace(/\s+/g, " ").trim());
 
    const key = `${href}-${text}`;
    if(typeof href === 'string'){
      uniqueMap.set(key, [href, text]);
    }
    
  }

  const uniqueUrls = Array.from(uniqueMap.values());
  // console.log("finished getting all urls from page")
  return uniqueUrls;
}

async function getMetaDataLanguageAndCopyright(page, url) {
  //console.log("started getting metadata")
  let metanamesLanguage = {};
  //console.log("started getting metanames")
  let pagemetaNames = await getMetaNames(page);
  //console.log("got metanames")
  let pageLanguage = await getLanguages(page);
  //console.log("got metaLanguages")
  metanamesLanguage.Site = url;
  //console.log("set Site property")
  for (let [key, value] of Object.entries(pagemetaNames)) {
    metanamesLanguage[`${key}`] = value;
  };
  for (let [key, value] of Object.entries(pageLanguage)) {
    metanamesLanguage[`${key}`] = value;
  };

  try {// to handle the issue with sites like https://bayareawindowpros.com/ that give weird error while getting copyright
    metanamesLanguage.copyright = await getCopyrightText(page);
  } catch {
    metanamesLanguage.copyright = "Not Found!"
  }

  // console.log("finished getting metadata")
  return metanamesLanguage;
}

async function countMatchingKeywordsFromGivenSetOfLinks(PageUrlsAndUrlTexts, url) {

  let csvData = [];
  for (const UrlsAndUrlText of PageUrlsAndUrlTexts) {
    try {
      const keywordMatchCountData = await checkKeywordsOnUrl(`${UrlsAndUrlText}`);
      keywordMatchCountData.Site = url
      csvData.push(keywordMatchCountData);
    } catch (error) {
      console.log(`failed to classify ${url}`)
      console.log(error)
      continue;
    }
  }
  return csvData;
}

async function checkKeywordsOnUrl(urlHrefAndTextArray) {
  let keywords = require("./keywords.json");
  const urlAndTextArray = urlHrefAndTextArray.split(",");
  let Categories = { "HREF": urlAndTextArray[0], "linkText": urlAndTextArray[1].replace(/\r?\n|\r/g, ""), "About": "", "Contact": "", "Team": "", "Investor": "", "Product": "", "Career": "", "News": "", "ECommerce": "", "Resources": "", "Pricing": "", "Social": "", "Portal": "", "Legal": "", "Blog": "", "keywordFound": "None" };
  let keywordsArry = Object.entries(keywords);
  Categories.linkText = Categories.linkText.replace(/\s+/g, ' ').trim();
  for (let [category, keywordset] of keywordsArry) {
    const word = category.toString()
    // let count=Categories[`${word}`];
    for (let keyword of keywordset) {
      if (Categories.HREF.toLowerCase().includes(keyword.toLowerCase()) || Categories.linkText.toLowerCase().includes(keyword.toLowerCase())) {
        Categories[`${word}`] = 1;
        if (Categories.keywordFound == "None") {
          Categories.keywordFound = keyword;
        } else {
          Categories.keywordFound = Categories.keywordFound + ", " + keyword;
        }

      }
    }
  }
  return Categories;
}

async function getMetaNames(page) {

  let getMetaData = await page.evaluate(() => {
    //console.log('creating map')
    let metaDataMap = {};
    //console.log('created map')
    let titleContent = document.title;
    metaDataMap.metaTitleContent = titleContent ? titleContent : null;

    let httpContenType = document.querySelector('meta[http-equiv="Content-Type"]')
    metaDataMap.metaContenType = httpContenType ? httpContenType.getAttribute('content') : null;

    let keywords = document.querySelector('meta[name="keywords"]')
    metaDataMap.metaKeywords = keywords ? keywords.getAttribute('content') : null;

    let desc = document.querySelector('meta[name="description"]')
    metaDataMap.metaDescription = desc ? desc.getAttribute('content') : null;

    let ogTitle = document.querySelector('meta[property="og:title"]')
    metaDataMap.metaOgTitle = ogTitle ? ogTitle.getAttribute('content') : null;

    let ogDescription = document.querySelector('meta[property="og:description"]')
    metaDataMap.metaOgDescription = ogDescription ? ogDescription.getAttribute('content') : null;

    let ogUrl = document.querySelector('meta[property="og:url"]')
    metaDataMap.metaOgUrl = ogUrl ? ogUrl.getAttribute('content') : null;

    let ogSitename = document.querySelector('meta[property="og:site_name"]')
    metaDataMap.metaOgSitename = ogSitename ? ogSitename.getAttribute('content') : null;

    let profileUsername = document.querySelector('meta[property="profile:username"]')
    metaDataMap.metaProfileUsername = profileUsername ? profileUsername.getAttribute('content') : null;

    let profileFirstname = document.querySelector('meta[property="profile:first_name"]')
    metaDataMap.metaProfileFirstname = profileFirstname ? profileFirstname.getAttribute('content') : null;

    let profileLastname = document.querySelector('meta[property="profile:last_name"]')
    metaDataMap.metaprofileLastname = profileLastname ? profileLastname.getAttribute('content') : null;

    return metaDataMap;
  })
  return getMetaData;
}

async function getLanguages(page) {

  let getLanguagesData = await page.evaluate(() => {
    let languageDataMap = {}

    let charSet = document.querySelector('meta[charset=""]')
    languageDataMap.languageCharSet = charSet ? charSet.getAttribute('charset') : '';

    let contentLanguage = document.querySelector('meta[http-equiv="Content-Language"]')
    languageDataMap.contentLanguage = contentLanguage ? contentLanguage.getAttribute('content') : '';

    let languageLocale = document.querySelector('meta[property="og:locale"]')
    languageDataMap.languageLocale = languageLocale ? languageLocale.getAttribute('content') : '';

    let htmlLang = document.querySelector('html')
    languageDataMap.languageHtmtlLang = htmlLang ? htmlLang.getAttribute('lang') : '';

    return languageDataMap;
  })
  return getLanguagesData;
}

async function getCopyrightText(page) {
  //console.log('inside copyright method');
  let elementsWithSymbol = await page.$x("//*[contains(text(), '©')]");
  if (elementsWithSymbol.length > 0) {
    let textContent = await page.evaluate(element => element.textContent, elementsWithSymbol[0]);
    corrections = {
      [/\s+/g]: " ",
      [/\r?\n|\r/g]: ""
    }
    textContent = textContent.replace([/\s+/g] | [/\r?\n|\r/g], matched => corrections[matched]);
    textContent = copyrightFormatter(textContent);
    return textContent.replace('undefined', '0');
  } else {
    return "NOT FOUND!";
  }
}

function copyrightFormatter(inputText) {

  const $ = cheerio.load(inputText);
  let extractedText = '';

  $('body').contents().each(function () {
    const text = $(this).text();
    //console.log(text)
    if (text.includes('©')) {
      extractedText = text;
      return false;
    }
  });
  return extractedText;
}

function countTotalperCategory(data) {
  let countArray = {
    "About": 0, "Contact": 0, "Team": 0, "Investor": 0, "Product": 0, "Career": 0, "News": 0, "ECommerce": 0,
    "Resources": 0, "Pricing": 0, "Social": 0, "Portal": 0, "Legal": 0, "Blog": 0, "Exclude": 0
  };

  data.forEach((webpage) => {
    webpage.About == 1 ? countArray.About++ : null;
    webpage.Contact == 1 ? countArray.Contact++ : null;
    webpage.Team == 1 ? countArray.Team++ : null;
    webpage.Investor == 1 ? countArray.Investor++ : null;
    webpage.Product == 1 ? countArray.Product++ : null;
    webpage.Career == 1 ? countArray.Career++ : null;
    webpage.News == 1 ? countArray.News++ : null;
    webpage.ECommerce == 1 ? countArray.ECommerce++ : null;
    webpage.Resources == 1 ? countArray.Resources++ : null;
    webpage.Pricing == 1 ? countArray.Pricing++ : null;
    webpage.Social == 1 ? countArray.Social++ : null;
    webpage.Portal == 1 ? countArray.Portal++ : null;
    webpage.Legal == 1 ? countArray.Legal++ : null;
    webpage.Blog == 1 ? countArray.Blog++ : null;
  })
  return countArray;
}

function ExcludeData(site, wordmatched) {
  return {
    id: '',
    url: site,
    categoryData: [{
      HREF: "",
      linkText: "",
      About: "",
      Contact: "",
      Team: "",
      Investor: "",
      Product: "",
      Career: "",
      News: "",
      ECommerce: "",
      Resources: "",
      Pricing: "",
      Social: "",
      Portal: "",
      Legal: "",
      Blog: "",
      keywordFound: wordmatched
    }],
    totalCount: {
      About: 0,
      Contact: 0,
      Team: 0,
      Investor: 0,
      Product: 0,
      Career: 0,
      News: 0,
      ECommerce: 0,
      Resources: 0,
      Pricing: 0,
      Social: 0,
      Portal: 0,
      Legal: 0,
      Blog: 0,
      Exclude: 1
    },
    metaData: {
      Site: site,
      metaTitleContent: '',
      metaContenType: '',
      metaKeywords: '',
      metaDescription: '',
      metaOgTitle: '',
      metaOgDescription: '',
      metaOgUrl: '',
      metaOgSitename: '',
      metaProfileUsername: '',
      metaProfileFirstname: '',
      metaprofileLastname: '',
      languageCharSet: '',
      contentLanguage: '',
      languageLocale: '',
      languageHtmtlLang: '',
      copyright: ''
    }
  }
}

function createExcludeData(url, excludePage) {
  let excludeData = ExcludeData(url, excludePage.wordmatched);
  // let dataObject;
  // dataObject[url] = excludeData;
  return excludeData;
}

module.exports = { redirectedURL, createExcludeData, getProgress, setProgress, addhttps, crawler, ExcludeData, isPageExclude, countTotalperCategory, getMetaDataLanguageAndCopyright, getAllUrlsFromPage, countMatchingKeywordsFromGivenSetOfLinks, getMetaNames, getLanguages, getCopyrightText }