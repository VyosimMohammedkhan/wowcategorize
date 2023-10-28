import React, { useMemo } from 'react';
import '../App.css';

 const CustomTooltipForMetaData= (props) => {
    const data = useMemo(
      () => props.api.getDisplayedRowAtIndex(props.rowIndex).data,
      []
    );
  
    return (
      <div className="container">
      <div
        className="custom-tooltip1"
        style={{ backgroundColor: 'white', color: 'black' }}
      >
        <p className='mb-0'>
          <span>metaTag : </span>{data.metaTagName}
        </p>
        <p className='mb-0'>
          <span>Value : </span> {data.value}
        </p>
      </div>
      </div>
    );
  };
  
  export default CustomTooltipForMetaData;