const convertFiltersToSolrQuery = (
  agFilters,
  rowGroupCols,
  groupKeys //used for grouping
) => {
  const filters = Object.entries(agFilters)

  var columnWiseConditions = []

  filters.forEach((filterAppliedColumn) => {
    //if two conditions are there
    if (filterAppliedColumn[1]['conditions'] !== undefined)
      columnWiseConditions.push(
        convert_multipleConditions(
          filterAppliedColumn[0],
          filterAppliedColumn[1]
        )
      )
    //single condition is there
    else
      columnWiseConditions.push(
        convert_SingleCondition(filterAppliedColumn[0], filterAppliedColumn[1])
      )
  })


  if (groupKeys.length > 0) {
    groupKeys.forEach((key, index) => {
      // if (typeof key === 'string')
      const column_name = rowGroupCols[index].id

      if (key === '') {
        columnWiseConditions.push(`(*:* NOT ${column_name}:*)`)
      } else
        columnWiseConditions.push(
          `${column_name}:${encodeURIComponent(JSON.stringify(key))}` //
        )
      // else if (typeof key === 'number')
      //   columnWiseConditions.push(
      //     `${rowGroupCols[index].id}:${JSON.stringify(key)}`
      //   )
    })
  }

  var fq = columnWiseConditions.join(' AND ')

  // if (rowGroupCols.length > 0) {
  //   fq += ` {!collapse field=${rowGroupCols[rowGroupCols.length - 1].id}}`
  // }
  return fq
}

const convert_multipleConditions = (column_name, filter) => {
  return `(${convert_SingleCondition(column_name, filter.condition1)} ${
    filter.operator
  } ${convert_SingleCondition(column_name, filter.condition2)})`
}

const convert_SingleCondition = (column_name, filter) => {
  //filter ===>{filterType: 'number', type: 'greaterThan', filter: 100}
  var solrQueryForColumn = ''
  if (filter.filterType === 'text') {
    if (filter.type === 'equals') {
      solrQueryForColumn = `${column_name}:${filter.filter}`
    } else if (filter.type === 'notEqual') {
      solrQueryForColumn = `${column_name}:NOT ${filter.filter}`
    } else if (filter.type === 'contains') {
      solrQueryForColumn = `${column_name}:*${filter.filter}*`
    } else if (filter.type === 'notContains') {
      solrQueryForColumn = `${column_name}:NOT *${filter.filter}*`
    } else if (filter.type === 'startsWith') {
      solrQueryForColumn = `${column_name}:${filter.filter}*`
    } else if (filter.type === 'endsWith') {
      solrQueryForColumn = `${column_name}:*${filter.filter}`
    } else if (filter.type === 'blank') {
      solrQueryForColumn = `-${column_name}:*`
    } else if (filter.type === 'notBlank') {
      solrQueryForColumn = `${column_name}:*`
    }
  } else if (filter.filterType === 'number') {
    if (filter.type === 'equals') {
      solrQueryForColumn = `${column_name}:${filter.filter}`
    } else if (filter.type === 'notEqual') {
      solrQueryForColumn = `${column_name}:NOT ${filter.filter}`
    } else if (filter.type === 'greaterThan') {
      solrQueryForColumn = `${column_name}:{${filter.filter} TO *}`
    } else if (filter.type === 'greaterThanOrEqual') {
      solrQueryForColumn = `${column_name}:[${filter.filter} TO *}`
    } else if (filter.type === 'lessThan') {
      solrQueryForColumn = `${column_name}:{* TO ${filter.filter}}`
    } else if (filter.type === 'lessThanOrEqual') {
      solrQueryForColumn = `${column_name}:[* TO ${filter.filter}]`
    } else if (filter.type === 'inRange') {
      solrQueryForColumn = `${column_name}:[${filter.filter} TO ${filter.filterTo}]`
    } else if (filter.type === 'blank') {
      solrQueryForColumn = `(*:* NOT ${column_name}:*)`
    } else if (filter.type === 'notBlank') {
      solrQueryForColumn = `${column_name}:*`
    }
  }

  return solrQueryForColumn
}

const convertSortToSolrQuery = (sortModel, rowGroupCols) => {
  //${rowGroupCols[rowGroupCols.length - 1].id}
  var sortFields = []
  if (sortModel && sortModel.length > 0) {
    sortFields = sortModel.map((sort) => {
      const fieldName = sort.colId // Assuming the column ID in ag-Grid matches the Solr field name
      const sortDirection = sort.sort === 'asc' ? 'asc' : 'desc'
      return `${fieldName} ${sortDirection}`
    })
  }
  return sortFields.join(',')
}

const convertGroupToSolrQuery = (groupCols, groupKeys) => {
  if (groupCols.length > 0) {
    const groupFieldNames = groupCols.map((col) => col.id)
    const groupFieldKeys = groupKeys

    var groupQuery = ``
    if (groupFieldKeys.length === 0) {
      const colName = groupFieldNames[0]
      groupQuery += `&group=true&group.field=${colName}&sort=${colName} asc`
    } else if (groupFieldNames.length > groupFieldKeys.length) {
      const colName = groupFieldNames[groupFieldKeys.length]
      groupQuery += `&group=true&group.field=${colName}&sort=${colName} asc`
    }

    return groupQuery
  } else return false
}

const convertPivotToSolrQuery = (
  pivotCols,
  pivotKeys,
  pivotAggregationFunctions,
  start,
  rows
) => {
  if (pivotCols.length > 0) {
    const pivotFieldNames = pivotCols.map((col) => col.id)
    const pivotFieldKeys = pivotKeys

    var group_field = {}
    group_field.type = 'terms'

    if (pivotFieldKeys.length === 0) {
      const colName = pivotFieldNames[0]
      group_field.field = colName
    } else if (pivotFieldNames.length > pivotFieldKeys.length) {
      const colName = pivotFieldNames[pivotFieldKeys.length]
      group_field.field = colName
    }

    group_field.limit = rows
    group_field.offset = start

    group_field.facet = {}
    pivotAggregationFunctions.forEach((colFunction) => {
      const colName = colFunction.id
      // const colDislplayName = colFunction.displayName
      const aggFunction = colFunction.aggFunc
      group_field.facet[`${colName}`] = `${aggFunction}(${colName})`
    })

    return `&json.facet={"group_field":${JSON.stringify(group_field)}}`
  } else return false
}

export {
  convertFiltersToSolrQuery,
  convertSortToSolrQuery,
  convertGroupToSolrQuery,
  convertPivotToSolrQuery,
}

