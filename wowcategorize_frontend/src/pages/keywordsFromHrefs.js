// import { useState, useMemo, useCallback, useRef } from "react"
// import { AgGridReact } from 'ag-grid-react'
// import axios from 'axios'

// import 'ag-grid-community/styles/ag-grid.css'
// import 'ag-grid-community/styles/ag-theme-balham.css'
// import 'ag-grid-enterprise'
// import '../App.css'
// import {
//     convertFiltersToSolrQuery,
//     convertSortToSolrQuery,
//     convertGroupToSolrQuery,
//     convertPivotToSolrQuery,
// } from './utilities/convertAgGridOperationsToSolrQuery'

// export default function KeywordsFromHrefs() {

//     const [totalcount, setTotalCount] = useState(0);
//     const gridRef = useRef();

//     const createServerSideDatasource = (server) => {
//         return {
//             getRows: async (params) => {
//                 var response = await server.getData(params.request)

//                 if (response.success) {
//                     // supply rows for requested block to grid
//                     params.success({
//                         rowData: response.rows,
//                         rowCount: response.lastRow,
//                     })


//                 } else {
//                     params.fail()
//                 }
//             },
//         }
//     }

//     const createFakeServer = () => {
//         return {
//             getData: async (request) => {
//                 var start = request.startRow
//                 var rows = request.endRow - request.startRow

//                 const fq = convertFiltersToSolrQuery(
//                     request.filterModel,
//                     request.rowGroupCols,
//                     request.groupKeys
//                 )
//                 const sort = convertSortToSolrQuery(
//                     request.sortModel,
//                     request.rowGroupCols
//                 )
//                 var [group, pivot] = [null, null]

//                 if (request.pivotMode === true) {
//                     pivot = convertPivotToSolrQuery(
//                         request.rowGroupCols,
//                         request.groupKeys,
//                         request.valueCols,
//                         start,
//                         rows
//                     )
//                     start = 0
//                     rows = 0 //because it should not fetch normal records
//                 } else {
//                     group = convertGroupToSolrQuery(
//                         request.rowGroupCols,
//                         request.groupKeys
//                     )
//                 }
//                 const aggregationQuery = `{
//                     "total_sum": {
//                       "type": "sum",
//                       "field": "unit_count"
//                     }
//                   }`;
//                 const query = `q=*:*&start=${start}&rows=${rows}${fq ? `&fq=${fq}` : ''
//                     }${sort ? `&sort=${sort}` : ''}${group ? group : ''}${pivot ? pivot : ''
//                     }`

//                 const solrRequest = {
//                     url: `http://localhost:4000/solr/hrefkeywords_v2/select?${query}`, //`/companies/${props.isSuperUser == 1 ? '' : props.userId}`,
//                     method: 'GET',
//                 }
//                 console.log(solrRequest.url)

//                 setTotalCount('Loading...')
//                 var records = []
//                 await axios(solrRequest)
//                     .then((response) => {

//                         // if (response.data.facets !== undefined) {
//                         //     const totalSum = response.data.facets.total_sum
//                         //     records.totalSum = totalSum  // Include the sum in your records data
//                         // }


//                         if (response.data.grouped !== undefined) {
//                             const colName = Object.keys(response.data.grouped)[0]
//                             setTotalCount(response.data.grouped[colName].matches)
//                         }
//                         else
//                             setTotalCount(response.data.response.numFound)
//                         //in case of pivot
//                         if (response.data.facets !== undefined) {
//                             const colname = JSON.parse(
//                                 response.data.responseHeader.params['json.facet']
//                             ).group_field.field
//                             records = response.data.facets.group_field.buckets.map((rec) => {
//                                 var record = {}
//                                 record[colname] = rec.val
//                                 record.childCount = rec.count
//                                 Object.keys(rec).forEach((key) => {
//                                     if (key !== 'val' && key != 'count') {
//                                         record[key] = rec[key]
//                                     }
//                                 })
//                                 return record
//                             })
//                         }
//                         //in case of groping
//                         else if (response.data.grouped !== undefined) {
//                             records = Object.values(response.data.grouped)[0].groups.map(
//                                 //extracting records from solr response
//                                 (group) => {
//                                     const colName = Object.keys(response.data.grouped)[0]
//                                     return {
//                                         [colName]:
//                                             group.groupValue !== null ? group.groupValue : '', //returning record objects
//                                             childCount: group.doclist.numFound,
//                                     }
//                                 }
//                             )
//                         } else {
//                             records = response.data.response.docs
//                             records = records.map((record) => {
//                                 record.id = parseInt(record.id)
//                                 return record
//                             })
//                         }

//                     })
//                     .catch((err) => {
//                         console.log('error while getting data from axios', err)
//                     })

//                 // here we are pretending we don't know the last row until we reach it!
//                 var lastRow = getLastRowIndex(request, records)
//                 return {
//                     success: true,
//                     rows: records,
//                     lastRow: lastRow,
//                 }
//             },
//         }
//     }

