import React from 'react';

export class RenderedHTML extends React.Component {
    renderContent(props) {
        try {
            // Code that may throw an error
            return <div style={{maxHeight:'100%', maxWidth:'100%'}}>
                {
                    this.props.htmlData.map(item => (
                        <div className='mb-3' style={{ borderStyle: 'solid', borderWidth: "2px", borderColor: 'black', borderRadius: '5px', padding: "2%" }}>
                            <p className='mb-0 text-primary text-center ' style={{ borderStyle: 'solid', borderWidth: "2px", borderColor: 'black', borderRadius: '5px' }}>LinkText : {item[0]}</p>
                            <div dangerouslySetInnerHTML={{ __html: (item[1]) }}></div>
                            <br />
                        </div>
                    ))
                }
            </div>;
        } catch (error) {
            // Handle the error
            console.error('An error occurred:', error);
            return <p>An error occurred while rendering the content.<br /> Content may contain invalid HTML</p>;
        }
    }

    render() {
        return (
            <div>
                {/* Other JSX */}
                {this.renderContent()}
                {/* Other JSX */}
            </div>
        );
    }
}

