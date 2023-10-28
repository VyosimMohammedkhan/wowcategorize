import React, { useMemo } from 'react';
import '../App.css';

const CustomTooltipForTotalCount = (props) => {
    const data = useMemo(
        () => props.api.getDisplayedRowAtIndex(props.rowIndex).data,
        []
    );

    let externalDomains = data.ExternalDomains.split(',')
    return (
        <div className="container">
            <div className="custom-tooltip2" style={{ backgroundColor: 'white', color: 'black' }} >
                {externalDomains.map((domain, index) => (
                    <p key={index} className='mb-0'>
                        {domain}
                    </p>
                ))}
            </div>
        </div>
    );
};

export default CustomTooltipForTotalCount;