import '../App.css';
import React, { useEffect, useState, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import 'ag-grid-community/styles/ag-theme-balham.css';
import CustomTooltipForMetaData from '../tooltips/metadataTooltip';
import CustomTooltipForCategories from '../tooltips/categoriesTooltip'
import 'ag-grid-community'
import GetURI from '../components/URI';
import axios from 'axios'
let uri = GetURI();


export default function CrawlOne() {

  const [categoryRowData, setCategoryRowData] = useState();
  const [matchCountRowData, setmatchCountRowData] = useState();
  const [metaDataRowData, setmetaDataRowData] = useState();
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitClicked, setSubmitClicked] = useState(false);
  const [status, setStatus] = useState('starting task ... ');



  const categoryColumnDefs = [
    //{ field: 'Site' },
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

  const matchCountColumnDefs = [
    { field: 'About', width: 100, headerClass: 'custom-header-class' },
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
  ];

  const metaDataColumnDefs = [
    { field: 'metaTagName', tooltipField: 'metaTagName' },
    { field: 'value', tooltipField: 'value', wrapText: true }
  ]

  const defaultColDefForCategories = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    editable: true,
    wrapText: true,
    // autoHeight: true,
    cellStyle: { textAlign: "center" },
    tooltipComponent: CustomTooltipForCategories,
  }), []);

  const defaultColDefForMatchCount = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    editable: true,
    cellStyle: { textAlign: "left" },
  }), []);

  const defaultColDefForMetaData = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    editable: true,
    tooltipComponent: CustomTooltipForMetaData,
    autoHeight: true,
  }), []);

  const handleInputChange = (event) => {
    setInputValue(event.target.value);
  }

  const handleKeypress = e => {
    if (e.keyCode === 13) {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setSubmitClicked(true);
    let keywords;
    let request = { url: `${uri}/keywords`, method: 'GET' }
    await axios(request)
      .then((response) => {
        keywords = response.data
      })
      .catch((err) => {
        console.log("Error while getting master keywords ", err)
      })


    //api call for crawling url
    let url = (!inputValue.startsWith("http://") && !inputValue.startsWith("https://")) ? 'https://' + inputValue : inputValue;

    let data;



    request = { url: `${uri}/categorize?url=${url}`, method: 'GET' }

    const socket = new WebSocket('ws://' + uri.replace('http://', '') + '/categorize');
    socket.onopen = () => {
      const message = {
        url: url
      };
      socket.send(JSON.stringify(message));
    }

    socket.onmessage = async event => {
      const data = await JSON.parse(event.data);
      if (data.message) {
        console.log("message ", data.message)
        setStatus(data.message);
      } else {
        console.log("data :", data)
        try {
          if (Object.keys(data).length == 2) {
            console.log('inside if')
            let categoryData = countMatchingKeywordsFromGivenSetOfLinks(data.urlList, keywords, url)
            let totalCount = countTotalperCategory(categoryData)
            let metaData = formatMetaData(data.metaData);
            console.log('processing done')
            setCategoryRowData(categoryData);
            setmatchCountRowData([totalCount]);
            setmetaDataRowData((metaData));
            setLoading(false)
            setSubmitClicked(false);
          } else if (Object.keys(data).length == 5) {
            setCategoryRowData(data.categoryData);
            setmatchCountRowData([data.totalCount]);
            setmetaDataRowData(formatMetaData(data.metaData));
            setSubmitClicked(false);
            setLoading(false)
          } else {
            setLoading(true)
            setSubmitClicked(false);
            alert("Couldn't find data for given URL! Please enter a valid URL")
          }
        } catch {
          console.log('caught error')
          setLoading(true)
          setSubmitClicked(false);
        }
      }
    }

  };

  const formatMetaData = (data) => {
    let dataArray = [];
    Object.entries(data).map(([key, value]) => {
      dataArray.push({ metaTagName: key, value: value })
    })
    return dataArray;
  }

  //calculation methods ahead
  function countMatchingKeywordsFromGivenSetOfLinks(PageUrlsAndUrlTexts, keywords, url) {

    let categoryData = [];
    for (let UrlsAndUrlText of PageUrlsAndUrlTexts) {
      try {
        const keywordMatchCountData = checkKeywordsOnUrl(UrlsAndUrlText, keywords);
        keywordMatchCountData.Site = url
        categoryData.push(keywordMatchCountData);
      } catch (error) {
        console.log(`failed to classify ${url}`)
        console.log(error)
        continue;
      }
    }
    return categoryData;
  }


  function checkKeywordsOnUrl(urlHrefAndTextArray, keywords) {

    let Categories = { "HREF": urlHrefAndTextArray[0], "linkText": urlHrefAndTextArray[1].replace(/\r?\n|\r/g, ""), "About": "", "Contact": "", "Team": "", "Investor": "", "Product": "", "Career": "", "News": "", "ECommerce": "", "Resources": "", "Pricing": "", "Social": "", "Portal": "", "Legal": "", "Blog": "", "keywordFound": "None" };
    let keywordsArry = Object.entries(keywords);
    Categories.linkText = Categories.linkText.replace(/\s+/g, ' ').trim();

    for (let [category, keywordset] of keywordsArry) {
      const word = category.toString()

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


  function countTotalperCategory(data) {
    let countArray = {
      "About": 0, "Contact": 0, "Team": 0, "Investor": 0, "Product": 0, "Career": 0, "News": 0, "ECommerce": 0,
      "Resources": 0, "Pricing": 0, "Social": 0, "Portal": 0, "Legal": 0, "Blog": 0, "Exclude": 0
    };

    const categories = Object.keys(countArray);

    data.forEach((webpage) => {
      categories.forEach((category) => {
        if (webpage[category] === 1) countArray[category]++;
      });
    });

    return countArray;
  }

  return (
    <div className='container-fluid mb-2' >
      <nav className="navbar mb-2 row" style={{ borderStyle: "ridge", borderColor: 'blue', borderWidth: '1px' }}>
        <div className='col-md-5 d-flex align-items-center flex-wrap justify-content-center'>
          <div className="input-group">
            <input id="searchBox" type="text" size='50' placeholder="Enter a single domain to crawl" value={inputValue} className="form-control" onChange={handleInputChange} onKeyDown={handleKeypress} />
            <div className="input-group-append">
              <button type="submit" className="btn btn-primary" onClick={handleSubmit}>
                Submit
              </button>
            </div>
          </div>
        </div>
      </nav>


      {loading && !submitClicked ? (
        <div className="container d-flex justify-content-center align-items-center">
          <div className="text-center" style={{ width: '60%' }}>
            <span style={{ fontFamily: 'Trocchi', fontSize: '30px', fontWeight: 'normal' }}>
              Please Enter a URL in the Textbox and Click on the submit button to get the data
            </span>
          </div>
          <div>
          </div>
        </div>

      ) : (<></>)}


      {(!loading && !submitClicked)? (
        <div>
          <div className='mycontainer'>
            <div className='top'>
              <div className="ag-theme-balham" style={{ textAlign: 'center', width: '100%', height: 75 }}>
                <div className='text-center'><h6>Total count of matches per category</h6></div>
                <AgGridReact
                  rowHeight={35}
                  columnDefs={matchCountColumnDefs}
                  rowData={matchCountRowData}
                  defaultColDef={defaultColDefForMatchCount}
                  columnHoverHighlight={true}
                />
              </div>
            </div>

            <div className="container-fluid mt-5">
              <div className="row">
                <div className="col-md-9">
                  <div className="ag-theme-alpine left" style={{ width: '100%', height: '62vh' }}>
                    <div className='text-center'><h6>Details of URLs matched</h6></div>
                    <AgGridReact
                      rowHeight={35}
                      columnDefs={categoryColumnDefs}
                      rowData={categoryRowData}
                      defaultColDef={defaultColDefForCategories}
                      tooltipShowDelay={0}
                      columnHoverHighlight={true}
                    />
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="ag-theme-alpine right" style={{ width: '100%', height: '62vh' }}>
                    <div className='text-center'><h6>MetaData for Given URL</h6></div>
                    <AgGridReact
                      columnDefs={metaDataColumnDefs}
                      rowData={metaDataRowData}
                      defaultColDef={defaultColDefForMetaData}
                      pagination={false}
                      tooltipShowDelay={0}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ):(<></>)}


      {submitClicked ? (
        <div>
          <div><span className="ag-custom-loading"></span></div><br /><br /><br />
          <div style={{ display: 'flex', textAlign: 'center', marginTop: '150px', flexDirection: 'column', fontSize: '20px', color: '#061526' }}>{status}</div>
        </div>
      ) : (
        <></>
      )}
    </div>
  );
}

