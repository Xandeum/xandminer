import { Telegram } from "@mui/icons-material";
import { BN } from "@project-serum/anchor";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Connection, Keypair, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import EditIcon from '@mui/icons-material/Edit';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';

import Loader from "components/Loader";
import { MANAGER_SEED, PROGRAM } from "CONSTS";
import { fetchAllManagers, fetchManagerData, getManagerAssignedPnodes, serializeBorshString, updateManagerAccount, updatePnodeDetails } from "helpers/manageHelpers";

import { FC, useEffect, useRef, useState } from "react";
import { notify } from "utils/notifications";
import { readPnodeAccount, readPnodeInfoArray } from "helpers/pNodeHelpers";
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
    const [website, setWebsite] = useState<string>('');
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
                const managedPnodes = await getManagerAssignedPnodes(connection, new PublicKey(currentManagerData?.pubkey));
                setManagedPnodes(managedPnodes);
                setRewardWallet(currentManagerData?.rewardsWallet.toString());
                setCommission((currentManagerData?.commission / 100).toString());
                setDiscord(currentManagerData?.discordId);
                setTelegram(currentManagerData?.telegramId);
                setWebsite(currentManagerData?.websiteLink)
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

            if (!pubKey || !commission || !discord || !telegram || !website) {
                notify({ type: 'error', message: 'Please fill all the fields' });
                setIsProcessing(false);
                return;
            }
            if (parseFloat(commission) < 1 || parseFloat(commission) > 100) {
                notify({ type: 'error', message: 'Commission must be between 1 and 100' });
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
                const txIx = await updateManagerAccount(connection, wallet?.publicKey, Number(basisCommission), telegram, discord, website, new PublicKey(rewardWallet));
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
                    serializeBorshString(discord),
                    serializeBorshString(website),
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
            if ((col === 'devnet_pnode' || col === 'mainnet_pnode') && newValue !== oldValue?.toString()) {
                if (newValue === '') {
                    updatedData[row] = { ...updatedData[row], [col]: new PublicKey("11111111111111111111111111111111") };
                } else if (!PublicKey.isOnCurve(newValue)) {
                    notify({ type: 'error', message: 'Invalid Public Key format.' });
                    setEditingCell(null);
                    setEditValue('');
                    return;
                }
                // check if the new pnode value is already exists in other rows
                else if (col === 'devnet_pnode' && updatedData.some((item, index) => index !== row && item.devnet_pnode?.toString() === newValue)) {
                    notify({ type: 'error', message: 'This devnet pNode Public Key is already registered.' });
                    setEditingCell(null);
                    setEditValue('');
                    return;
                } else if (col === 'mainnet_pnode' && updatedData.some((item, index) => index !== row && item.mainnet_pnode?.toString() === newValue)) {
                    notify({ type: 'error', message: 'This mainnet pNode Public Key is already registered.' });
                    setEditingCell(null);
                    setEditValue('');
                    return;
                } else if (updatedData[row].devnet_pnode?.equals(PublicKey.default) && updatedData[row].mainnet_pnode?.equals(PublicKey.default)) {
                    updatedData[row] = { ...updatedData[row], [col]: new PublicKey(newValue), ["registration_time"]: Date.now() };
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

            const oldManager = managedPnodes[index]?.manager;
            const pNodeOwnerPubkey = managedPnodes[index]?.owner;
            const DEFAULT_VALUE = "11111111111111111111111111111111";
            let pnodeInfo = data[index];

            if (type === 'manager') {
                pnodeInfo = {
                    ...pnodeInfo,
                    manager: new PublicKey(DEFAULT_VALUE),
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
                devnet_pnode: pnodeInfo.devnet_pnode instanceof PublicKey ? pnodeInfo.devnet_pnode : new PublicKey(pnodeInfo.devnet_pnode || DEFAULT_VALUE),
                mainnet_pnode: pnodeInfo.mainnet_pnode instanceof PublicKey ? pnodeInfo.mainnet_pnode : new PublicKey(pnodeInfo.mainnet_pnode || DEFAULT_VALUE),
                nft_slot_1: pnodeInfo.nft_slot_1 instanceof PublicKey ? pnodeInfo.nft_slot_1 : new PublicKey(pnodeInfo.nft_slot_1 || DEFAULT_VALUE),
                nft_slot_2: pnodeInfo.nft_slot_2 instanceof PublicKey ? pnodeInfo.nft_slot_2 : new PublicKey(pnodeInfo.nft_slot_2 || DEFAULT_VALUE),
                manager: pnodeInfo.manager instanceof PublicKey ? pnodeInfo.manager : new PublicKey(pnodeInfo.manager || DEFAULT_VALUE),
                registration_time: pnodeInfo.registration_time,
                index: pnodeInfo?.index,
                owner: pnodeInfo?.owner,
                manager_commission: pnodeInfo?.manager_commission,
            }

            // Read current pnode info to check if pnode key is changing
            const selectedPnodeInfo = await readPnodeAccount(connection, pnodeInfo?.owner, pnodeInfo?.index);

            const oldDevnetPnodeKey = selectedPnodeInfo && selectedPnodeInfo ? selectedPnodeInfo?.devnet_pnode : PublicKey.default;
            const oldMainnetPnodeKey = selectedPnodeInfo && selectedPnodeInfo ? selectedPnodeInfo?.mainnet_pnode : PublicKey.default;

            const devnetPnodeKeyChanging = !oldDevnetPnodeKey.equals(pnodeInfo?.devnet_pnode);
            const mainnetPnodeKeyChanging = !oldMainnetPnodeKey.equals(pnodeInfo?.mainnet_pnode);

            const pNodeKeyChanging = devnetPnodeKeyChanging || mainnetPnodeKeyChanging;

            const keypairForSigning = await getKeypairForSigning();
            if (!keypairForSigning?.ok || !keypairForSigning?.data?.keypair) {
                notify({ type: 'error', message: 'pNode keypair missing', description: 'Unable to load pNode keypair for signing' });
                return;
            }
            const walletToSign = Keypair.fromSecretKey(new Uint8Array(keypairForSigning?.data?.keypair?.privateKey));

            if (pNodeKeyChanging) {
                if (!walletToSign) {
                    notify({ type: 'error', message: 'pNode keypair missing', description: 'Missing pNode keypair for pNode key change' });
                    setSavingRow(null);
                    return;
                }
            }
            const expectedSigner: PublicKey = devnetPnodeKeyChanging ? pnodeInfo?.devnet_pnode : pnodeInfo?.mainnet_pnode;

            const isDeletingPnode = pNodeKeyChanging && ((devnetPnodeKeyChanging && pnodeInfo?.devnet_pnode.equals(PublicKey.default)) || (mainnetPnodeKeyChanging && pnodeInfo?.mainnet_pnode.equals(PublicKey.default)));

            if (expectedSigner?.equals(walletToSign.publicKey) === false && !isDeletingPnode && pNodeKeyChanging) {
                notify({ type: 'error', message: 'Expected signer mismatch', description: 'The expected signer does not match the loaded pNode keypair' });
                setSavingRow(null);
                // setIsProcessing({ task: '', status: false, index: 0 });
                return;
            }

            const transaction = new Transaction();
            const txIx = await updatePnodeDetails(pNodeOwnerPubkey, pnodeInfo?.index, pnodeInfo, oldManager, walletToSign?.publicKey, (isDeletingPnode ? false : pNodeKeyChanging), true, pnodeInfo?.manager);

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

            if (pNodeKeyChanging && !isDeletingPnode) {
                transaction.partialSign(walletToSign);

                // const signedTx = await wallet.signTransaction(transaction);

                // const simulate = await connection.simulateTransaction(signedTx);
                // console.log("simulate >>> ", simulate);
                // return;

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
            console.error("Error saving changes:", error);
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

            <h2 className="text-3xl font-medium text-white md:leading-tight mt-10 mb-5">pNode Manager&apos;s Portal</h2>

            <>
                <h2 className="text-xl font-medium text-white md:leading-tight  mb-8">pNode(s) Managed by Me</h2>
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
                        <div className='flex flex-col gap-8 bg-tiles border-xnd w-full text-white p-5 relative text-base min-w-max'>
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
                                                    <th className="bg-tiles-dark text-white normal-case font-medium text-base text-center">Registration Time</th>
                                                    <th className="bg-tiles-dark text-white normal-case font-medium text-base text-center">Devnet pNode Pubkey</th>
                                                    <th className="bg-tiles-dark text-white normal-case font-medium text-base text-center">Mainnet pNode Pubkey</th>
                                                    <th className="bg-tiles-dark text-white normal-case font-medium text-base text-center">Owner</th>
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
                                                            <td className="bg-tiles-dark text-center">
                                                                <div className="flex items-center justify-center h-full min-h-[40px]">
                                                                    <span>
                                                                        {pnode?.registration_time && pnode?.registration_time > 0
                                                                            ? new Date(pnode?.registration_time < 10000000000 ? pnode?.registration_time * 1000 : pnode?.registration_time).toLocaleString()
                                                                            : '-'}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            {/* <td className="bg-tiles-dark text-center hover:cursor-pointer" onClick={() => copyToClipboard(pnode?.pnodeKey?.toString())}>{pnode?.pnodeKey?.toString().slice(0, 4)}...{pnode?.pnodeKey?.toString().slice(-4)}</td> */}
                                                            {/*devnet pNode PubKey */}
                                                            <td className="bg-tiles-dark text-center relative group">
                                                                <div className="flex flex-row items-center justify-center gap-3 h-full min-h-[40px]">
                                                                    {editingCell?.row === index && editingCell?.col === 'devnet_pnode' ? (
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
                                                                                processPublicKey(pnode?.devnet_pnode) == '' ?
                                                                                    '-' :
                                                                                    <span
                                                                                        className="text-xs hover:cursor-pointer hover:text-[#FDA31B]"
                                                                                        onClick={() => copyToClipboard(processPublicKey(pnode?.devnet_pnode) || '')}
                                                                                    >
                                                                                        {processPublicKey(pnode?.devnet_pnode)?.slice(0, 4)}...{processPublicKey(pnode?.devnet_pnode)?.slice(-4)}
                                                                                    </span>
                                                                            }
                                                                            <button
                                                                                onClick={() => startEditing(index, 'devnet_pnode', pnode.devnet_pnode)}
                                                                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                                            >
                                                                                <EditIcon fontSize="small" className="text-gray-400" />
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </td>

                                                            {/*mainnet pNode PubKey */}
                                                            <td className="bg-tiles-dark text-center relative group">
                                                                <div className="flex flex-row items-center justify-center gap-3 h-full min-h-[40px]">
                                                                    {editingCell?.row === index && editingCell?.col === 'mainnet_pnode' ? (
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
                                                                                processPublicKey(pnode?.mainnet_pnode) == '' ?
                                                                                    '-' :
                                                                                    <span
                                                                                        className="text-xs hover:cursor-pointer hover:text-[#FDA31B]"
                                                                                        onClick={() => copyToClipboard(processPublicKey(pnode?.mainnet_pnode) || '')}
                                                                                    >
                                                                                        {processPublicKey(pnode?.mainnet_pnode)?.slice(0, 4)}...{processPublicKey(pnode?.mainnet_pnode)?.slice(-4)}
                                                                                    </span>
                                                                            }
                                                                            <button
                                                                                onClick={() => startEditing(index, 'mainnet_pnode', pnode?.mainnet_pnode)}
                                                                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                                            >
                                                                                <EditIcon fontSize="small" className="text-gray-400" />
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="bg-tiles-dark text-center hover:cursor-pointer" onClick={() => copyToClipboard(pnode?.owner?.toString())}>{pnode?.owner?.toString().slice(0, 4)}...{pnode?.owner?.toString().slice(-4)}</td>
                                                            {/* <td className="bg-tiles-dark text-center">{new Date(Number(pnode?.registration_time)).toLocaleString()}</td> */}
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
                        <div className="bg-black opacity-70 fixed inset-0"></div>
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
                                            <p className='text-lg text-[#D98C18] hover:text-[#fda31b]'>Commission</p>
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
                                            <p className='text-lg text-[#D98C18] hover:text-[#fda31b]'>Website</p>
                                        </div>
                                        <input
                                            id='website'
                                            placeholder=''
                                            inputMode='text'
                                            type='text'
                                            className='input-md bg-tiles outline-none box-content border-xnd text-white text-right pr-7 md:min-w-[18rem]'
                                            value={website}
                                            onChange={(e) => { setWebsite(e?.target?.value) }}
                                        />
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
