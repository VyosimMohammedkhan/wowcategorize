import { ProgressBar } from "react-bootstrap";
import { Tabs, Tab } from 'react-bootstrap';
import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import "bootstrap/js/src/collapse.js";
import 'ag-grid-community/styles/ag-theme-alpine.css';
import 'ag-grid-community'
import axios from 'axios'
import Papa, { parse } from "papaparse";
import CustomTooltipForCategories from '../tooltips/categoriesTooltip'
import CustomTooltipForMetaData from '../tooltips/metadataTooltip';
import CustomTooltipForTotalCount from "../tooltips/externalDomainsTooltip";
import 'ag-grid-enterprise';
import GetURI from '../components/URI';
// const natural = require('natural');
// const tokenizer = new natural.WordTokenizer();
// const stopwords = require('natural').stopwords;
let uri = GetURI();// using this method because uri start with http for some calls and ws for some calls. need to think how to use proxy in this case



export default function CrawlMany() {
  //to hide resizeObservor error which is coming because of rendering HTML data of domains
  useEffect(() => {
    window.addEventListener('error', e => {
      if (e.message === 'ResizeObserver loop limit exceeded' || e.message.includes('ResizeObserver loop completed with undelivered notifications')) {
        const resizeObserverErrDiv = document.getElementById(
          'webpack-dev-server-client-overlay-div'
        );
        const resizeObserverErr = document.getElementById(
          'webpack-dev-server-client-overlay'
        );
        if (resizeObserverErr) {
          resizeObserverErr.setAttribute('style', 'display: none');
        }
        if (resizeObserverErrDiv) {
          resizeObserverErrDiv.setAttribute('style', 'display: none');
        }
      }
    });
  }, []);
  //to make urls hyperLink--------------------------------------------------------
  const UrlRenderer = ({ value }) => {
    const url = value;

    const handleLinkClick = event => {
      event.stopPropagation();
    };

    return (
      <a href={url} target="_blank" onClick={handleLinkClick}>
        {url}
      </a>
    );
  };

  //put usestates here ---------------------------------------------------------------
  const [rowClickLoading, setRowClickLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [taskcount, setTaskcount] = useState("")
  const [progressPercentage, setProgressPercentage] = useState(1)
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [rowClicked, setRowClicked] = useState(false);
  const [submitClicked, setSubmitClicked] = useState(false);
  const [queue, setQueue] = useState([]);
  const [isChecked, setIsChecked] = useState(false);
  const [rowClickMessage, setRowClickMessage] = useState("");
  const [keywords, setKeywords] = useState([]);
  const [matchCountRowData, setMatchCountRowData] = useState([]);
  const [categoryRowData, setCategoryRowData] = useState();
  const [badDomainsRowData, setBadDomainsRowData] = useState([])
  const [keywordsTableRowData, setKeywordsTableRowData] = useState([])
  const [metadataRowData, setMetadataRowData] = useState([]);
  const [htmlData, setHTMLdata] = useState({ data: "Not Found!" })
  const [progressStatus, setProgressStatus] = useState("")
  const [cols, setCols] = useState(30);
  const [activeTab, setActiveTab] = useState(0);
  const [iframSource, setiframeSource] = useState('')

  let totalCountGridApiRef = useRef(null);
  const failedDomainsGridRef = useRef();
  let keywordsGridApiRef = useRef(null)
  // const onTotalCountGridReady = (params) => {
  //   totalCountGridApiRef.current = params.api;
  // };

  const defaultColDefForMatchCount = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    editable: true,
    cellStyle: { textAlign: "left" },
    enableRowGroup: true,
    aggFunc: 'sum',
    // comparator: (valueA, valueB, nodeA, nodeB, isInverted) => {
    //   const isGrouped = nodeA.group && nodeB.group;

    //   if (isGrouped) {
    //     // Extract the group counts from the nodes
    //     const countA = nodeA.childrenAfterGroup.length;
    //     const countB = nodeB.childrenAfterGroup.length;

    //     if (countA === countB) {
    //       return 0;
    //     } else {
    //       return (countA < countB ? -1 : 1) * (isInverted ? -1 : 1);
    //     }
    //   } else {
    //     // Use the default comparator for ungrouped data
    //     return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
    //   }
    // },
    tooltipComponent: CustomTooltipForTotalCount
  }), []);

  const defaultColDefForCategories = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    editable: true,
    wrapText: true,
    cellStyle: { textAlign: "center" },
    tooltipComponent: CustomTooltipForCategories,
  }), []);

  const defaultColDefForBadDomains = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    editable: true,
    wrapText: true,
  }), []);

  const defaultColDefForMetaData = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    editable: true,
    tooltipComponent: CustomTooltipForMetaData,
    // autoHeight: true,
  }), []);


  const metaDataColumnDefs = [
    { field: 'metaTagName', tooltipField: 'metaTagName', width: 150, headerClass: 'custom-header-class' },
    { field: 'value', tooltipField: 'value', wrapText: true, headerClass: 'custom-header-class' }
  ]

  const badDomainsColumnDefs = [
    { headerName: "Row", valueGetter: "node.rowIndex + 1", pinned: 'left', width: 90 },
    { field: 'Site', headerClass: 'custom-header-class', cellRendererFramework: UrlRenderer },
    { field: 'error', }
  ]

  const isNonEnglishCustomCellRenderer = ({ value }) => {
    return value ? '' : 1;
  };
  
  
  const matchCountColumnDefs = [
    { headerName: "Row", valueGetter: "node.rowIndex + 1", pinned: 'left', width: 70, aggFunc: null },
    { field: 'Site', pinned: 'left', cellRendererFramework: UrlRenderer, aggFunc: null, },
    { field: 'About', width: 100, headerClass: 'custom-header-class', },
    { field: 'Contact', width: 120, headerClass: 'custom-header-class' },
    { field: 'Team', width: 100, headerClass: 'custom-header-class' },
    { field: 'Investor', width: 105, headerClass: 'custom-header-class' },
    { field: 'Product', width: 105, headerClass: 'custom-header-class' },
    { field: 'Career', width: 100, headerClass: 'custom-header-class' },
    { field: 'News', width: 100, headerClass: 'custom-header-class' },
    { field: 'ECommerce', width: 130, headerClass: 'custom-header-class' },
    { field: 'Resources', width: 120, headerClass: 'custom-header-class' },
    { field: 'Pricing', width: 105, headerClass: 'custom-header-class' },
    { field: 'Social', width: 100, headerClass: 'custom-header-class' },
    { field: 'Portal', width: 100, headerClass: 'custom-header-class' },
    { field: 'Legal', width: 100, headerClass: 'custom-header-class' },
    { field: 'Blog', width: 100, headerClass: 'custom-header-class' },
    { field: 'Copyright', width: 100, headerClass: 'custom-header-class' },
    { field: 'Exclude', width: 100, headerClass: 'custom-header-class' },
    { field: 'Total_Count', width: 120, headerClass: 'custom-header-class', cellStyle: { textAlign: "center" } },
    { field: 'Total_Single_Count', width: 160, headerClass: 'custom-header-class', cellStyle: { textAlign: "center" } },
    { field: 'Unique_internal_links_Count', width: 180, headerClass: 'custom-header-class', cellStyle: { textAlign: "center" } },
    { field: 'Unique_External_Domains_Count', tooltipField: 'Unique_External_Domains_Count', width: 180, headerClass: 'custom-header-class', cellStyle: { textAlign: "center" } },
    { field: 'is_nonEnglish', headerClass: 'custom-header-class', cellStyle: { textAlign: "center" } , cellRendererFramework: isNonEnglishCustomCellRenderer},
    { field: 'redirectedUrl', headerClass: 'custom-header-class', aggFunc: null },
    { field: 'ExternalDomains', headerClass: 'custom-header-class', hide: 'true' }
  ];

  const categoryColumnDefs = [
    //{ field: 'Site' },
    { headerName: "Row", valueGetter: "node.rowIndex + 1", pinned: 'left', width: 70, aggFunc: null },
    { field: 'HREF', tooltipField: 'HREF', pinned: 'left', cellStyle: { textAlign: "left" } },
    { field: 'linkText', tooltipField: 'linkText', pinned: 'left', cellStyle: { textAlign: "left" } },
    { field: 'About', width: 100, filter: 'agTextColumnFilter', filterParams: { buttons: ['reset', 'apply'], }, },
    { field: 'Contact', width: 110 },
    { field: 'Team', width: 90 },
    { field: 'Investor', width: 110 },
    { field: 'Product', width: 110 },
    { field: 'Career', width: 100 },
    { field: 'News', width: 90 },
    { field: 'ECommerce', width: 130 },
    { field: 'Resources', width: 120 },
    { field: 'Pricing', width: 100 },
    { field: 'Social', width: 100 },
    { field: 'Portal', width: 100 },
    { field: 'Legal', width: 90 },
    { field: 'Blog', width: 90 },
    { field: 'keywordFound', tooltipField: 'keywordFound', cellStyle: { textAlign: "left" } },
  ];


  //to get updated keywords from server
  useEffect(() => {
    const fetchData = async () => {
      try {
        const request = { url: `${uri}/keywords`, method: 'GET' };
        const response = await axios(request);
        setKeywords(response.data);
        //console.log("keywords:", response.data);
      } catch (err) {
        console.log("Error while getting master keywords", err);
        setKeywords([]);
      }
    };

    fetchData();
  }, []);

  //to send calculated totalcount data to DB
  useEffect(() => {
    try {
      // console.log("queue size : ", queue.length)
      if (queue.length > 0) {
        console.log("sending queued data to db")
        let data = queue.pop()
        sendDataToDB(data)
        setQueue(data => data.slice(1))
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }, [queue]);


  //to chnage column size of textarea based on screen size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 992) {
        setCols(30);
      } else if (window.innerWidth >= 992) {
        setCols(120);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  //recrawl checkbox
  const handleCheckboxChange = () => {
    setIsChecked(!isChecked);
  };

  const handleInputChange = (event) => {
    setInputValue(event.target.value);
  }

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const removeAllData = () => {
    setBadDomainsRowData([])
    setMatchCountRowData([])
    //setKeywordsTableRowData([])
  }

  //for submit button after TextArea
  const handleSubmit = async () => {
    removeAllData()
    setSubmitClicked(true);

    if (inputValue || selectedFile) {
      let urlList = await getUrlList()
      await startWebSocketAndManageIncomingData(urlList);
    } else {
      setSubmitClicked(false)
      alert("please select a file or enter domain names in the textarea")
    }
  }


  //function to get urlList
  const getUrlList = async () => {

    if (inputValue.trim().length !== 0) {
      let urlList = inputValue.split(/\r?\n|\r|\t/);
      urlList = urlList.flatMap(element => element.split(/[,|;]/));
      urlList = urlList.flatMap(element => element.trim())
      urlList = urlList.flatMap(element => element.split(' '))
      urlList = urlList.filter(element => element)
      urlList = [...new Set(urlList)]
      return urlList
    } else if (selectedFile) {
      const reader = new FileReader();
      let urlList = []
      await new Promise((resolve, reject) => {
        reader.onload = ({ target }) => {
          const csv = Papa.parse(target.result);
          const parsedData = csv?.data;
          urlList = parsedData?.flat();
          urlList = urlList.flatMap(element => element.split(' '));
          urlList = urlList.filter(element => element);
          urlList = [...new Set(urlList)]
          resolve();
        };
        reader.onerror = () => {
          reject(new Error('File reading error.'));
        };
        reader.readAsText(selectedFile);
      });
      return urlList
    }
  }

  //to export failed domains to csv
  const onBtnExport = useCallback(() => {
    failedDomainsGridRef.current.api.exportDataAsCsv();
  }, []);

  //calculation methods ahead-----------------------------------------------------------------------------------------------------------------
  async function startWebSocketAndManageIncomingData(urlList) {
    try {

      setLoading(false);
      const socket = new WebSocket('ws://' + uri.replace('http://', '') + '/categorizeBulk');
      socket.onopen = () => {
        const message = {
          recrawl: isChecked,
          urlList: urlList,
        };
        socket.send(JSON.stringify(message));
      }
      socket.onmessage = async event => {
        const DataArray = await JSON.parse(event.data);
        if (DataArray.taskcount) {
          // console.log("mesage ", DataArray.message)
          setTaskcount(DataArray.taskcount);
          DataArray.taskcount > 100 ? setProgressStatus(100.00) : setProgressPercentage(DataArray.taskcount.toFixed(2))
        } else if (DataArray.progressStatus) {
          setProgressStatus(DataArray.progressStatus)
        } else {
          await setDataToGrid(DataArray)
        }
      }
      socket.onclose = event => {
        setProgressStatus("")
        setTaskcount('')
        setProgressPercentage(0)
        setSubmitClicked(false)
      }
    } catch (error) {
      console.error('Error posting data:', error);
    }
  }


  function getKeywordsFromHrefs(domain, urlList) {
    let keywordsArray = []
    let hostname = domain.replace(/^(https?:\/\/)?(www\.)?/, '')
    let Hrefs = [...new Set(urlList.map(url => url[0]))];
    Hrefs = Hrefs?.filter(href => href.includes('http'))
    // console.log(Hrefs)
    for (let Href of Hrefs) {
      Href =Href.replace(/^(https?:\/\/)?(www\.)?/, '')
      if (Href.includes(hostname)) {
        let hrefPath = Href.replace(hostname, '')//.split('/')
        //hrefKeywords = hrefKeywords.filter(keyword => keyword)
        let hrefKeywords = tokenizeHrefsAndFilter(hrefPath)

        for (let keyword of hrefKeywords) {
          keyword = keyword.replace(/(html|php|aspx|jsp|jpg|png)$/gi, '').replace(/[-_.]/g, ' ')
          if (keyword.replace(/#/g, '').trim() !== '') { keywordsArray.push({ customUniqueKey: `${Href}_${keyword}`, domain: domain, href: Href, keyword: keyword, keyword_tokenized: keyword }) }
        }
      }
    }
    console.log(keywordsArray)
    return keywordsArray
  }

  function tokenizeHrefsAndFilter(untokenizedString) {

    const stopwords = ["the", ,"www","com", "and", "is", "in", "of", "for", "to", "with", "this", "that"];

    const allTokens = untokenizedString.split(/[^\w]+|[\s\-_]+/)
    console.log(allTokens)
    const cleanTokens = allTokens.map(token => token.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase()).filter(token => token !== '');

    const filteredTokens = cleanTokens.filter(token => !stopwords.includes(token));
    return filteredTokens;
  }

  async function setDataToGrid(DataArray) {
    // console.log(DataArray.length)
    if (DataArray.length > 50) {
      for (let Data of DataArray) {
        if (Object.keys(Data).length == 6) {//implies data came from DB
          let totalCount = Data.totalCount
          setMatchCountRowData((prevData) => [...prevData, totalCount]);
        }
      }
    }
    else {
      for (let Data of DataArray) {
        let totalCount; let keywordsTableData;
        // console.log('setting Grid Data')
        if (Data.CrawledData && Data.metaData.Site) {//implies data came from crawling 
          let url = Data.metaData.Site;
          let socialLinks = getSocialLinksFromHrefs(Data.urlList)
          let otherDomains = getOtherDomains(Data.urlList, url, Data.redirectedUrl)
          let internalLinks = getInternalLinks(Data.urlList, url, Data.redirectedUrl)
          let urlList = Data.urlList

          let categoryData = countMatchingKeywordsFromGivenSetOfLinks(internalLinks, socialLinks, keywords, url)
          let metaData = Data.metaData;
          let metadataFromSubpages = Data.metadataFromSubpages
          let hasCopyright = Data.metaData.copyright.includes("NOT FOUND!") ? false : true
          totalCount = countTotalperCategory(categoryData, Data.exclude, otherDomains.length, hasCopyright)
          console.log("domain : ", url," urllist :", urlList)
          keywordsTableData = getKeywordsFromHrefs(url, urlList)
          totalCount.redirectedUrl = Data.redirectedUrl
          totalCount.Unique_internal_links_Count = internalLinks.length
          totalCount.ExternalDomains = otherDomains.join(',')
          totalCount.is_nonEnglish = Data.isEnglish 
          let dataforDB = { url, categoryData, totalCount, metaData, keywordsTableData, metadataFromSubpages }
          totalCount.Site = url;

          setQueue(prevData => [...prevData, dataforDB])
        } else if (Object.keys(Data).length === 6) {//implies data came from DB
          totalCount = Data.totalCount;
          // keywordsTableData = Data.keywordsTableData;
        }

        if (totalCount) {
          addtotalCountRows(totalCount)
        } else if (Data) {
          setBadDomainsRowData(prevData => [...prevData, ...Data])
        }
      }
    }
  }

  const addtotalCountRows = (data) => {
    let newRows = [data];

    const transaction = {
      add: newRows,
    };
    totalCountGridApiRef.current.api.applyTransactionAsync(transaction);
  };

  const addKeywordsRows = (data) => {

    const transaction = {
      add: data,
    };
    keywordsGridApiRef.current.api.applyTransactionAsync(transaction);
  };

  const clearTotalCountRows = useCallback(() => {
    const rowData = [];
    totalCountGridApiRef.current.api.forEachNode(function (node) {
      rowData.push(node.data);
    });
    const res = totalCountGridApiRef.current.api.applyTransaction({
      remove: rowData,
    });
  }, []);

  const clearKeywordsTableRows = useCallback(() => {
    const rowData = [];
    keywordsGridApiRef.current.forEachNode(function (node) {
      rowData.push(node.data);
    });
    const res = keywordsGridApiRef.current.applyTransaction({
      remove: rowData,
    });
  }, []);


  async function sendDataToDB(data) {
    await axios.post(uri + '/dbData', data, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  //when a row is clicked in totalcount grid, display meta data and detailed categorydata for that domain
  const onRowClicked = async (event) => {
    if (event.data && event.data.Site) {
      let site = event.data.Site;
      setiframeSource(site)
      setRowClickLoading(true);
      try {
        const response = await fetch(uri + '/dbData?Site=' + site, { method: 'Get' });

        let jsondata = await response.json();

        if (!jsondata.message) {
          let categorydata = await jsondata.categoryData;
          let metaData = await jsondata.metaData;
          setRowClicked(true);
          setCategoryRowData(categorydata);
          setMetadataRowData(formatMetaData(metaData))
          //console.log('Data retrieved:', categorydata);
          setRowClickMessage("data for selected row found successfully!")
        } else {
          // console.log("no data found");
          setRowClickMessage("no data found for selected row")
          setCategoryRowData([]);
          setMetadataRowData([])
        }

        const responseHTML = await fetch(uri + '/dbData/HTMLdata?Site=' + site, { method: 'Get' });
        let HTMLjsondata = await responseHTML.json();

        const filteredData = Object.entries(HTMLjsondata);
        filteredData.shift()
        filteredData.shift()
        //console.log(filteredData)
        setHTMLdata(filteredData)

        setRowClickLoading(false)
      } catch (error) {
        console.error('Error fetching data:', error);
        setRowClickLoading(false)
      }
    }
  };

  //for arrowkeys navigation to function as onrowclick
  useEffect(() => {
    const handleKeyDown = event => {
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        console.log(event.key)
        const focusedCell = totalCountGridApiRef.current.api.getFocusedCell();
        if (focusedCell) {
          const focusedRowNode = totalCountGridApiRef.current.api.getDisplayedRowAtIndex(focusedCell.rowIndex);
          if (focusedRowNode) {
            focusedRowNode.setSelected(true, true);
            onRowClicked(focusedRowNode);
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  //format metadata columns => rows
  const formatMetaData = (data) => {
    let dataArray = [];
    Object.entries(data).map(([key, value]) => {
      dataArray.push({ metaTagName: key, value: value })
    })
    return dataArray;
  }

  //parent method for looping through checkkeywordsOnUrl
  function countMatchingKeywordsFromGivenSetOfLinks(internalLinks, socialLinks, keywords, url) {
    let categoryData = [];
    for (let UrlAndUrlText of internalLinks) {
      try {
        const keywordMatchCountData = checkKeywordsOnUrl(UrlAndUrlText, keywords, url);
        keywordMatchCountData.Site = url
        categoryData.push(keywordMatchCountData);
      } catch (error) {
        console.log(`failed to classify ${url}`)
        console.log(error)
        continue;
      }
    }

    if(socialLinks.length>0){
      for(let UrlAndUrlText of socialLinks){
        const keywordMatchCountData = checkKeywordsOnSocialUrl(UrlAndUrlText, keywords)
        keywordMatchCountData.Site = url
        categoryData.push(keywordMatchCountData);
      }
    }

    return categoryData;
  }

  //takes an href and its linktext and returns categoryData for that href (1 row with 1 for keyword found category and empty for no keyword found category)
  function checkKeywordsOnUrl(internalLinks, keywords, url) {
    let Categories = { "HREF": internalLinks[0], "linkText": internalLinks[1], "About": "", "Contact": "", "Team": "", "Investor": "", "Product": "", "Career": "", "News": "", "ECommerce": "", "Resources": "", "Pricing": "", "Social": "", "Portal": "", "Legal": "", "Blog": "", "keywordFound": "None" };
    let keywordsArry = Object.entries(keywords);
    let urlhostname = (new URL(url).hostname).replace('www.','')
    Categories.linkText = Categories.linkText.replace(/\r?\n|\r/g, "").replace(/\s+/g, ' ').trim();
    let href = Categories.HREF.replace(/^(https?:\/\/)?(www\.)?/i, '').replace(`${urlhostname}/`,'')
    console.log('href :', Categories.HREF)
    for (let [category, keywordset] of keywordsArry) {
      const word = category.toString()

      for (let keyword of keywordset) {
        if (href.toLowerCase().includes(keyword.trim().toLowerCase()) || Categories.linkText.toLowerCase().includes(keyword.replace(' ', '').toLowerCase())) {
          Categories[`${word}`] = 1;
          if (Categories.keywordFound === "None") {
            Categories.keywordFound = keyword;
          } else {
            Categories.keywordFound = Categories.keywordFound + ", " + keyword;
          }
        }
      }
    }
    return Categories;
  }
//get categorydata from social links
function checkKeywordsOnSocialUrl(socialLink, keywords) {
  let Categories = { "HREF": socialLink[0], "linkText": socialLink[1], "About": "", "Contact": "", "Team": "", "Investor": "", "Product": "", "Career": "", "News": "", "ECommerce": "", "Resources": "", "Pricing": "", "Social": "", "Portal": "", "Legal": "", "Blog": "", "keywordFound": "None" };
  let keywordsArry = Object.entries(keywords);

  for (let [category, keywordset] of keywordsArry) {
    if(category == "Social"){
      const word = category.toString()
      for (let keyword of keywordset) {
        if (Categories.HREF.toLowerCase().includes(keyword.trim().toLowerCase()) || Categories.linkText.toLowerCase().includes(keyword.replace(' ', '').toLowerCase())) {
          Categories[`${word}`] = 1;
          if (Categories.keywordFound === "None") {
            Categories.keywordFound = keyword;
          } else {
            Categories.keywordFound = Categories.keywordFound + ", " + keyword;
          }
        }
      }
    }
  }
  return Categories;
}
  //get social links
  function getSocialLinksFromHrefs(urlList) {
    //urlList //= urlList.filter(item => !item[0].replace(/^(https?:\/\/)?(www\.)?/i, '').includes(url.replace(/^(https?:\/\/)?(www\.)?/i, '')) && !item[0].includes("javascript:"))
    let socialKeywords = ['facebook', 'twitter', 'instagram', 'youtube', 'linkedIn', 'houzz', 'pinterest', 'reddit']
    const regex = new RegExp(socialKeywords.join("|"), "i");
    const filteredArray = urlList.filter(item => regex.test(item[0]));

    return filteredArray;
  }


  //get other domain links from list of urls
  function getOtherDomains(urlList, url, redirectedLink) {
    let subUrls = urlList
    let givenUrl = new URL(url).hostname
    let otherDomains = []
    
    if(redirectedLink!=""){
      let redirectedUrl = new URL(redirectedLink).hostname
      console.log("urlList inside getOtherDomains", redirectedUrl)
      subUrls.forEach((item)=>{
        if(item && Array.isArray(item) &&
          item.length > 0 && item[0] && 
          !item[0].includes(givenUrl) && 
          !item[0].includes(redirectedUrl.replace('www.','')) &&
          !item[0].includes("javascript:") && 
          !item[0].includes('tel:') && 
          !item[0].includes('mailto:')){
            otherDomains.push(item)
        }
      })
    }else{
      console.log("urlList inside getOtherDomains", urlList)
      subUrls.forEach((item)=>{
        if(item && Array.isArray(item) &&
          item.length > 0 && item[0] && 
          !item[0].includes(givenUrl) &&
          !item[0].includes("javascript:") && 
          !item[0].includes('tel:') && 
          !item[0].includes('mailto:')){
            otherDomains.push(item)
        }
      })
    }

    
    let socialKeywords = ['facebook', 'twitter', 'instagram', 'youtube', 'linkedIn', 'houzz', 'pinterest', 'reddit']
    const regex = new RegExp(socialKeywords.join("|"), "i");
    const filteredArray = otherDomains.filter(item => !regex.test(item[0]));
    let uniqueSet = new Set()

    filteredArray.forEach(element => {
      let domain = element[0].replace(/^(https?:\/\/)?(www\.)?/i, '')
      domain = domain.replace(/\/(.*)/, '')
      uniqueSet.add(domain)
    })
    return Array.from(uniqueSet);
  }

  function getInternalLinks(urlList, url, redirectedLink) {
    let subUrls = urlList
    let givenUrl = new URL(url).hostname
    let internalLinks;
    if(redirectedLink!==""){
      let redirectedUrl = new URL(redirectedLink).hostname
       internalLinks = subUrls.filter(item => item && item[0] && item[0].includes(givenUrl) || item[0].includes(redirectedUrl) || item[0].includes('tel:') || item[0].includes('mailto:'));
    }else{
       internalLinks = subUrls.filter(item => item && item[0] && item[0].includes(givenUrl) || item[0].includes('tel:') || item[0].includes('mailto:'));
    }
   
    //let socialKeywords = ['facebook', 'twitter', 'instagram', 'youtube', 'linkedIn', 'houzz', 'pinterest', 'reddit']
    //const regex = new RegExp(socialKeywords.join("|"), "i");
    //const filteredArray = internalLinks.filter(item => !regex.test(item[0]));
    let uniqueSet = new Set()

    internalLinks.forEach(element => {
      uniqueSet.add(element)
    })

    console.log('internal', Array.from(uniqueSet))
    return Array.from(uniqueSet);
  }

  //takes categoryData and returns total count per category for that domain
  function countTotalperCategory(data, exclude, uniqueDomains, hasCopyright) {
    let countData = {
      "About": 0, "Contact": 0, "Team": 0, "Investor": 0, "Product": 0, "Career": 0, "News": 0, "ECommerce": 0,
      "Resources": 0, "Pricing": 0, "Social": 0, "Portal": 0, "Legal": 0, "Blog": 0, "Copyright": 0, "Exclude": 0, "Total_Count": 0, "Total_Single_Count": 0,
      "Unique_External_Domains_Count": 0
    };

    let pointsPerGroup = {
      "About": 1, "Contact": 1, "Team": 1, "Investor": 1, "Product": 1, "Career": 1, "News": 0, "ECommerce": 1,
      "Resources": 0, "Pricing": 0, "Social": 0.5, "Portal": 0, "Legal": 0, "Blog": 0, "Copyright": 0, "Exclude": 0,
    }

    if (exclude) countData["Exclude"] = 1
    if (hasCopyright) countData["Copyright"] = 1

    const categories = Object.keys(countData);
    data.forEach((domain) => {
      categories.forEach(category => {
        if (domain[category] === 1 && category !== "Exclude" && category !== "Copyright") {
          countData[category]++;
          countData["Total_Count"]++;
        }
      });
    });


    categories.forEach(category => {
      if (countData[category] > 0 && category != "Exclude" && category != "Total_Count" && category != "Total_Single_Count") {
        countData['Total_Single_Count'] += pointsPerGroup[category];
      }
    })
    countData.Unique_External_Domains_Count = uniqueDomains

    return countData;
  }

  //------------------------------------------------------Frontend UI---------------------------------------------------------
  return (
    <div >
      <div className='container-fluid mb-2' style={{ borderStyle: "ridge", borderColor: 'blue', borderWidth: '1px' }}>
        <nav className="navbar navbar-bulk row">
          <div className='col-md-10 d-flex align-items-center flex-wrap justify-content-center'>
            <div>
              <textarea
                style={{ fontSize: "20px", width: "100%", borderStyle: 'solid', borderRadius: '4px', borderColor: 'black', borderWidth: '2px' }}
                id="searchBox"
                rows="3"
                cols={cols}
                placeholder="Enter a list of URLs or domains to get categorization details for them"
                value={inputValue}
                className="form-control"
                onChange={handleInputChange}
              ></textarea>
            </div>
          </div>
          <div className='col-md-2 d-flex align-items-center flex-wrap justify-content-center'>
            <div className="d-flex flex-column justify-content-center align-items-center">
              <div>
                <input style={{ width: '15vw' }} className="form-control m-3" type="file" id="myFile" name="filename" accept="text/csv, application/csv" onChange={handleFileChange} />
              </div>
              <div className="ml-2">
                <input
                  type="checkbox"
                  id="recrawl"
                  checked={isChecked}
                  onChange={handleCheckboxChange}

                />
                <label htmlFor="recrawl" className='my-auto ml-2'>Recrawl?</label>
              </div>
              <div className="ml-2">
                <button type="submit" className="btn btn-primary btn-sm m-2" style={{ height: '30px' }} onClick={handleSubmit}>Submit</button>
              </div>


            </div>
          </div>
          {/* <div className='col-md-1 text-center my-auto'>
            <span className="font-weight-bold" style={{ fontSize: '1.5rem' }} >OR</span>
            <div className="d-flex justify-content-center align-content-center">
              <label htmlFor="recrawl" className='my-auto'>Recrawl?</label>
              <input
                type="checkbox"
                id="recrawl"
                checked={isChecked}
                onChange={handleCheckboxChange}
                className="ml-2"
              />
            </div>
          </div> */}
          {/* <div className='col-md-5'>
            <div className=" d-flex flex-wrap justify-content-center align-items-center">
              <input style={{ width: '80%' }} className="form-control m-3" type="file" id="myFile" name="filename" accept="text/csv, application/csv" onChange={handleFileChange} />
              <button type="submit" className="btn btn-primary btn-sm m-2" style={{ height: '30px' }} onClick={handleFileSubmit}>Submit</button>
            </div>
          </div> */}
        </nav>
      </div >

      {loading && !submitClicked ? (
        <div id='beforeSubmitDiv' className="text-center">
          <div className="mt-5">
            <span className='loadingTextbulkpage'>
              Please enter a comma-separated URL list in the textbox and click on the submit button to get the data
              <br /> OR <br /> upload a CSV file to bulk categorize.
            </span>
          </div>
        </div>
      ) : (<></>)
      }


      {/* {
        submitClicked ? (
          <div>
            <div><span className="ag-custom-loading"></span></div>
          </div>
        ) : (
          <div></div>
        )
      } */}

      <div> {!loading ? (
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-9">
              <div className="ag-theme-balham text-center" style={{ width: '100%', height: '26vh' }}>
                <div className="row">
                  <div className="col-md-4">

                    {submitClicked ? (<div style={{ zIndex: '1000' }}>
                      {/* <h6>{taskcount}</h6> */}
                      <ProgressBar now={progressPercentage} label={`${progressPercentage}% completed`} animated />
                    </div>) : (<div></div>)}
                  </div>
                  <div className="col-md-4">
                    <h6>Total count of matches per category</h6>
                  </div>
                  <div className="col-md-4">
                  </div>
                </div>
                <AgGridReact
                  ref={totalCountGridApiRef}
                  rowHeight={35}
                  headerHeight={35}
                  columnDefs={matchCountColumnDefs}
                  rowData={matchCountRowData}
                  defaultColDef={defaultColDefForMatchCount}
                  columnHoverHighlight={true}
                  onRowClicked={onRowClicked}
                  suppressDragLeaveHidesColumns={true}
                  rowGroupPanelShow="always"
                  //onGridReady={onTotalCountGridReady}
                  tooltipShowDelay={0}
                  rowBuffer={30}
                  rowSelection={"multiple"}
                  enableRangeSelection={true}
                  enableCharts={true}
                  // pagination={true}
                  // paginationPageSize={50}
                  animateRows={true}
                />
              </div>
            </div>

            <div className="col-md-3 ">
              <div className="ag-theme-alpine" style={{ width: '100%', height: '26vh' }}>
                <div className='row justify-content-center '>
                  <div className='col-md-2'>
                    <button style={{ borderColor: "#adb1b8", borderStyle: "solid", borderWidth: "1px", borderRadius: "3px", height: '20px' }} onClick={onBtnExport}>Download</button>
                  </div>
                  <div className='col-md-10'>
                    <h6 className="text-center">Failed to crawl these domains</h6>
                  </div>
                </div>
                <AgGridReact
                  ref={failedDomainsGridRef}
                  rowHeight={35}
                  headerHeight={35}
                  columnDefs={badDomainsColumnDefs}
                  rowData={badDomainsRowData}
                  defaultColDef={defaultColDefForBadDomains}
                />
              </div>
            </div>
          </div>

          {/* Lower part */}

          {rowClicked && rowClickLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center' }}><span className="ag-custom-loading2"></span>
            </div>) : (
            <></>
          )}
          t

          {rowClicked && !rowClickLoading ? (<>
            <div className='container-fluid mt-5'>
              <ul class="nav nav-tabs" id="myTab" role="tablist">
                {/* <li class="nav-item" role="presentation">
                <button class="nav-link active" id="KeywordsFromHrefs" data-bs-toggle="tab" data-bs-target="#tab1" type="button" role="tab" aria-controls="KeywordsFromHrefs" aria-selected="true">Keywords From Hrefs</button>
              </li> */}
                <li class="nav-item" role="presentation">
                  <button class="nav-link active" id="categorizationtab" data-bs-toggle="tab" data-bs-target="#tab2" type="button" role="tab" aria-controls="categorizationData" aria-selected="false">Categorization Data</button>
                </li>
                <li class="nav-item" role="presentation">
                  <button class="nav-link" id="selected Domain Homepage" data-bs-toggle="tab" data-bs-target="#tab3" type="button" role="tab" aria-controls="categorizationData" aria-selected="false">Selected domain Homepage</button>
                </li>
                {/* <li class="nav-item" role="presentation">
                <button class="nav-link" id="HTMLtab" data-bs-toggle="tab" data-bs-target="#tab2" type="button" role="tab" aria-controls="renderedHTML" aria-selected="false">HTML rendered</button>
              </li>
              <li class="nav-item" role="presentation">
                <button class="nav-link" id="HTMLtab" data-bs-toggle="tab" data-bs-target="#tab3" type="button" role="tab" aria-controls="HTMLText" aria-selected="false">HTML Text</button>
              </li> */}
              </ul>

              <div class="tab-content mt-3 mb-3" id="myTabContent">


                {/* This is tab 2 */}

                <div className="mt-1 tab-pane fade show active" id="tab2" role="tabpanel" aria-labelledby="tab2">
                  <div className="row">
                    <div className="col-md-9">
                      <div className="ag-theme-alpine" style={{ width: '100%', height: '26vh' }}>
                        <div className="row">
                          <div className="col-md-3 text-center">{rowClickMessage}</div>
                          <div className="col-md-6 text-center">
                            <h6>Details for selected Domain</h6>
                          </div>
                        </div>
                        <AgGridReact
                          rowHeight={35}
                          headerHeight={35}
                          columnDefs={categoryColumnDefs}
                          rowData={categoryRowData}
                          defaultColDef={defaultColDefForCategories}
                          tooltipShowDelay={0}
                          columnHoverHighlight={true}
                        //  animateRows={true}
                        />
                      </div>
                    </div>

                    <div className="col-md-3">
                      <div className="ag-theme-alpine" style={{ width: '100%', height: '26vh' }}>
                        <h6 className="text-center">MetaData</h6>
                        <AgGridReact
                          rowHeight={35}
                          headerHeight={35}
                          columnDefs={metaDataColumnDefs}
                          rowData={metadataRowData}
                          defaultColDef={defaultColDefForMetaData}
                          tooltipShowDelay={0}
                          columnHoverHighlight={true}
                        // animateRows={true}
                        />
                      </div>
                    </div>

                  </div>
                </div>


                <div className="mt-1 tab-pane fade" id="tab3" role="tabpanel" aria-labelledby="tab3" >
                  <div className='row justify-content-center ' style={{ height: '30vh' }}>
                    <iframe id="theFrame" src={iframSource} style={{ height: "100%" }} frameborder="1" />
                  </div>
                </div>


                {/* This is tab 4 */}
                {/* <div className="tab-pane fade overflow-hidden" id="tab2" role="tabpanel" aria-labelledby="tab2" style={{ height: '34vh' }} >
                {

                  <div className="container-fluid">
                    <div className="row">
                      <div className="col-lg-3 col-md-4 col-sm-12">
                        <div className="sidebar-container">
                          <div className="scrollable-sidebar">
                            <Tabs
                              activeKey={activeTab}
                              onSelect={(tabIndex) => setActiveTab(tabIndex)}
                              className="flex-column"
                            >
                              {htmlData.map((item, index) => (
                                <Tab eventKey={index} title={`${item[0]}`} key={index} className="sidebar-tab">
                                </Tab>
                              ))}
                            </Tabs>
                          </div>
                        </div>
                      </div>
                      <div className="col-lg-9 col-md-8 col-sm-12">
                        <div className="scrollable-content">
                          <Tabs activeKey={activeTab} onSelect={(tabIndex) => setActiveTab(tabIndex)}>
                            {htmlData.map((item, index) => (
                              <Tab eventKey={index} key={index}>
                                <div className="mb-3" style={{ border: '2px solid black', borderRadius: '5px', padding: '2%' }}>
                                  <div dangerouslySetInnerHTML={{ __html: item[1] }}></div>
                                </div>
                              </Tab>
                            ))}
                          </Tabs>
                        </div>
                      </div>
                    </div>
                  </div>

                }
              </div> */}


                {/* this is tab 5 */}
                {/* <div className="tab-pane fade overflow-hidden" id="tab3" role="tabpanel" aria-labelledby="tab3" style={{ height: "34vh" }}>
                {
                  <div className="container-fluid">
                    <div className="row">
                      <div className="col-lg-3 col-md-4 col-sm-12">
                        <div className="sidebar-container">
                          <div className="scrollable-sidebar">
                            <Tabs
                              activeKey={activeTab}
                              onSelect={(tabIndex) => setActiveTab(tabIndex)}
                              className="flex-column"
                            >
                              {htmlData.map((item, index) => (
                                <Tab eventKey={index} title={`${item[0]}`} key={index} className="sidebar-tab">
                                </Tab>
                              ))}
                            </Tabs>
                          </div>
                        </div>
                      </div>
                      <div className="col-lg-9 col-md-8 col-sm-12">
                        <div className="scrollable-content">
                          <Tabs activeKey={activeTab} onSelect={(tabIndex) => setActiveTab(tabIndex)}>
                            {htmlData.map((item, index) => (
                              <Tab eventKey={index} key={index}>
                                <div className="mb-3" style={{ border: '2px solid black', borderRadius: '5px' }}>
                                  <code>{item[1]}</code>
                                </div>
                              </Tab>
                            ))}
                          </Tabs>
                        </div>
                      </div>
                    </div>
                  </div>
                }
              </div> */}


              </div>
            </div>
          </>) : (<></>)}


        </div>

      ) : (
        <div></div>
      )}</div>



      {
        !loading && !submitClicked && !rowClicked && !rowClickLoading ? (
          <div className="position-absolute start-50 translate-middle" style={{ top: '70%' }}>
            <div >
              <h5>
                Please select a Row to display details
              </h5>
            </div>
          </div>
        ) : (
          <></>
        )
      }





      <div className='position-fixed bottom-0 start-0 ' style={{ zIndex: '1000', opacity: '1', backgroundColor: 'whitesmoke' }}>
        <span className='border border-top-0 border-1 rounded'>{progressStatus}</span>
      </div>
    </div >

  )
}
