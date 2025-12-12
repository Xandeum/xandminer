'use client';
import { FC, useEffect, useState } from "react";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import Loader from "components/Loader";
import { fetchOwnerData, fetchPNodeOwnerData, registerOwner, registerRewardWallet } from "helpers/manageHelpers";
import dynamic from "next/dynamic";
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';

import { notify } from "utils/notifications";
import { readMetaplexMetadata } from "helpers/tokenHelpers";
import { readPnodeInfoArray } from "helpers/pNodeHelpers";
import { OwnerView } from "views/owner";
import Link from "next/link";
const WalletMultiButtonDynamic = dynamic(
    async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
    { ssr: false }
);

export const ManageView: FC = ({ }) => {

    const wallet = useWallet();
    const connection = new Connection('https://devnet.helius-rpc.com/?api-key=2aca1e9b-9f51-44a0-938b-89dc6c23e9b4', 'confirmed');
    // const { connection } = useConnection();
    const [pnodesQty, setPnodesQty] = useState<number>(0);
    const [nftQty, setNftQty] = useState<number>(0);

    const [isLoading, setIsLoading] = useState(true);
    const [isRegistered, setIsRegistered] = useState(false);
    const [hasPnode, setHasPNode] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showPopupRegisterOwner, setShowPopupRegisterOwner] = useState(false);
    const [rewardsWallet, setRewardsWallet] = useState({
        value: '',
        processing: false
    });
    const [isRewardsWalletEditing, setIsRewardsWalletEditing] = useState<boolean>(false);

    useEffect(() => {
        fetchData();
    }, [wallet, wallet?.publicKey]);

    const fetchData = async () => {
        try {
            setIsLoading(true);
            if (!wallet || !wallet.publicKey) {
                setIsLoading(false);
                return;
            }

            const nfts = await readMetaplexMetadata(connection.rpcEndpoint, wallet?.publicKey?.toString());
            setNftQty(nfts?.length)

            const pnodeInfoArray = await readPnodeInfoArray(connection, wallet?.publicKey);
            const pNodeOwnerData = await fetchPNodeOwnerData(connection, wallet?.publicKey);

            // ask user to register if owner PDA is not there
            if (pnodeInfoArray == null) {
                if (pNodeOwnerData?.pnode && Number(pNodeOwnerData?.pnode) > 0) {
                    setShowPopupRegisterOwner(true);
                    setIsLoading(false);
                    return;
                } else {
                    setIsLoading(false);
                    return;
                }
            }

            const OwnerData = await fetchOwnerData(connection, wallet?.publicKey);
            setHasPNode(Number(pNodeOwnerData?.pnode) > 0);

            if (pNodeOwnerData?.pnode && Number(pNodeOwnerData?.pnode) > 0) {
                setRewardsWallet({ ...rewardsWallet, value: OwnerData?.rewardsWallet?.toString() || '' });
                setPnodesQty(Number(pNodeOwnerData?.pnode));
                setIsLoading(false);

            } else {
                setIsLoading(false);
            }

        } catch (error) {
            console.error("Fetch data error:", error);
            notify({ type: 'error', message: `Failed to fetch data: ${error?.message || error}` });
            setIsLoading(false);
        }
    }

    const onOwnerRegister = async () => {
        try {
            setIsProcessing(true);
            const txIx = await registerOwner(wallet?.publicKey);

            if (txIx && typeof txIx === 'object' && 'error' in txIx) {
                notify({ type: 'error', message: `${(txIx as any).error}` });
                setIsProcessing(false);
                setShowPopupRegisterOwner(false);
                return;
            }
            const transaction = new Transaction();
            transaction.add(txIx as TransactionInstruction);

            const {
                context: { slot: minContextSlot },
                value: { blockhash, lastValidBlockHeight }
            } = await connection.getLatestBlockhashAndContext('confirmed');

            transaction.recentBlockhash = blockhash;
            transaction.feePayer = wallet.publicKey;
            // const signedTx = await wallet.signTransaction(transaction);

            // const simulate = await connection.simulateTransaction(signedTx);
            // console.log("simulate >>> ", simulate);
            // return;

            const tx = await wallet.sendTransaction(transaction, connection, {
                minContextSlot,
                skipPreflight: true,
                preflightCommitment: 'confirmed'
            });

            await new Promise((resolve) => setTimeout(resolve
                , 4000));

            const confirmTx = await connection?.getSignatureStatuses([tx], { searchTransactionHistory: true });

            // Check if the transaction failed
            const status = confirmTx?.value[0];

            if (!status) {
                notify({ type: 'error', message: 'Unable to detect transaction status', description: `It may have passed or failed. Please check it on an explorer` });
                setIsProcessing(false);
                setShowPopupRegisterOwner(false);
                return;
            }

            if (status?.err) {
                notify({ type: 'error', message: 'Transaction failed!', description: `${confirmTx?.value[0]?.err?.toString()}` });
                setIsProcessing(false);
                setShowPopupRegisterOwner(false);
                return;
            } else {
                notify({ type: 'success', message: 'Transaction confirmed!', description: "Owner has been registered successfully.", txid: tx });
                setIsProcessing(false);
                setShowPopupRegisterOwner(false);
                await fetchData();
                return;
            }
        } catch (error) {
            notify({ type: 'error', message: `Registration failed: ${error?.message || error}` });
            setIsProcessing(false);
            setShowPopupRegisterOwner(false);
        }
    }

    const onRewardWalletRegister = async () => {
        setRewardsWallet({ ...rewardsWallet, processing: true });

        // check if rewards wallet is valid public key
        try {

            if (!rewardsWallet?.value || rewardsWallet?.value == '' || !PublicKey.isOnCurve(new PublicKey(rewardsWallet?.value))) {
                notify({ type: 'error', message: `Please enter a valid public key for rewards wallet.` });

                return;
            }

            const txIx = await registerRewardWallet(wallet?.publicKey, new PublicKey(rewardsWallet?.value));

            if (txIx && typeof txIx === 'object' && 'error' in txIx) {
                notify({ type: 'error', message: `${(txIx as any).error}` });
                setRewardsWallet({ ...rewardsWallet, processing: false });
                return;
            }
            const transaction = new Transaction();
            transaction.add(txIx as TransactionInstruction);

            const {
                context: { slot: minContextSlot },
                value: { blockhash, lastValidBlockHeight }
            } = await connection.getLatestBlockhashAndContext('confirmed');

            transaction.recentBlockhash = blockhash;
            transaction.feePayer = wallet.publicKey;

            // Sign and simulate the transaction
            // const signedTx = await wallet.signTransaction(transaction);
            // const simulate = await connection.simulateTransaction(signedTx);
            // console.log("simulate >>> ", simulate);
            // return;

            const tx = await wallet.sendTransaction(transaction, connection, {
                minContextSlot,
                skipPreflight: true,
                preflightCommitment: 'confirmed'
            });

            await new Promise((resolve) => setTimeout(resolve
                , 4000));

            const confirmTx = await connection?.getSignatureStatuses([tx], { searchTransactionHistory: true });

            // Check if the transaction failed
            const status = confirmTx?.value[0];

            if (!status) {
                notify({ type: 'error', message: 'Unable to detect transaction status', description: `It may have passed or failed. Please check it on an explorer` });
                setRewardsWallet({ ...rewardsWallet, processing: false });
                setShowPopupRegisterOwner(false);
                return;
            }

            if (status?.err) {
                notify({ type: 'error', message: 'Transaction failed!', description: `${confirmTx?.value[0]?.err?.toString()}` });
                setRewardsWallet({ ...rewardsWallet, processing: false });
                return;
            } else {
                notify({ type: 'success', message: 'Transaction confirmed!', description: "Reward wallet has been updated successfully." });
                setRewardsWallet({ ...rewardsWallet, processing: false });
                setIsRewardsWalletEditing(false);
                await fetchData();
                return;
            }
        } catch (error) {
            notify({ type: 'error', message: `Update failed: ${error?.message || error}` });
            setRewardsWallet({ ...rewardsWallet, processing: false });
        }
    }



    // process public key for display
    function processPublicKey(key: string) {
        if (key == "11111111111111111111111111111111") {
            return '';
        }
        return key;
    }

    //copy to clipboard method 
    function copyToClipboard(pubkey: string) {
        navigator?.clipboard?.writeText(pubkey).then(() => {
            notify({ type: 'success', message: 'Copied to the clipboard!' });

        }).catch((error) => {
            notify({ type: 'error', message: `Oops! Error occurred.` });

        });
    };

    return (
        <div className="container flex mx-auto flex-col items-center w-full max-w-6xl p-4 mb-10 relative">

            <div className="flex flex-row items-center justify-center absolute left-0 hover:cursor-pointer" onClick={() => { window.history.back() }}>
                <ArrowBackIosIcon fontSize="small" className="text-gray-400 " />
                <span className="text-white text-lg font-medium hover:text-[#fda31b]">Go Back</span>
            </div>

            <h2 className="text-lg font-medium text-white md:leading-tight  my-10">
                Visit Manager page <Link href={"/manager"} target="_self" rel="noopener noreferrer" className='underline text-[#FDA31B] hover:text-white'>here</Link>
            </h2>

            <div className='flex flex-col gap-8 bg-tiles border-xnd w-full text-white p-5  mt-8 relative md:mb-0 mb-28 text-base'>
                <div className="absolute -inset-2 -z-10 bg-gradient-to-r from-[#fda31b] via-[#622657] to-[#198476] border-xnd blur  "></div>

                {
                    !wallet?.connected ?
                        <div className="flex flex-col items-center justify-center w-full">
                            <WalletMultiButtonDynamic className="btn btn-sm rounded-btn text-lg" style={{ "backgroundColor": '#FDA31b' }}>
                                <AccountBalanceWalletIcon fontSize='medium' className='text-white mr-2' />
                                Connect Wallet
                            </WalletMultiButtonDynamic>
                        </div>
                        :
                        isLoading ?
                            <div className='flex flex-col w-full justify-center items-center'>
                                <Loader />
                            </div>
                            :
                            !hasPnode ?
                                <div className='flex flex-col w-full justify-between bg-tiles-dark border-xnd gap-4 p-4'>
                                    <div className='flex flex-row items-center justify-center font-normal'>
                                        You do not own any pNode(s).
                                    </div>
                                </div>
                                :
                                <>

                                    <div className='flex flex-col w-full justify-between bg-tiles-dark border-xnd gap-4 p-4'>
                                        <div className='flex flex-row items-center justify-center font-normal'>
                                            pNodes Owned:
                                        </div>
                                        <div className='flex flex-row items-center justify-center font-bold text-lg text-[#FDA31B]'>
                                            {pnodesQty}
                                        </div>
                                    </div>

                                    <div className='flex flex-col w-full justify-between bg-tiles-dark border-xnd gap-4 p-4'>
                                        <div className='flex flex-row items-center justify-center font-normal'>
                                            Available NFTs:
                                        </div>
                                        <div className='flex flex-row items-center justify-center font-bold text-lg text-[#FDA31B]'>
                                            {nftQty}
                                        </div>
                                    </div>

                                    <div className='flex flex-col w-full justify-between bg-tiles-dark border-xnd gap-4 p-4'>
                                        <div className='flex flex-row items-center justify-center font-normal'>
                                            Rewards Wallet:
                                        </div>
                                        <div className='flex flex-row items-center justify-center font-bold text-lg text-[#FDA31B] gap-3'>
                                            {isRewardsWalletEditing ? (
                                                <>
                                                    <input
                                                        type="text"
                                                        value={rewardsWallet?.value}
                                                        onChange={(e) => setRewardsWallet({ ...rewardsWallet, value: e.target.value })}
                                                        className="bg-tiles text-white text-center w-1/2 px-2 py-1 rounded border border-gray-600 focus:outline-none focus:border-[#FDA31B]"
                                                    />
                                                    <button
                                                        onClick={() => onRewardWalletRegister()}
                                                        className="bg-transparent text-white rounded p-1 disabled:bg-transparent hover:cursor-pointer hover:scale-110 transition-transform duration-100"
                                                        disabled={rewardsWallet?.processing}
                                                    >
                                                        {
                                                            rewardsWallet?.processing ?
                                                                <Loader color="#fff" />
                                                                :
                                                                <CheckIcon fontSize="small" className="text-white" />
                                                        }
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <span>
                                                        {processPublicKey(rewardsWallet?.value) != ''
                                                            ?
                                                            <span className="text-lg text-[#FDA31B] hover:cursor-pointer" onClick={() => copyToClipboard(rewardsWallet?.value)}>
                                                                {processPublicKey(rewardsWallet?.value).slice(0, 4)}...{processPublicKey(rewardsWallet?.value).slice(-4)}
                                                            </span>
                                                            : '-'}
                                                    </span>
                                                    <button
                                                        onClick={() => setIsRewardsWalletEditing(true)}
                                                    >
                                                        <EditIcon fontSize="small" className="text-gray-400" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                </>
                }
            </div>
            {
                hasPnode && wallet?.connected ?
                    <>
                        <h2 className="text-3xl font-medium text-white md:leading-tight mt-12 my-10">Manage pNodes</h2>
                        <OwnerView />
                    </>
                    : null
            }


            {/* Popup to register as a pNode Owner */}
            {
                showPopupRegisterOwner &&
                <div className="flex flex-col justify-center items-center overflow-x-hidden overflow-y-auto fixed inset-0 z-50 focus:outline-none ">
                    <div className="bg-black opacity-30 fixed inset-0"></div>
                    <div className="flex justify-center items-center flex-col overflow-x-hidden overflow-y-auto fixed z-50 border-xnd p-5 bg-tiles-dark">

                        <div className="absolute top-0 right-0 p-5">
                            <button onClick={() => { setShowPopupRegisterOwner(false) }} className='hover:cursor-pointer hover:scale-110 transition-transform duration-100'>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" color='#d98c18' viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <h2 className="text-xl font-medium text-white md:leading-tight  my-5">
                            Register as a pNode Owner
                        </h2>

                        <div className="mt-5">
                            It seems you are not registered as a pNode Owner yet. To register, please click the button below.
                        </div>

                        <div className="text-center">
                            {
                                isProcessing ?
                                    <button className="px-8 m-2 btn bg-[#808080] border-xnd  disabled disabled:bg-[#808080] hover:cursor-not-allowed hover:bg-[#808080]">
                                        <span className='normal-case'>
                                            <span className="loading loading-spinner loading-sm"></span> Processing...
                                        </span>
                                    </button>
                                    :
                                    <button
                                        className="px-8 m-2 btn bg-[#d98c18] border-xnd hover:bg-[#fda31b]"
                                        onClick={() => { onOwnerRegister() }}
                                    >
                                        <span className='normal-case'>
                                            {isRegistered ? "Update" : "Register"}
                                        </span>
                                    </button>
                            }
                        </div>
                    </div>
                </div>
            }

        </div>
    );
};
