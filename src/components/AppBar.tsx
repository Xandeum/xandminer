import { FC, useEffect, useState } from 'react';
import Link from "next/link";
import dynamic from 'next/dynamic';
import React from "react";
import { useAutoConnect } from '../contexts/AutoConnectProvider';
import NetworkSwitcher from './NetworkSwitcher';
import logo from "../assets/XANDEUM_Logo.png"
import logoText from "../assets/XANDEUM_LOGO_WHITE.png"
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
      <div className="navbar flex h-20 flex-row md:mb-2 shadow-lg bg-black text-neutral-content border-b border-zinc-600 bg-opacity-66">
        <div className="navbar-start items-center">
          {/* <div className="hidden md:flex flex-row items-center justify-between  h-22 md:p-2 ml-10"> */}
          <Link href="https://xandeum.com" target="_blank" rel="noopener noreferrer" passHref className="text-secondary hover:text-white hidden md:flex flex-row items-end md:p-2 ml-10">
            <Image
              src={logoText}
              alt="Xandeum logo"
              width={240}
              height={40}
              priority
            />
            {/* <Image
              src={logo}
              alt="Xandeum logo"
              width={60}
              height={40}
              priority
            />
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-[#fff] to-[#fff]">
              XandMiner
            </h1> */}
          </Link>
          {/* </div> */}

        </div>

        <div className="navbar-center items-center flex-col">
          {/* <div className="hidden md:flex flex-row items-center justify-between  h-22 md:p-2 ml-10"> */}
          <Link href="/" target="_self" rel="noopener noreferrer" passHref className="text-secondary hover:text-white  flex flex-row items-end md:p-2 ">
            <Image
              src={logo}
              alt="Xandeum logo"
              width={60}
              height={40}
              priority
            />
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-[#fff] to-[#fff]">
              XandMiner
            </h1>
          </Link>
          {/* <div className="inline-flex md:hidden w-22 h-22 md:p-2 ml-4">
            <Link href="https://xandeum.com" target="_blank" rel="noopener noreferrer" passHref className="text-secondary hover:text-white">
              <Image
                src={logo}
                alt="Xandeum logo"
                width={60}
                height={40}
                priority
              />
            </Link> */}
        </div>

        {/* Navbar end */}

        <div className="navbar-end pr-10">
          <div className="hidden md:inline-flex items-center justify-center gap-6">
            <Link href={"/store"} className='text-white hover:text-[#fda31b]'>Store</Link>

            <span className='text-[#fda31b] hover:text-white hover:cursor-pointer' onClick={() => { setShowUrlModal(true) }}>
              {storedText}
            </span>
            {/* <span className='hover:cursor-default'>Devnet Version</span> */}
            <WalletMultiButtonDynamic className="btn-ghost btn-sm rounded-btn text-lg mr-6 " />

          </div>
          {/* <div>
            <span className="absolute block h-0.5 w-12 bg-zinc-600 rotate-90 right-14"></span>
          </div>
          <div className="dropdown dropdown-end">
            <div tabIndex={0} className="btn btn-square btn-ghost text-right mr-4">
              <svg className="w-7 h-7" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <ul tabIndex={0} className="p-2 shadow menu dropdown-content bg-base-100 rounded-box sm:w-52">
              <li>
                <div className="form-control bg-opacity-100">
                  <label className="cursor-pointer label">
                    <a>Autoconnect</a>
                    <input type="checkbox" checked={autoConnect} onChange={(e) => setAutoConnect(e.target.checked)} className="toggle" />
                  </label>
                  <NetworkSwitcher />
                </div>
              </li>
            </ul>
          </div> */}
        </div>
      </div>
      {showUrlModal &&
        <UrlUpdateModal openModal={() => setShowUrlModal(true)} closeModal={() => setShowUrlModal(false)} />
      }
    </div >
  );
};