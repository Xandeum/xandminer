import { Telegram } from "@mui/icons-material";
import { BN } from "@project-serum/anchor";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Connection, Keypair, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import EditIcon from '@mui/icons-material/Edit';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';

import Loader from "components/Loader";
import { MANAGER_SEED, PROGRAM } from "CONSTS";
import { fetchAllManagers, fetchManagerData, getPnodesForManager, serializeBorshString, updateManagerAccount, updatePnodeDetails } from "helpers/manageHelpers";

import { FC, useEffect, useRef, useState } from "react";
import { notify } from "utils/notifications";
import { readPnodeInfoArray } from "helpers/pNodeHelpers";
import { getKeypairForSigning } from "services/keypairServices";

export const ManagerView: FC = ({ }) => {

    const wallet = useWallet();
    // const { connection } = useConnection();
    const connection = new Connection('https://devnet.helius-rpc.com/?api-key=2aca1e9b-9f51-44a0-938b-89dc6c23e9b4', 'confirmed');


    const [managedPnodes, setManagedPnodes] = useState<any[]>([]);
    const [data, setData] = useState(managedPnodes || []);
    const [rewardWallet, setRewardWallet] = useState<string>('');
    const [commission, setCommission] = useState<string>('');
    const [discord, setDiscord] = useState<string>('');
    const [telegram, setTelegram] = useState<string>('');
    const [showPopupRegister, setShowPopupRegister] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isRegistered, setIsRegistered] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [editValue, setEditValue] = useState('');
    const [modifiedRows, setModifiedRows] = useState<number[]>([]);
    const [savingRow, setSavingRow] = useState<number | null>(null);

    useEffect(() => {
        fetchData();
    }, [wallet, wallet?.publicKey]);



    // Sync data when pNodeData changes
    useEffect(() => {
        if (!isLoading) {
            setData(managedPnodes || []);
        }
    }, [managedPnodes, isLoading, wallet, wallet?.publicKey]);

    const fetchData = async () => {
        setIsLoading(true);
        const managersData = await fetchAllManagers(connection);
        if (managersData && managersData.length > 0) {
            const formattedManagers = managersData.map((manager) => ({
                pubkey: manager?.data?.pubkey.toString(),
            }));
            let alreadyRegistered = formattedManagers?.find(manager => manager?.pubkey?.toString() == wallet?.publicKey?.toString()) ? true : false;

            setIsRegistered(wallet?.publicKey && alreadyRegistered);
            if (alreadyRegistered) {
                const currentManagerData = await fetchManagerData(connection, wallet?.publicKey);
                const managedPnodes = await getPnodesForManager(wallet?.publicKey, connection);
                setManagedPnodes(managedPnodes);
                setRewardWallet(currentManagerData?.rewardsWallet.toString());
                setCommission((currentManagerData?.commission / 100).toString());
                setDiscord(currentManagerData?.discordId);
                setTelegram(currentManagerData?.telegramId);
            }

            setIsLoading(false);

        } else {
            setManagedPnodes([]);
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
                    notify({ type: 'error', message: 'Manager account already exists' });
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

    function processPublicKey(key: PublicKey) {
        if (key?.toString() == "11111111111111111111111111111111") {
            return '';
        }
        return key?.toString();
    }

    // Focus input when editing starts
    useEffect(() => {
        if (editingCell && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [editingCell]);

    const startEditing = (row: number, col: string, currentValue: any) => {
        setEditingCell({ row, col });
        setEditValue(String(currentValue || ''));

    };

    const saveEdit = () => {
        try {
            if (editingCell === null) return;
            const { row, col } = editingCell;
            const newValue = editValue.trim();
            const oldValue = managedPnodes[row]?.[col];
            const updatedData = [...data];

            //updated the pnode registration time if pnode value changed
            if (col === 'pnodeKey' && newValue !== oldValue?.toString()) {
                if (newValue === '') {
                    updatedData[row] = { ...updatedData[row], [col]: new PublicKey("11111111111111111111111111111111") };
                } else if (!PublicKey.isOnCurve(newValue)) {
                    notify({ type: 'error', message: 'Invalid Public Key format.' });
                    setEditingCell(null);
                    setEditValue('');
                    return;
                }
                // check if the new pnode value is already exists in other rows
                else if (updatedData.some((item, index) => index !== row && item.pnodeKey?.toString() === newValue)) {
                    notify({ type: 'error', message: 'This pNode Public Key is already registered.' });
                    setEditingCell(null);
                    setEditValue('');
                    return;
                } else {
                    updatedData[row] = { ...updatedData[row], [col]: new PublicKey(newValue) };
                }
            }

            setData(updatedData);

            // Detect if this row is now modified
            const rowChanged = JSON.stringify(updatedData[row]) !== JSON.stringify(managedPnodes[row]);
            setModifiedRows(prev =>
                rowChanged
                    ? [...new Set([...prev, row])]
                    : prev.filter(i => i !== row)
            );

            setEditingCell(null);
            setEditValue('');
        } catch (error) {
            notify({ type: 'error', message: `Error while saving edit: ${error?.message || error}` });
            setEditingCell(null);
            setEditValue('');
        }
    };

    const cancelEdit = () => {
        setEditingCell(null);
        setEditValue('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') saveEdit();
        if (e.key === 'Escape') cancelEdit();
    };

    // function on saving changes
    const onHandleChanges = async (index?: number, type?: string) => {
        if (index === undefined) return;

        setSavingRow(index);
        // setIsProcessing({ task: 'assign', status: true, index });

        try {
            if (!wallet || !wallet.publicKey) {
                notify({ type: 'error', message: 'Please connect your wallet' });
                setSavingRow(null);
                return;
            }

            const oldManager = new PublicKey(managedPnodes[index]?.managerPubkey);
            const pNodeOwnerPubkey = new PublicKey(managedPnodes[index]?.owner);
            const DEFAULT_VALUE = "11111111111111111111111111111111";
            let pnodeInfo = data[index];

            if (type === 'manager') {
                pnodeInfo = {
                    ...pnodeInfo,
                    manager: new PublicKey(DEFAULT_VALUE),
                    managerCommission: 0
                };
            } else if (type === 'nft1') {
                pnodeInfo = {
                    ...pnodeInfo,
                    nft_slot_1: new PublicKey(DEFAULT_VALUE),
                };
            } else if (type === 'nft2') {
                pnodeInfo = {
                    ...pnodeInfo,
                    nft_slot_2: new PublicKey(DEFAULT_VALUE),
                };
            }

            pnodeInfo = {
                ...pnodeInfo,
                pnode: pnodeInfo?.pnodeKey instanceof PublicKey ? pnodeInfo?.pnodeKey : new PublicKey(pnodeInfo?.pnodeKey || DEFAULT_VALUE),
                nft_slot_1: pnodeInfo?.nftSlot1 instanceof PublicKey ? pnodeInfo?.nftSlot1 : new PublicKey(pnodeInfo?.nftSlot1 || DEFAULT_VALUE),
                nft_slot_2: pnodeInfo?.nftSlot2 instanceof PublicKey ? pnodeInfo?.nftSlot2 : new PublicKey(pnodeInfo?.nftSlot2 || DEFAULT_VALUE),
                manager: pnodeInfo?.managerPubkey instanceof PublicKey ? pnodeInfo?.managerPubkey : new PublicKey(pnodeInfo?.managerPubkey || DEFAULT_VALUE),
            }

            const pNodeKeyChanging = modifiedRows?.includes(index);

            const keypairForSigning = await getKeypairForSigning();
            if (!keypairForSigning?.ok || !keypairForSigning?.data?.keypair) {
                notify({ type: 'error', message: 'Failed to retrieve keypair for signing.' });
                return;
            }

            const walletToSign = Keypair.fromSecretKey(new Uint8Array(keypairForSigning?.data?.keypair?.privateKey));

            if (pNodeKeyChanging) {
                if (!walletToSign) {
                    throw new Error("Missing pnode keypair for pnode key change");
                }
            }

            const transaction = new Transaction();
            const txIx = await updatePnodeDetails(pNodeOwnerPubkey, index, pnodeInfo, oldManager, pNodeKeyChanging, true, wallet?.publicKey);

            if (txIx && typeof txIx === 'object' && 'error' in txIx) {
                notify({ type: 'error', message: `${(txIx as any).error}` });
                setSavingRow(null);
                return;
            }

            transaction.add(txIx as TransactionInstruction);

            const { context: { slot: minContextSlot }, value: { blockhash, lastValidBlockHeight } } =
                await connection.getLatestBlockhashAndContext('confirmed');

            transaction.recentBlockhash = blockhash;
            transaction.feePayer = wallet?.publicKey;
            let tx = '';

            if (modifiedRows?.includes(index)) {
                transaction.partialSign(walletToSign);
                tx = await wallet.sendTransaction(transaction, connection, {
                    minContextSlot,
                    skipPreflight: true,
                    preflightCommitment: 'confirmed',
                });
            } else {
                tx = await wallet.sendTransaction(transaction, connection, {
                    minContextSlot,
                    skipPreflight: true,
                    preflightCommitment: 'confirmed',
                });
            }

            await new Promise(resolve => setTimeout(resolve, 4000));

            const confirmTx = await connection.getSignatureStatuses([tx], { searchTransactionHistory: true });
            const status = confirmTx?.value[0];

            if (!status || status.err) {
                notify({
                    type: 'error',
                    message: status?.err ? 'Transaction failed!' : 'Unable to confirm',
                    description: status?.err?.toString(),
                    txid: tx
                });
            } else {
                notify({
                    type: 'success',
                    message: 'Saved successfully!',
                    description: `PNode #${index + 1} updated`,
                    txid: tx
                });
                setModifiedRows(prev => prev.filter(i => i !== index));
                await fetchData();
            }
        } catch (error: any) {
            notify({ type: 'error', message: `Transaction failed: ${error?.message || error}` });
        } finally {
            setSavingRow(null);
            // setIsProcessing({ task: '', status: false, index: 0 });
        }
    };

    return (
        <div className="container flex mx-auto flex-col items-center w-full max-w-4xl p-4 mb-10 relative">
            <div className="flex flex-row items-center justify-center absolute left-0 hover:cursor-pointer" onClick={() => { window.history.back() }}>
                <ArrowBackIosIcon fontSize="small" className="text-gray-400 " />
                <span className="text-white text-lg font-medium hover:text-[#fda31b]">Go Back</span>
            </div>

            <>
                <h2 className="text-3xl font-medium text-white md:leading-tight  my-10">Manage pNode - pNode(s) Managed</h2>
                {
                    // check if the wallet pubkey exists in the managers list
                    isRegistered
                        ?
                        <h2 className="text-md font-light text-white md:leading-tight  mb-10">Update your pNode Manager Account <span className="text-[#fda31b] underline font-medium hover:cursor-pointer" onClick={() => { setShowPopupRegister(true) }}>here</span></h2>
                        :
                        <h2 className="text-md font-light text-white md:leading-tight  mb-10">Register as a pNode Manager <span className="text-[#fda31b] underline font-medium hover:cursor-pointer" onClick={() => { setShowPopupRegister(true) }}>here</span></h2>

                }

                {
                    isLoading ?
                        <div className="w-full mt-5 flex flex-col items-center justify-center">
                            <Loader />
                        </div>
                        :
                        null
                }

                {
                    !isLoading &&
                        isRegistered ?
                        // <div className="w-full mt-5 flex flex-col items-center justify-center">
                        <div className='flex flex-col gap-8 bg-tiles border-xnd w-full text-white p-5 relative text-base'>
                            <div className="absolute -inset-2 -z-10 bg-gradient-to-r from-[#fda31b] via-[#622657] to-[#198476] border-xnd blur  "></div>
                            {
                                managedPnodes?.length == 0 ?
                                    <div className="flex flex-col items-center justify-center my-5">
                                        <span className="text-gray-500">No pNodes managed by you.</span>
                                    </div>
                                    :
                                    <div className="overflow-x-auto w-full ">
                                        <div className="absolute -inset-2 -z-10 bg-gradient-to-r from-[#fda31b] via-[#622657] to-[#198476] border-xnd blur  "></div>

                                        <table className="table table-auto w-full normal-case border-collapse border border-gray-400">
                                            {/* head */}
                                            <thead>
                                                <tr className="border-b border-gray-400">
                                                    <th className="bg-tiles-dark text-white normal-case font-medium text-base text-center">Index</th>
                                                    <th className="bg-tiles-dark text-white normal-case font-medium text-base text-center">pNode Pubkey</th>
                                                    <th className="bg-tiles-dark text-white normal-case font-medium text-base text-center">Owner</th>
                                                    <th className="bg-tiles-dark text-white normal-case font-medium text-base text-center">Registration Time</th>
                                                    <th className="bg-tiles-dark text-white normal-case font-medium text-base text-center">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {data?.map((pnode, index) => {
                                                    const isModified = modifiedRows.includes(index);
                                                    const isSaving = savingRow === index;
                                                    return (
                                                        <tr key={index} className="font-light text-white text-sm">
                                                            <td className="bg-tiles-dark text-center">{index + 1}</td>
                                                            {/* <td className="bg-tiles-dark text-center hover:cursor-pointer" onClick={() => copyToClipboard(pnode?.pnodeKey?.toString())}>{pnode?.pnodeKey?.toString().slice(0, 4)}...{pnode?.pnodeKey?.toString().slice(-4)}</td> */}
                                                            <td className="bg-tiles-dark text-center relative group">
                                                                <div className="flex flex-row items-center justify-center gap-3 h-full min-h-[40px]">
                                                                    {editingCell?.row === index && editingCell?.col === 'pnodeKey' ? (
                                                                        <input
                                                                            ref={inputRef}
                                                                            type="text"
                                                                            value={editValue}
                                                                            onChange={(e) => setEditValue(e.target.value)}
                                                                            onBlur={saveEdit}
                                                                            onKeyDown={handleKeyDown}
                                                                            className="bg-gray-800 text-white text-center w-32 px-2 py-1 rounded text-xs"
                                                                            placeholder="Enter pubkey..."
                                                                        />
                                                                    ) : (
                                                                        <>
                                                                            {
                                                                                processPublicKey(pnode?.pnodeKey) == '' ?
                                                                                    '-' :
                                                                                    <span
                                                                                        className="text-xs hover:cursor-pointer hover:text-[#FDA31B]"
                                                                                        onClick={() => copyToClipboard(processPublicKey(pnode?.pnodeKey) || '')}
                                                                                    >
                                                                                        {processPublicKey(pnode?.pnodeKey)?.slice(0, 4)}...{processPublicKey(pnode?.pnodeKey)?.slice(-4)}
                                                                                    </span>
                                                                            }
                                                                            <button
                                                                                onClick={() => startEditing(index, 'pnodeKey', pnode?.pnodeKey?.toString())}
                                                                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                                            >
                                                                                <EditIcon fontSize="small" className="text-gray-400" />
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="bg-tiles-dark text-center hover:cursor-pointer" onClick={() => copyToClipboard(pnode?.owner?.toString())}>{pnode?.owner?.toString().slice(0, 4)}...{pnode?.owner?.toString().slice(-4)}</td>
                                                            <td className="bg-tiles-dark text-center">{new Date(Number(pnode?.registrationTime)).toLocaleString()}</td>
                                                            {/* Action Buttons: Save & Cancel (only if modified) */}
                                                            <td className="bg-tiles-dark text-center">
                                                                {isModified && (
                                                                    <div className="flex items-center justify-center gap-2 h-full min-h-[40px]">
                                                                        {/* Save Button */}
                                                                        <button
                                                                            className={`btn btn-xs ${isSaving ? 'bg-gray-600' : 'bg-[#198476] hover:bg-[#1e9c8b]'} text-white normal-case`}
                                                                            onClick={() => onHandleChanges(index, "")}
                                                                            disabled={isSaving}
                                                                        >
                                                                            {isSaving ? (
                                                                                <span className="loading loading-spinner loading-xs"></span>
                                                                            ) : (
                                                                                'Save'
                                                                            )}
                                                                        </button>

                                                                        {/* Cancel Button */}
                                                                        <button
                                                                            className="btn btn-xs btn-ghost text-gray-400 hover:text-white normal-case"
                                                                            onClick={() => {
                                                                                // Revert row to original data
                                                                                const originalRow = managedPnodes[index];
                                                                                const updatedData = [...data];
                                                                                updatedData[index] = { ...originalRow };
                                                                                setData(updatedData);

                                                                                // Remove from modified rows
                                                                                setModifiedRows(prev => prev.filter(i => i !== index));
                                                                            }}
                                                                            disabled={isSaving}
                                                                        >
                                                                            Cancel
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    )
                                                }
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                            }
                        </div>
                        :
                        null
                }

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