//     const getLastRowIndex = (request, results) => {
//         if (!results) return undefined
//         var currentLastRow = (request.startRow || 0) + results.length
//         // if on or after the last block, work out the last row, otherwise return 'undefined'
//         return currentLastRow < (request.endRow || 0) ? currentLastRow : undefined
//     }


//     const containerStyle = useMemo(() => ({ width: '100%', height: '100%' }), []);

//     const [columnDefs] = useState([
//        //{ field: 'customUniqueKey', headerName: 'uniqueKey', filter: 'agTextColumnFilter', width: 300, headerClass: 'custom-header-class' },
//         { field: 'domain', header: 'Domain', filter: 'agTextColumnFilter', width: 300, headerClass: 'custom-header-class', },
//         { field: 'href', header: 'Href', filter: 'agTextColumnFilter', width: 400, headerClass: 'custom-header-class', rowGroup: true, rowGroupIndex: 1},
//         {
//             field: 'keyword', header: 'Keywords', filter: 'agTextColumnFilter', width: 400,// headerClass: 'custom-header-class',
//             // colGroupDef: {
//             //     headerValueGetter: function (params) {
//             //         const groupName = params.displayName;
//             //         console.log('name ',groupName)
//             //         const childNodeCount = params.api.getChildrenCount(params.node);
//             //         console.log('count ',childNodeCount)
//             //         return `${childNodeCount}_${groupName}`;
//             //     }
//             // }
//         },
//         { field: 'keyword_tokenized', header: 'Keywords_tokenized', filter: 'agTextColumnFilter', width: 400, headerClass: 'custom-header-class' ,rowGroup: true, rowGroupIndex: 0},

//     ])

//     const defaultColDef = useMemo(() => {
//         return {
//             editable: true,
//             sortable: true,
//             filter: true,
//             resizable: true,
//             floatingFilter: true,
//             rowDrag: true,
//             enableValue: true,
//             enableRowGroup: true,
//             enablePivot: true,
//         };
//     }, [])

//     const autoGroupColumnDef = {
//         headerName: 'Group',
//         width: 500, // Set the desired width for pivot groups
//         cellRenderer: 'agGroupCellRenderer', // Use the built-in group cell renderer
//       };

//     const sideBar = useMemo(() => {
//         return {
//             toolPanels: [
//                 {
//                     id: 'columns',
//                     labelDefault: 'Columns',
//                     labelKey: 'columns',
//                     iconKey: 'columns',
//                     toolPanel: 'agColumnsToolPanel',
//                 },
//                 {
//                     id: 'filters',
//                     labelDefault: 'Filters',
//                     labelKey: 'filters',
//                     iconKey: 'filter',
//                     toolPanel: 'agFiltersToolPanel',
//                 },
//                 // {
//                 //     id: 'customStats',
//                 //     labelDefault: 'Custom Stats',
//                 //     labelKey: 'customStats',
//                 //     iconKey: 'custom-stats',
//                 //     toolPanel: CustomStatsToolPanel,
//                 // },
//             ],
//             defaultToolPanel: '',
//         };
//     }, []);

//     const getChildCount = useCallback(
//         (data) => {
//             return data ? data.childCount : undefined
//         },
//         []
//     )

//     const popupParent = useMemo(() => {
//         return document.body;
//     }, [])

//     const chartToolPanelsDef = useMemo(() => {
//         return {
//             defaultToolPanel: 'data',
//             dataPanel: {
//                 groups: [
//                     { type: 'seriesChartType', isOpen: true },
//                     { type: 'series', isOpen: false },
//                 ],
//             },
//         };
//     }, [])

//     const onGridReady = useCallback((params) => {
//         // gridRef.current = params.api
//         // setup the fake server with entire dataset
//         const fakeServer = createFakeServer();
//         // create datasource with a reference to the fake server
//         const datasource = createServerSideDatasource(fakeServer);
//         // register the datasource with the grid
//         params.api.setServerSideDatasource(datasource);

//     }, []);

//     const gridOptions = {
//         defaultColDef: defaultColDef,
//         sideBar: sideBar,
//         rowGroupPanelShow: 'always',
//         rowSelection: 'multiple',
//         columnHoverHighlight: true,
//         suppressRowGroupHidesColumns: true,
//         columnDefs: columnDefs,
//         onGridReady: onGridReady,
//         rowModelType: 'serverSide',
//         cacheBlockSize: 50,
//         getChildCount: getChildCount,
//         popupParent: popupParent,
//         enableRangeSelection: true,
//         enableCharts: true,
//         chartToolPanelsDef: chartToolPanelsDef,
//         pivotMode:true,

//     }

//     const onBtReset = useCallback(() => {
//         gridRef.current.api.refreshServerSide({ purge: true });
//     }, []);
//     return (
//         // <div style={containerStyle}>
//         //     <div className="ag-theme-balham">
//         //         <AgGridReact
//         //             gridOptions={gridOptions}
//         //         />
//         //     </div>
//         //     <div className="nav justify-content-end mt-2" style={{ backgroundColor: '#f8f8f8' }}>

//         //         <span style={{ fontSize: 14, marginRight: 20 }}>Count {totalcount}  </span>
//         //     </div>
//         // </div>

