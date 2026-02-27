import { useState } from 'react';
import Link from "next/link";
import dynamic from 'next/dynamic';
import React from "react";
import { useAutoConnect } from '../contexts/AutoConnectProvider';
import logo from "../assets/XANDEUM_Logo.png"
import XANDEUM_LOGO from "../assets/XANDEUM_NEW_LOGO.png"

import Image from 'next/image';
import { RpcEndpointUpdateModal } from '../modals/rpcEndpointUpdateModal';
import { useRpcConfiguration } from 'contexts/RpcProvider';

const WalletMultiButtonDynamic = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
);

export const AppBar: React.FC = () => {
  const { autoConnect, setAutoConnect } = useAutoConnect();
  const { rpcEndpoint } = useRpcConfiguration();
  const [showRpcModal, setShowRpcModal] = React.useState(false);

  const [storedText, setStoredText] = useState<string | null>('');

  return (
    <div>
      {/* NavBar / Header */}
      <div className="navbar flex py-0 flex-row md:mb-2 shadow-lg bg-black text-neutral-content border-b border-zinc-600 bg-opacity-66">
        <div className="hidden md:flex md:navbar-start items-center">
          <div className="hidden md:inline md:p-2 ml-10 md:mt-3">
            <Image
              src={XANDEUM_LOGO}
              alt="Xandeum logo"
              width={280}
              height={60}
              priority
            />
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
          <div className="inline-flex items-center justify-center">
            <div className='flex md:gap-4 md:flex-row flex-col items-end md:pb-0 py-4 gap-1 md:items-baseline'>
              <button
                className="btn btn-ghost btn-sm rounded-btn text-base normal-case"
                onClick={() => setShowRpcModal(true)}
              >
                {
                  rpcEndpoint ?
                    rpcEndpoint?.slice(0, 15) + "..." + rpcEndpoint?.slice(-10)
                    :
                    "Set RPC"
                }
              </button>
              <WalletMultiButtonDynamic className="btn-ghost btn-sm rounded-btn text-lg mr-6" />
            </div>

          </div>
        </div>
        {showRpcModal && (
          <RpcEndpointUpdateModal
            closeModal={() => setShowRpcModal(false)}
            openModal={() => setShowRpcModal(true)}
          />
        )}
      </div>
    </div >
  );
};