import React from 'react';
import dynamic from 'next/dynamic';
const Lottie = dynamic(import("lottie-react"), { ssr: false });
import animationData from '../assets/LoadingBars.json';

function Loader() {
    return (
        <div>
            <Lottie animationData={animationData} className='w-[1.5rem] h-auto' />
        </div>
    )
}

export default Loader