import { Telegram } from "@mui/icons-material";
import { BN } from "@project-serum/anchor";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import { MANAGER_SEED, PROGRAM } from "CONSTS";
import { fetchAllManagers, fetchManagerData, serializeBorshString, updateManagerAccount } from "helpers/manageHelpers";

import { FC, useEffect, useState } from "react";
import { notify } from "utils/notifications";

export const ManageView: FC = ({ }) => {

    const wallet = useWallet();
    // const { connection } = useConnection();
    const connection = new Connection('https://devnet.helius-rpc.com/?api-key=2aca1e9b-9f51-44a0-938b-89dc6c23e9b4', 'confirmed');

    const [managers, setManagers] = useState<any[]>([]);
    const [rewardWallet, setRewardWallet] = useState<string>('');
    const [commission, setCommission] = useState<string>('');
    const [discord, setDiscord] = useState<string>('');
    const [telegram, setTelegram] = useState<string>('');
    const [showPopupRegister, setShowPopupRegister] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isRegistered, setIsRegistered] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        fetchData();
    }, [wallet, wallet?.publicKey]);

    const fetchData = async () => {
        setIsLoading(true);
        const managersData = await fetchAllManagers(connection);
        console.log("managersData >>> ", managersData);
        if (managersData && managersData.length > 0) {
            const formattedManagers = managersData.map((manager) => ({
                pubkey: manager?.data?.pubkey.toString(),
                commission: manager?.data?.commission, // Convert basis points to percentage
                currentlyOperating: manager?.data?.currentlyOperating,
                Telegram: `https://t.me/${(manager?.data?.telegramId)}`,
                discord: manager?.data?.discordId
            }));
            let alreadyRegistered = formattedManagers?.find(manager => manager?.pubkey?.toString() == wallet?.publicKey?.toString()) ? true : false;

            setIsRegistered(wallet?.publicKey && alreadyRegistered);
            if (alreadyRegistered) {
                const currentManagerData = await fetchManagerData(connection, wallet?.publicKey);
                setRewardWallet(currentManagerData?.rewardsWallet.toString());
                setCommission((currentManagerData?.commission / 100).toString());
                setDiscord(currentManagerData?.discordId);
                setTelegram(currentManagerData?.telegramId);
            }

            setManagers(formattedManagers);
            setIsLoading(false);

        } else {
            setManagers([]);
            setIsLoading(false);
        }
    };


    const handlePercentageInputChange = e => {
        const value = e.target.value
        if (/^\d*\.?\d*$/.test(value)) {
            if (e.target.value.length > 3) return;
            setCommission(value)
        }
    }

    //copy to clipboard method 
    function copyToClipboard(pubkey) {
        navigator?.clipboard?.writeText(pubkey).then(() => {
            notify({ type: 'success', message: 'Copied to the clipboard!' });

        }).catch((error) => {
            notify({ type: 'error', message: `Oops! Error occurred.` });

        });
    };

    const onRegister = async () => {
        setIsProcessing(true);
        try {

            if (!wallet || !wallet.publicKey) {
                notify({ type: 'error', message: 'Please connect your wallet' });
                setIsProcessing(false);
                return;
            }

            const pubKey = wallet.publicKey.toString();

            if (!pubKey || !commission || !discord || !telegram) {
                notify({ type: 'error', message: 'Please fill all the fields' });
                setIsProcessing(false);
                return;
            }
            if (parseFloat(commission) < 1 || parseFloat(commission) > 100) {
                notify({ type: 'error', message: 'Percentage must be between 1 and 100' });
                setIsProcessing(false);
                return;
            }

            const basisCommission = (parseFloat(commission) * 100).toString(); //convert to basis points

            const transaction = new Transaction();
            if (isRegistered) {
                //update existing manager account
                if (!rewardWallet || !PublicKey.isOnCurve(new PublicKey(rewardWallet))) {
                    notify({ type: 'error', message: 'Invalid reward wallet address' });
                    setIsProcessing(false);
                    return;
                }
                const txIx = await updateManagerAccount(connection, wallet?.publicKey, Number(basisCommission), telegram, discord, new PublicKey(rewardWallet));
                transaction.add(txIx);
            } else {

                const [managerPda] = PublicKey.findProgramAddressSync(
                    [Buffer.from(MANAGER_SEED), wallet.publicKey.toBuffer()],
                    PROGRAM
                );

                //check if manager account already exists
                const existingManagerData = await fetchManagerData(connection, wallet.publicKey);
                if (existingManagerData) {
                    console.error("Error: Manager is already registered!");
                    console.log("Existing manager data:", existingManagerData);
                    setIsProcessing(false);
                    return;
                }

                const keys = [
                    {
                        pubkey: wallet.publicKey,
                        isSigner: true,
                        isWritable: true,
                    },
                    {
                        pubkey: managerPda,
                        isSigner: false,
                        isWritable: true,
                    },
                    {
                        pubkey: new PublicKey("11111111111111111111111111111111"),
                        isSigner: false,
                        isWritable: false,
                    },
                    {
                        pubkey: new PublicKey("SysvarRent111111111111111111111111111111111"),
                        isSigner: false,
                        isWritable: false,
                    },
                ];

                const data = Buffer.concat([
                    Buffer.from(Int8Array.from([8]).buffer),
                    Buffer.from(Uint8Array.of(...new BN(basisCommission).toArray("le", 4))),
                    serializeBorshString(telegram),
                    serializeBorshString(discord)
                ]);

                const txIx = new TransactionInstruction({
                    keys: keys,
                    programId: PROGRAM,
                    data: data,
                });

                transaction.add(txIx);
            }

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

            const tx = await wallet?.sendTransaction(transaction, connection, {
                minContextSlot,
                skipPreflight: true,
                preflightCommitment: 'processed'
            });

            await new Promise((resolve) => setTimeout(resolve
                , 4000));

            const confirmTx = await connection?.getSignatureStatuses([tx], { searchTransactionHistory: true });

            // Check if the transaction failed
            const status = confirmTx?.value[0];

            if (!status) {
                notify({ type: 'error', message: 'Unable to detect transaction status', description: `It may have passed or failed. Please check it on an explorer`, txid: tx });
                setIsProcessing(false);

                return;
            }

            if (status?.err) {
                notify({ type: 'error', message: 'Transaction failed!', description: `${confirmTx?.value[0]?.err?.toString()}`, txid: tx });
                setIsProcessing(false);

                return;
            } else {
                notify({ type: 'success', message: 'Transaction confirmed!', description: `Manager Account updated successfully`, txid: tx });
                setIsProcessing(false);
                setShowPopupRegister(false);
                setRewardWallet('');
                setCommission('');
                setDiscord('');
                setTelegram('');
                await fetchData();
                return;
            }

        } catch (error) {
            console.error("Transaction error:", error);
            notify({ type: 'error', message: `Error while updating manager account`, description: `${error?.message || error}` });
            setIsProcessing(false);
            setShowPopupRegister(false);
        }
    }


    return (
        <div className="container flex mx-auto flex-col items-center w-full max-w-4xl p-4 mb-10 relative ">

            <>
                <h2 className="text-3xl font-medium text-white md:leading-tight  my-5">pNode Managers</h2>
                {
                    // check if the wallet pubkey exists in the managers list
                    isRegistered
                        ?
                        <h2 className="text-md font-light text-white md:leading-tight  mb-10">Update your pNode Manager Account <span className="text-[#fda31b] underline font-medium hover:cursor-pointer" onClick={() => { setShowPopupRegister(true) }}>here</span></h2>
                        :
                        <h2 className="text-md font-light text-white md:leading-tight  mb-10">Register as a pNode Manager <span className="text-[#fda31b] underline font-medium hover:cursor-pointer" onClick={() => { setShowPopupRegister(true) }}>here</span></h2>

                }

                <div className="overflow-x-auto w-full">
                    <table className="table table-auto w-full normal-case border-collapse border border-gray-400">
                        {/* head */}
                        <thead>
                            <tr className="border-b border-gray-400">
                                <th className="bg-tiles-dark text-white normal-case font-medium text-base text-center">Public Key</th>
                                <th className="bg-tiles-dark text-white normal-case font-medium text-base text-center">Percentage</th>
                                <th className="bg-tiles-dark text-white normal-case font-medium text-base text-center">Currently Operating</th>
                                <th className="bg-tiles-dark text-white normal-case font-medium text-base text-center">Discord</th>
                                <th className="bg-tiles-dark text-white normal-case font-medium text-base text-center">Telegram</th>
                            </tr>
                        </thead>
                        {
                            isLoading ?
                                <tbody>
                                    <tr>
                                        <td colSpan={5} className="bg-tiles-dark text-center">
                                            <div className="flex flex-col items-center justify-center my-5">
                                                <span className="loading loading-spinner loading-lg"></span>
                                                <span className="text-gray-500">Loading Managers...</span>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                                :
                                managers?.length == 0 ?
                                    <tbody>
                                        <tr>
                                            <td colSpan={5} className="bg-tiles-dark text-center">
                                                <div className="flex flex-col items-center justify-center my-5">
                                                    <span className="text-gray-500">No Managers found.</span>
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                    :
                                    <tbody>
                                        {managers.map((manager, index) => (
                                            <tr key={index} className="font-light text-white text-sm">
                                                <td className="bg-tiles-dark text-center hover:cursor-pointer" onClick={() => copyToClipboard(manager.pubkey?.toString())}>{manager?.pubkey?.slice(0, 4)}...{manager.pubkey?.slice(-4)}</td>
                                                <td className="bg-tiles-dark text-center">{Number(manager?.commission) / 100}%</td>
                                                <td className="bg-tiles-dark text-center">{manager?.currentlyOperating}</td>
                                                <td className="bg-tiles-dark text-center hover:cursor-pointer" onClick={() => copyToClipboard(manager?.discord?.toString())}>{manager?.discord}</td>
                                                <td className="bg-tiles-dark text-center">
                                                    <a href={manager?.Telegram} target="_blank" rel="noreferrer">
                                                        <Telegram className="text-white" />
                                                    </a>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                        }
                    </table>
                </div>

                {/* popup to register as a pNode Manager */}
                {
                    showPopupRegister &&
                    <div className="flex flex-col justify-center items-center overflow-x-hidden overflow-y-auto fixed inset-0 z-50 focus:outline-none ">
                        <div className="bg-tiles-dark opacity-30 fixed inset-0"></div>
                        <div className="flex justify-center items-center flex-col overflow-x-hidden overflow-y-auto fixed z-50 border-xnd p-5 bg-tiles-dark">

                            <div className="absolute top-0 right-0 p-5">
                                <button onClick={() => { setShowPopupRegister(false) }} className='hover:cursor-pointer hover:scale-110 transition-transform duration-100'>
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" color='#d98c18' viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <h2 className="text-xl font-medium text-white md:leading-tight  my-5">
                                {isRegistered ? "Update your pNode Manager Account" : "Register as a pNode Manager"}
                            </h2>

                            <div className="mt-5">

                                <div className='flex flex-col w-full justify-between bg-tiles-dark border-xnd gap-4 p-4'>
                                    <div className='flex flex-col md:flex-row md:items-center md:justify-between relative'>
                                        <div className='flex flex-row items-center justify-start md:justify-between gap-2'>
                                            <p className='text-lg text-[#D98C18] hover:text-[#fda31b]'>Public Key</p>
                                        </div>
                                        <input
                                            id='pubkey'
                                            placeholder=''
                                            inputMode='text'
                                            type='text'
                                            className='input-md bg-tiles outline-none box-content border-xnd text-white text-right pr-7 md:min-w-[18rem]'
                                            value={wallet?.publicKey?.toString() || ''}
                                            disabled
                                        />
                                    </div>
                                </div>

                                {
                                    isRegistered ?
                                        <div className='flex flex-col w-full justify-between bg-tiles-dark border-xnd gap-4 p-4'>
                                            <div className='flex flex-col md:flex-row md:items-center md:justify-between relative'>
                                                <div className='flex flex-row items-center justify-start md:justify-between gap-2'>
                                                    <p className='text-lg text-[#D98C18] hover:text-[#fda31b]'>Reward Wallet</p>
                                                </div>
                                                <input
                                                    id='reward-wallet'
                                                    placeholder=''
                                                    inputMode='text'
                                                    type='text'
                                                    className='input-md bg-tiles outline-none box-content border-xnd text-white text-right pr-7 md:min-w-[18rem]'
                                                    value={rewardWallet}
                                                    onChange={(e) => { setRewardWallet(e?.target?.value) }}
                                                />
                                            </div>
                                        </div>
                                        :
                                        null
                                }

                                <div className='flex flex-col w-full justify-between bg-tiles-dark border-xnd gap-4 p-4'>
                                    <div className='flex flex-col md:flex-row md:items-center md:justify-between relative'>
                                        <div className='flex flex-row items-center justify-start md:justify-between gap-2'>
                                            <p className='text-lg text-[#D98C18] hover:text-[#fda31b]'>Percentage</p>
                                        </div>
                                        <input
                                            id='commission'
                                            placeholder='2-100'
                                            min="2"
                                            max="100"
                                            inputMode='decimal'
                                            type='text'
                                            className='input-md bg-tiles outline-none box-content border-xnd text-white text-right pr-7 md:min-w-[8rem]'
                                            value={commission}
                                            onChange={handlePercentageInputChange}
                                            onBlur={(e) => {
                                                parseFloat(e.target.value) < 0 ? setCommission('0') : null;
                                                parseFloat(e.target.value) > 100 ? setCommission('100') : null;
                                            }}
                                        />
                                        <span className="absolute right-2 md:top-1/2 top-3/4 -translate-y-3/4 md:-translate-y-1/2 text-white">%</span>
                                    </div>
                                </div>

                                <div className='flex flex-col w-full justify-between bg-tiles-dark border-xnd gap-4 p-4'>
                                    <div className='flex flex-col md:flex-row md:items-center md:justify-between relative gap-4'>
                                        <div className='flex flex-row items-center justify-start md:justify-between gap-2'>
                                            <p className='text-lg text-[#D98C18] hover:text-[#fda31b]'>Discord Username</p>
                                        </div>
                                        <input
                                            id='discord'
                                            placeholder=''
                                            inputMode='text'
                                            type='text'
                                            className='input-md bg-tiles outline-none box-content border-xnd text-white text-right pr-7 md:min-w-[18rem]'
                                            value={discord}
                                            onChange={(e) => { setDiscord(e?.target?.value) }}
                                        />
                                    </div>
                                </div>

                                <div className='flex flex-col w-full justify-between bg-tiles-dark border-xnd gap-4 p-4'>
                                    <div className='flex flex-col md:flex-row md:items-center md:justify-between relative gap-4'>
                                        <div className='flex flex-row items-center justify-start md:justify-between gap-2'>
                                            <p className='text-lg text-[#D98C18] hover:text-[#fda31b]'>Telegram Handle</p>
                                        </div>
                                        <input
                                            id='telegram'
                                            placeholder=''
                                            inputMode='text'
                                            type='text'
                                            className='input-md bg-tiles outline-none box-content border-xnd text-white text-right pr-7 md:min-w-[18rem]'
                                            value={telegram}
                                            onChange={(e) => { setTelegram(e?.target?.value) }}
                                        />
                                    </div>
                                </div>

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
                                            onClick={() => { onRegister() }}
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
            </>

        </div>
    );
};
