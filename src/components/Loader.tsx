import React from 'react';
import CircularProgress from '@mui/material/CircularProgress';

function Loader() {
    return (
        <div className='flex flex-row items-center justify-center h-fit w-fit'>
            <CircularProgress size={20} sx={{ color: '#fda31b' }} />
        </div>
    )
}

export default Loader