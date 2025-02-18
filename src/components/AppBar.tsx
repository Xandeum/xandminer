import { FC, useEffect, useState } from 'react';
import Link from "next/link";
import dynamic from 'next/dynamic';
import React from "react";
import { useAutoConnect } from '../contexts/AutoConnectProvider';
import NetworkSwitcher from './NetworkSwitcher';
import logo from "../assets/XANDEUM_Logo.png"
import XANDEUM_LOGO from "../assets/XANDEUM_NEW_LOGO.png"

// import logoText from "../assets/XANDEUM_LOGO_WHITE.png"
import Image from 'next/image';
import { UrlUpdateModal } from 'modals/urlUpdateModal';
import { TextField } from '@mui/material';
import { useUrlConfiguration } from '../contexts/UrlProvider';

const WalletMultiButtonDynamic = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
);

export const AppBar: React.FC = () => {
  const { autoConnect, setAutoConnect } = useAutoConnect();
  const { urlConfiguration } = useUrlConfiguration()
  const [showUrlModal, setShowUrlModal] = React.useState(false);

  const [storedText, setStoredText] = useState<string | null>('');

  useEffect(() => {
    if (urlConfiguration) {
      setStoredText(urlConfiguration)
    }
  }, [urlConfiguration])


  return (
    <div>
      {/* NavBar / Header */}
      <div className="navbar flex py-0 flex-row md:mb-2 shadow-lg bg-black text-neutral-content border-b border-zinc-600 bg-opacity-66">
        <div className="hidden md:flex md:navbar-start items-center">
          <div className="hidden md:inline md:p-2 ml-10 md:mt-3">
            <Link href="https://xandeum.network" target="_blank" rel="noopener noreferrer" passHref className="text-secondary hover:text-white">
              <Image
                src={XANDEUM_LOGO}
                alt="Xandeum logo"
                width={280}
                height={60}
                priority
              />
            </Link>
          </div>

        </div>

        <div className="navbar-start md:navbar-center items-start md:items-center flex-col ml-2 md:ml-0">
          <Link href="/" target="_self" rel="noopener noreferrer" passHref className="text-secondary hover:text-white  flex flex-row items-end md:p-2 ">
            <Image
              src={logo}
              alt="Xandeum logo"
              width={60}
              height={40}
              priority
              className='h-30 w-10 md:h-10 md:w-16'
            />
            <h1 className="text-2xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-[#fff] to-[#fff]">
              XandMiner
            </h1>
          </Link>
        </div>

        {/* Navbar end */}

        <div className="navbar-end pr-2 md:pr-10">
          <div className="inline-flex items-center justify-center gap-6">
            {/* <Link href={"/store"} className='text-white hover:text-[#fda31b]'>Store</Link> */}

            <span className='text-[#fda31b] hover:text-white hover:cursor-pointer' onClick={() => { setShowUrlModal(true) }}>
              {storedText}
            </span>
            <div className='hidden md:flex items-center gap-4'>
              <WalletMultiButtonDynamic className="btn-ghost btn-sm rounded-btn text-lg mr-6" />
            </div>

          </div>
        </div>
      </div>
      {showUrlModal &&
        <UrlUpdateModal openModal={() => setShowUrlModal(true)} closeModal={() => setShowUrlModal(false)} />
      }
    </div >
  );
};