import React, { useEffect, useState } from 'react';
import GetURI from '../components/URI';
let uri=GetURI();
export default function KeywordsPage() {
  const [tableData, setTableData] = useState([]);
  const [isDataUpdated, setIsDataUpdated] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Fetch data from the API
    fetch(uri+'/keywords')
      .then(response => response.json())
      .then(data => {
        // Convert the JSON object to an array of key-value pairs
        const formattedData = Object.entries(data).map(([key, value]) => ({
          key,
          value
        }));
        setTableData(formattedData);
      })
      .catch(error => {
        console.log('Error fetching data:', error);
      });
  }, []);

  const handleValueChange = (key, newValue) => {
    setTableData(prevData => {
      const updatedData = prevData.map(row => {
        if (row.key === key) {
          return { ...row, value: newValue };
        }
        return row;
      });
      return updatedData;
    });
    setIsDataUpdated(true);
  };

  const handleDataUpdate = () => {
    // Prepare the updated JSON data
    const updatedData = {};
    tableData.forEach(row => {
      let valuesArray;
      if (typeof row.value === 'string') {
        valuesArray = row.value.split(',').map(value => value.trim());
      } else {
        // Handle non-string value (e.g., if it's not editable or invalid input)
        valuesArray = row.value;
      }
      updatedData[row.key] = valuesArray;
    });
  
    // Post the updated data to the API
    fetch(uri+'/keywords', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatedData)
    })     .then(response => {
      if (response.ok) {
        setIsDataUpdated(false);
        setMessage('Data updated successfully');
      } else {
        setMessage('Failed to update data');
      }
    })
    .catch(error => {
      console.log('Error updating data:', error);
      setMessage('Error updating data');
    });
};
  
  


  return (<div style={{padding:'20px'}}>
    <div className='custom-table' >
    <table className='table table-hover' style={{ tableLayout: 'auto' }}>
  <thead className='thead-dark' >
    <tr>
      <th style={{width:'8%'}}>Categories</th>
      <th style={{ textAlign: 'center' }}>Keywords</th>
    </tr>
  </thead>
  <tbody>
    {tableData.map(row => (
      <tr key={row.key}>
        <td>{row.key}</td>
        <td>
          <input
            type="text"
            value={row.value}
            onChange={e => handleValueChange(row.key, e.target.value)}
            style={{ width: '98%', borderRadius: '3px' }}
          />
        </td>
      </tr>
    ))}
  </tbody>
</table>

      </div>
      <div style={{display: 'flex'}}>
      {message && <p style={{margin:'20px'}}>{message}</p>}
      <button className='btn btn-primary' onClick={handleDataUpdate} disabled={!isDataUpdated} style={{position:'absolute', right:'10%',margin:'20px'}}>
        Update Keywords
      </button>
      </div>
    </div>);
};