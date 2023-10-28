const mysql = require('mysql');

const connection = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'password'
});


function getData(request, tablename, resultsCallback) {
    try {
        const SQL = buildSql(request, tablename);

        connection.query(SQL, (error, results) => {
            if (error) {
                console.log(error)
            }
            const rowCount = getRowCount(request, results);
            const resultsForPage = cutResultsToPageSize(request, results);

            resultsCallback(resultsForPage, rowCount);
        });
    } catch (err) {
        console.log(err)
    }

}

function buildSql(request, tablename) {

    const selectSql = createSelectSql(request);
    const fromSql = tablename;
    const whereSql = createWhereSql(request);
    const limitSql = createLimitSql(request);

    const orderBySql = createOrderBySql(request);
    const groupBySql = createGroupBySql(request);

    const SQL = selectSql + fromSql + whereSql + groupBySql + orderBySql + limitSql;

    console.log(SQL);

    return SQL;
}

function createSelectSql(request) {
    const rowGroupCols = request.rowGroupCols;
    const valueCols = request.valueCols;
    const groupKeys = request.groupKeys;

    if (isDoingGrouping(rowGroupCols, groupKeys)) {
        const colsToSelect = [];

        const rowGroupCol = rowGroupCols[groupKeys.length];
        colsToSelect.push(rowGroupCol.field);

        valueCols.forEach(function (valueCol) {
            colsToSelect.push(valueCol.aggFunc + '(' + valueCol.field + ') as ' + valueCol.field);
        });
        colsToSelect.push('count(*) as childCount')
        return ' select ' + colsToSelect.join(', ');
    }

    return ' select *';
}

function createFilterSql(key, item) {
    switch (item.filterType) {
        case 'text':
            return createTextFilterSql(key, item);
        case 'number':
            return createNumberFilterSql(key, item);
        default:
            console.log('unkonwn filter type: ' + item.filterType);
    }
}

function createNumberFilterSql(key, item) {
    switch (item.type) {
        case 'equals':
            return key + ' = ' + item.filter;
        case 'notEqual':
            return key + ' != ' + item.filter;
        case 'greaterThan':
            return key + ' > ' + item.filter;
        case 'greaterThanOrEqual':
            return key + ' >= ' + item.filter;
        case 'lessThan':
            return key + ' < ' + item.filter;
        case 'lessThanOrEqual':
            return key + ' <= ' + item.filter;
        case 'inRange':
            return '(' + key + ' >= ' + item.filter + ' and ' + key + ' <= ' + item.filterTo + ')';
        default:
            console.log('unknown number filter type: ' + item.type);
            return 'true';
    }
}

function createTextFilterSql(key, item) {
    switch (item.type) {
        case 'equals':
            return key + ' = "' + item.filter + '"';
        case 'notEqual':
            return key + ' != "' + item.filter + '"';
        case 'contains':
            return key + ' like "%' + item.filter + '%"';
        case 'notContains':
            return key + ' not like "%' + item.filter + '%"';
        case 'startsWith':
            return key + ' like "' + item.filter + '%"';
        case 'endsWith':
            return key + ' like "%' + item.filter + '"';
        default:
            console.log('unknown text filter type: ' + item.type);
            return 'true';
    }
}

function createWhereSql(request) {
    const rowGroupCols = request.rowGroupCols;
    const groupKeys = request.groupKeys;
    const filterModel = request.filterModel;

    const that = this;
    const whereParts = [];

    if (groupKeys.length > 0) {
        groupKeys.forEach(function (key, index) {
            const colName = rowGroupCols[index].field;
            whereParts.push(colName + ' = "' + key + '"')
        });
    }

    if (filterModel) {
        const keySet = Object.keys(filterModel);
        keySet.forEach(function (key) {
            const item = filterModel[key];
            whereParts.push(createFilterSql(key, item));
        });
    }

    if (whereParts.length > 0) {
        return ' where ' + whereParts.join(' and ');
    } else {
        return '';
    }
}

function createGroupBySql(request) {
    const rowGroupCols = request.rowGroupCols;
    const groupKeys = request.groupKeys;

    if (isDoingGrouping(rowGroupCols, groupKeys)) {
        const colsToGroupBy = [];

        const rowGroupCol = rowGroupCols[groupKeys.length];
        colsToGroupBy.push(rowGroupCol.field);

        return ' group by ' + colsToGroupBy.join(', ');
    } else {
        // select all columns
        return '';
    }
}

function createOrderBySql(request) {
    const rowGroupCols = request.rowGroupCols;
    const groupKeys = request.groupKeys;
    const sortModel = request.sortModel;
    const grouping = isDoingGrouping(rowGroupCols, groupKeys);

    const sortParts = [];
    if (sortModel) {
        const groupColIds = rowGroupCols.map(groupCol => groupCol.id).slice(0, groupKeys.length + 1);
        const rowColIds = sortModel.map(col => col.colId);

        sortModel.forEach(function (item) {
            if (grouping) {
                sortParts.push('childCount ' + item.sort);
            } else if (!groupColIds.indexOf(item.colId) < 0) {
                sortParts.push(item.colId + ' ' + item.sort);
            } else if (!(rowColIds.indexOf(item.colId) < 0)) {
                sortParts.push(item.colId + ' ' + item.sort);
            }
        });
    }

    if (sortParts.length > 0) {
        return ' order by ' + sortParts.join(', ');
    } else {
        return '';
    }
}

function isDoingGrouping(rowGroupCols, groupKeys) {
    // we are not doing grouping if at the lowest level. we are at the lowest level
    // if we are grouping by more columns than we have keys for (that means the user
    // has not expanded a lowest level group, OR we are not grouping at all).
    return rowGroupCols.length > groupKeys.length;
}

function createLimitSql(request) {
    const startRow = request.startRow;
    const endRow = request.endRow;
    const pageSize = endRow - startRow;
    return ' limit ' + (pageSize + 1) + ' offset ' + startRow //== 0 ? 0 : (startRow + 1);
}

function getRowCount(request, results) {
    if (results === null || results === undefined || results.length === 0) {
        return null;
    }
    const currentLastRow = request.startRow + results.length;
    return currentLastRow <= request.endRow ? currentLastRow : -1;
}

function cutResultsToPageSize(request, results) {
    const pageSize = request.endRow - request.startRow;
    if (results && results.length > pageSize) {
        return results.splice(0, pageSize);
    } else {
        return results;
    }
}

module.exports = getData