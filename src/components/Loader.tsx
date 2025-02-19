import React from 'react';

function Loader() {
    return (
        <div className='flex flex-row items-center justify-center h-fit w-fit'>
            <span className="loading loading-bars loading-md"></span>
        </div>
    )
}

export default Loader