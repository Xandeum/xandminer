import { FC } from 'react';
import Link from "next/link";
import dynamic from 'next/dynamic';
import React from "react";
import { useAutoConnect } from '../contexts/AutoConnectProvider';
import NetworkSwitcher from './NetworkSwitcher';
import logo from "../assets/XANDEUM_Logo.png"
import logoText from "../assets/XANDEUM_LOGO_WHITE.png"
import Image from 'next/image';

const WalletMultiButtonDynamic = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
);

export const AppBar: React.FC = () => {
  const { autoConnect, setAutoConnect } = useAutoConnect();
  return (
    <div>
      {/* NavBar / Header */}
      <div className="navbar flex h-20 flex-row md:mb-2 shadow-lg bg-black text-neutral-content border-b border-zinc-600 bg-opacity-66">
        <div className="navbar-start items-center">
          {/* <div className="hidden md:flex flex-row items-center justify-between  h-22 md:p-2 ml-10"> */}
          <Link href="https://xandeum.com" target="_blank" rel="noopener noreferrer" passHref className="text-secondary hover:text-white hidden md:flex flex-row items-end md:p-2 ml-10">
            {/* <Image
                src={logoText}
                alt="Xandeum logo"
                width={240}
                height={40}
                priority
              /> */}
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
          {/* </div> */}
          <div className="inline-flex md:hidden w-22 h-22 md:p-2 ml-4">
            <Link href="https://xandeum.com" target="_blank" rel="noopener noreferrer" passHref className="text-secondary hover:text-white">
              <Image
                src={logo}
                alt="Xandeum logo"
                width={60}
                height={40}
                priority
              />
            </Link>
          </div>
        </div>

        {/* Nav Links */}
        {/* Wallet & Settings */}
        <div className="navbar-end">

        </div>
      </div>
    </div>
  );
};