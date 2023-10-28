import React, { useMemo } from 'react';
import '../App.css';

 const CustomTooltipForCategories= (props) => {
    const data = useMemo(
      () => props.api.getDisplayedRowAtIndex(props.rowIndex).data,
      []
    );
  
    return (
      <div className="container">
      <div className="custom-tooltip" style={{ backgroundColor: 'white', color: 'black' }}
      >
        <p className='mb-0'>
          <span>URL: </span>{data.HREF}
        </p>
        <p className='mb-0'>
          <span>linkText: </span> {data.linkText}
        </p>
        <p className='mb-0'>
          <span>keywordFound: </span> {data.keywordFound}
        </p>
      </div>
      </div>
    );
  };
  
  export default CustomTooltipForCategories;