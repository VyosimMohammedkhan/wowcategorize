import { useState, useMemo, useCallback, useRef } from "react"
import { AgGridReact } from 'ag-grid-react'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-balham.css'
import 'ag-grid-enterprise'
import '../App.css'
import GetURI from '../components/URI';
import CustomTooltipForTotalCount from "../tooltips/externalDomainsTooltip";
let uri = GetURI();

export default function AllCrawledDomains() {

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

            fetch(uri + '/allcrawleddomains', {
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

    const isNonEnglishCustomCellRenderer = ({ value }) => {
        return value ? '' : 1;
    };

    const containerStyle = useMemo(() => ({ width: '100%', height: '100%' }), []);

    const gridOptions = {
        rowModelType: 'serverSide',
        columnDefs: [
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
            { field: 'Exclude_url', width: 100, headerClass: 'custom-header-class' },
            { field: 'Total_Count', width: 120, headerClass: 'custom-header-class', cellStyle: { textAlign: "center" } },
            { field: 'Total_Single_Count', width: 160, headerClass: 'custom-header-class', cellStyle: { textAlign: "center" } },
            { field: 'Unique_internal_links_Count', width: 180, headerClass: 'custom-header-class', cellStyle: { textAlign: "center" } },
            { field: 'Unique_External_Domains_Count', tooltipField: 'Unique_External_Domains_Count', width: 180, headerClass: 'custom-header-class', cellStyle: { textAlign: "center" } },
            { field: 'is_nonEnglish', headerClass: 'custom-header-class', cellStyle: { textAlign: "center" }, cellRendererFramework: isNonEnglishCustomCellRenderer },
            { field: 'redirectedUrl', headerClass: 'custom-header-class', aggFunc: null },
            { field: 'ExternalDomains', headerClass: 'custom-header-class', hide: 'true' }
        ],

        defaultColDef: {
            editable: true,
            sortable: true,
            //filter: true,
            resizable: true,
            //floatingFilter: true,
            //rowDrag: true,
            enableValue: true,
            enableRowGroup: true,
            enablePivot: true,
            tooltipComponent: CustomTooltipForTotalCount
        },

        sideBar: sideBar,
        //rowGroupPanelShow: 'always',
        rowSelection: 'multiple',
        columnHoverHighlight: true,
        suppressRowGroupHidesColumns: true,
        //pivotMode: true,
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