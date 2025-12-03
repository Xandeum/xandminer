import React from 'react';
import CircularProgress from '@mui/material/CircularProgress';

function Loader({ color }: { color?: string }) {
    return (
        <div className='flex flex-row items-center justify-center h-fit w-fit p-1'>
            <CircularProgress size={20} sx={{ color: color || '#fda31b' }} />
        </div>
    )
}

export default Loader