//         <div className="mt-1" >

//             <div className="ag-theme-alpine" style={{ width: '100%', height: '90vh' }}>
//                 {/* <button className='btn btn-sm' onClick={onBtReset}>Reset Entire Grid</button> */}
//                 <AgGridReact
//                     gridOptions={gridOptions}
//                     ref={gridRef}
//                     autoGroupColumnDef={autoGroupColumnDef}
//                 />
//             </div>
//         </div>
//     )
// }


//----------------------------------------------------------------------------------------------------------
import { useState, useMemo, useCallback, useRef } from "react"
import { AgGridReact } from 'ag-grid-react' 
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-balham.css'
import 'ag-grid-enterprise'
import '../App.css'
import GetURI from '../components/URI';
let uri = GetURI();

export default function KeywordsFromHrefs() {

    const [totalcount, setTotalCount] = useState(0);
    const gridRef = useRef();

    const getChildCount = useCallback(
        (data) => {
            return data ? data.childCount : undefined
        },
        []
    )

    const popupParent = useMemo(() => {
        return document.body;
    }, [])

    const autoGroupColumnDef = {
        headerName: 'Group',
        width: 500, // Set the desired width for pivot groups
        cellRenderer: 'agGroupCellRenderer', // Use the built-in group cell renderer
    };
    const sideBar = useMemo(() => {
        return {
            toolPanels: [
                {
                    id: 'columns',
                    labelDefault: 'Columns',
                    labelKey: 'columns',
                    iconKey: 'columns',
                    toolPanel: 'agColumnsToolPanel',
                },
                {
                    id: 'filters',
                    labelDefault: 'Filters',
                    labelKey: 'filters',
                    iconKey: 'filter',
                    toolPanel: 'agFiltersToolPanel',
                },
                // {
                //     id: 'customStats',
                //     labelDefault: 'Custom Stats',
                //     labelKey: 'customStats',
                //     iconKey: 'custom-stats',
                //     toolPanel: CustomStatsToolPanel,
                // },
            ],
            defaultToolPanel: '',
        };
    }, []);

    const datasource = {
        getRows(params) {

            console.log(JSON.stringify(params.request, null, 1));

            fetch( uri +'/hrefkeywords', {
                method: 'post',
                body: JSON.stringify(params.request),
                headers: { "Content-Type": "application/json; charset=utf-8" }
            })
                .then(httpResponse => httpResponse.json())
                .then(response => {
                    params.successCallback(response.rows, response.lastRow);
                })
                .catch(error => {
                    console.error(error);
                    params.failCallback();
                })
        }
    };


    const onGridReady = useCallback((params) => {
        //console.log('grid is ready')
        gridOptions.api.setServerSideDatasource(datasource);
    }, []);

    const onRefresh = useCallback((params) => {
        console.log('refreshing')
        gridOptions.api.setServerSideDatasource(datasource);
    }, []);

    const containerStyle = useMemo(() => ({ width: '100%', height: '100%' }), []);

    const gridOptions = {

        rowModelType: 'serverSide',
        columnDefs: [
            { field: 'customUniqueKey', headerName: 'uniqueKey', filter: 'agTextColumnFilter', width: 300, headerClass: 'custom-header-class' },
            { field: 'domain', header: 'Domain', filter: 'agTextColumnFilter', width: 300, headerClass: 'custom-header-class', },
            { field: 'href', header: 'Href', filter: 'agTextColumnFilter', width: 400, headerClass: 'custom-header-class', rowGroup: true, rowGroupIndex: 1 },
            { field: 'keyword', header: 'Keywords', filter: 'agTextColumnFilter', width: 400, headerClass: 'custom-header-class', rowGroup: true, rowGroupIndex: 0 },
        ],

        defaultColDef: {
            editable: true,
            sortable: true,
            filter: true,
            resizable: true,
            floatingFilter: true,
            rowDrag: true,
            enableValue: true,
            enableRowGroup: true,
            enablePivot: true,
        },

        sideBar: sideBar,
        rowGroupPanelShow: 'always',
        rowSelection: 'multiple',
        columnHoverHighlight: true,
        suppressRowGroupHidesColumns: true,
        pivotMode: true,
        autoGroupColumnDef: autoGroupColumnDef,
        getChildCount: getChildCount,
        popupParent: popupParent,
        // debug: true,
        cacheBlockSize: 50,
        // maxBlocksInCache: 3,
        // purgeClosedRowNodes: true,
        // maxConcurrentDatasourceRequests: 2,
        // blockLoadDebounceMillis: 1000
    }

    return (
        <div className="mt-1" >
            <button type="button" onClick={onRefresh}>Refresh Data</button>
            <div className="ag-theme-alpine" style={{ width: '100%', height: '90vh' }}>
                {/* <button className='btn btn-sm' onClick={onBtReset}>Reset Entire Grid</button> */}
                <AgGridReact
                    gridOptions={gridOptions}
                    ref={gridRef}
                    onGridReady={onGridReady}
                //autoGroupColumnDef={autoGroupColumnDef}
                />
            </div>
        </div>
    )
}