import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { Connection, Keypair, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import Loader from "components/Loader";
import { fetchAllManagers, fetchOwnerData, fetchPNodeOwnerData, updatePnodeDetails } from "helpers/manageHelpers";
import dynamic from "next/dynamic";
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import EditIcon from '@mui/icons-material/Edit';
import { Telegram, Delete, Search } from "@mui/icons-material";
import { FC, useEffect, useRef, useState } from "react";
import { notify } from "utils/notifications";
import { readPnodeInfoArray } from "helpers/pNodeHelpers";
import { readMetaplexMetadata } from "helpers/tokenHelpers";
import { NftLogo } from "components/NftLogo";

import { InputAdornment, TextField } from "@mui/material";
import { getKeypairForSigning } from "services/keypairServices";

const WalletMultiButtonDynamic = dynamic(
    async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
    { ssr: false }
);

export const OwnerView: FC = ({ }) => {

    const wallet = useWallet();
    const { connection } = useConnection();
    // const connection = new Connection('https://devnet.helius-rpc.com/?api-key=2aca1e9b-9f51-44a0-938b-89dc6c23e9b4', 'confirmed');

    const [managers, setManagers] = useState<any[]>([]);
    const [pNodeData, setPNodeData] = useState<any[]>([{
        pnode: '',
        registrationTime: '',
        nft: '',
        manager: '',
        managerCommission: '',
    }]);
    const [modifiedRows, setModifiedRows] = useState<number[]>([]);

    const [showPopupSelectNFT, setShowPopupSelectNFT] = useState(false);
    const [showPopupSelectManager, setShowPopupSelectManager] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isRegistered, setIsRegistered] = useState(false);
    const [isManagerUpdated, setIsManagerUpdated] = useState(false);
    const [hasPnode, setHasPNode] = useState(false);
    const [pNodeIndex, setPNodeIndex] = useState(0);
    const [isProcessing, setIsProcessing] = useState({
        task: '',
        status: false,
        index: 0
    });
    const [searchTerm, setSearchTerm] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 10
    const [nftData, setNftData] = useState<any[]>([]);
    const [data, setData] = useState(pNodeData || []);
    const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
    const [editValue, setEditValue] = useState('');
    const [savingRow, setSavingRow] = useState<number | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

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
            setNftData(nfts || []);
            const managersData = await fetchAllManagers(connection);
            if (managersData && managersData.length > 0) {
                const formattedManagers = managersData.map((manager) => ({
                    pubkey: manager?.data?.pubkey.toString(),
                    commission: manager?.data?.commission, // Convert basis points to percentage
                    currentlyOperating: manager?.data?.currentlyOperating,
                    Telegram: `https://t.me/${manager?.data?.telegramId}`,
                    discord: manager?.data?.discordId,
                    verified: manager?.data?.verified,
                    wesiteLink: manager?.data?.websiteLink,
                }));

                setIsRegistered(wallet?.publicKey && formattedManagers?.find(manager => manager?.pubkey?.toString() == wallet?.publicKey?.toString()) ? true : false);
                setManagers(formattedManagers);
                setIsLoading(false);

            } else {
                setManagers([]);
                setIsLoading(false);
            }

            const ownerData = await fetchOwnerData(connection, wallet?.publicKey);
            const pNodeOwnerData = await fetchPNodeOwnerData(connection, wallet?.publicKey);
            setHasPNode(Number(pNodeOwnerData?.pnode) > 0);

            if (!ownerData) {
                // contruct pNodeData with empry managers based on pNodeOwnerData?.pnode value (pNodeOwnerData?.pnode times manager)
                const emptyManagers = Array.from({ length: Number(pNodeOwnerData?.pnode) }, (_, index) => ({
                    index: index,
                    manager: '',
                }));
                setIsLoading(false);
                setIsRegistered(false);
                setPNodeData(emptyManagers);
                return;
            }
            setIsRegistered(true);

            const pNodeInfoData = await readPnodeInfoArray(connection, wallet?.publicKey);

            if (Number(pNodeOwnerData?.pnode)) {

                setPNodeData(pNodeInfoData.slice(0, pNodeOwnerData?.pnode));
                setIsLoading(false);

            } else {
                setManagers([]);
                setIsLoading(false);
            }
        } catch (error) {
            console.error("Fetch data error:", error);
            notify({ type: 'error', message: `Failed to fetch data: ${error?.message || error}` });
            setIsLoading(false);
        }
    }

    const filteredItems = managers.filter(item =>
        item.pubkey.toString().toLowerCase().includes(searchTerm.toLowerCase())
    )

    // const indexOfLastItem = currentPage * itemsPerPage
    // const indexOfFirstItem = indexOfLastItem - itemsPerPage
    // const currentItems = filteredItems.slice(indexOfFirstItem, indexOfLastItem)


    // function on saving changes
    const onHandleChanges = async (index?: number, type?: string) => {
        if (index === undefined) return;
        setSavingRow(index);
        setIsProcessing({ task: 'assign', status: true, index });

        try {
            if (!wallet || !wallet.publicKey) {
                notify({ type: 'error', message: 'Please connect your wallet' });
                setSavingRow(null);
                return;
            }
            const oldManager = pNodeData[index]?.manager
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
                pnode: pnodeInfo.pnode instanceof PublicKey ? pnodeInfo.pnode : new PublicKey(pnodeInfo.pnode || DEFAULT_VALUE),
                nft_slot_1: pnodeInfo.nft_slot_1 instanceof PublicKey ? pnodeInfo.nft_slot_1 : new PublicKey(pnodeInfo.nft_slot_1 || DEFAULT_VALUE),
                nft_slot_2: pnodeInfo.nft_slot_2 instanceof PublicKey ? pnodeInfo.nft_slot_2 : new PublicKey(pnodeInfo.nft_slot_2 || DEFAULT_VALUE),
                manager: pnodeInfo.manager instanceof PublicKey ? pnodeInfo.manager : new PublicKey(pnodeInfo.manager || DEFAULT_VALUE),
            }

            // Read current pnode info to check if pnode key is changing
            const currentPnodeInfos = await readPnodeInfoArray(connection, wallet?.publicKey);
            const oldPnodeKey = currentPnodeInfos && currentPnodeInfos[index] ?
                currentPnodeInfos[index].pnode : PublicKey.default;

            const pNodeKeyChanging = !oldPnodeKey.equals(pnodeInfo.pnode);

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
            const txIx = await updatePnodeDetails(wallet.publicKey, index, pnodeInfo, oldManager, pNodeKeyChanging, false);

            if (txIx && typeof txIx === 'object' && 'error' in txIx) {
                notify({ type: 'error', message: `${(txIx as any).error}` });
                setSavingRow(null);
                return;
            }

            transaction.add(txIx as TransactionInstruction);

            const { context: { slot: minContextSlot }, value: { blockhash, lastValidBlockHeight } } =
                await connection.getLatestBlockhashAndContext('confirmed');

            transaction.recentBlockhash = blockhash;
            transaction.feePayer = wallet.publicKey;
            let tx = '';

            if (pNodeKeyChanging) {
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
            setIsProcessing({ task: '', status: false, index: 0 });
        }
    };

    //copy to clipboard method 
    function copyToClipboard(pubkey: string) {
        navigator?.clipboard?.writeText(pubkey).then(() => {
            notify({ type: 'success', message: 'Copied to the clipboard!' });

        }).catch((error) => {
            notify({ type: 'error', message: `Oops! Error occurred.` });

        });
    };

    function processPublicKey(key: PublicKey) {
        if (key?.toString() == "11111111111111111111111111111111") {
            return '';
        }
        return key?.toString();
    }

    // Sync data when pNodeData changes
    useEffect(() => {
        if (!isLoading) {
            setData(pNodeData || []);
        }
    }, [pNodeData, isLoading]);

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

        // Open modal if needed
        if (col === 'nft') {
            setPNodeIndex(row);
            setShowPopupSelectNFT(true);
        } else if (col === 'manager') {
            setPNodeIndex(row);
            setShowPopupSelectManager(true);
        }
    };

    const saveEdit = () => {
        try {
            if (editingCell === null) return;
            const { row, col } = editingCell;
            const newValue = editValue.trim();
            const oldValue = pNodeData[row]?.[col];

            const updatedData = [...data];

            //updated the pnode registration time if pnode value changed
            if (col === 'pnode' && newValue !== oldValue?.toString()) {
                if (newValue === '') {
                    updatedData[row] = { ...updatedData[row], [col]: new PublicKey("11111111111111111111111111111111"), ["registrationTime"]: 0 };
                } else if (!PublicKey.isOnCurve(newValue)) {
                    notify({ type: 'error', message: 'Invalid Public Key format.' });
                    setEditingCell(null);
                    setEditValue('');
                    return;
                }
                // check if the new pnode value is already exists in other rows
                else if (updatedData.some((item, index) => index !== row && item.pnode?.toString() === newValue)) {
                    notify({ type: 'error', message: 'This pNode Public Key is already registered.' });
                    setEditingCell(null);
                    setEditValue('');
                    return;
                } else {
                    updatedData[row] = { ...updatedData[row], [col]: new PublicKey(newValue), ["registrationTime"]: Date.now() };
                }
            }

            // save if the manager value changed
            if (col === 'manager') {
                setIsManagerUpdated(true);
            }

            setData(updatedData);

            // Detect if this row is now modified
            const rowChanged = JSON.stringify(updatedData[row]) !== JSON.stringify(pNodeData[row]);
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

    return (
        <>
            <div className='flex flex-col gap-8 bg-tiles border-xnd w-full text-white p-5  relative md:mb-0 mb-28 text-base'>
                <div className="absolute -inset-2 -z-10 bg-gradient-to-r from-[#fda31b] via-[#622657] to-[#198476] border-xnd blur  "></div>

                {!isLoading && (!wallet?.connected || !wallet?.publicKey) ?

                    <div className="flex flex-col items-center justify-center w-full mt-5" >
                        <WalletMultiButtonDynamic className="btn btn-sm rounded-btn text-lg" style={{ "backgroundColor": '#FDA31b' }
                        }>
                            <AccountBalanceWalletIcon fontSize='small' className='text-white mr-2' />
                            Connect Wallet
                        </WalletMultiButtonDynamic>
                    </div>
                    :
                    <div className="overflow-x-auto w-full">
                        <table className="table table-auto table-zebra w-full normal-case border-collapse border border-gray-400">
                            <thead>
                                <tr className="border-b border-gray-400">
                                    <th className="bg-tiles-dark text-white normal-case font-medium text-base text-center">Index</th>
                                    <th className="bg-tiles-dark text-white normal-case font-medium text-base text-center">Registration Time</th>
                                    <th className="bg-tiles-dark text-white normal-case font-medium text-base text-center">pNode PubKey</th>
                                    {/* <th className="bg-tiles-dark text-white normal-case font-medium text-base text-center">NFT PubKey</th> */}
                                    <th className="bg-tiles-dark text-white normal-case font-medium text-base text-center">Manager</th>
                                    <th className="bg-tiles-dark text-white normal-case font-medium text-base text-center">Commission</th>
                                    <th className="bg-tiles-dark text-white normal-case font-medium text-base text-center">Actions</th>
                                </tr>
                            </thead>
                            {
                                isLoading ?
                                    <tbody>
                                        <tr>
                                            <td colSpan={6} className="bg-tiles-dark text-center">
                                                <div className="flex flex-col items-center justify-center my-2">
                                                    <Loader />
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                    :
                                    !hasPnode ?
                                        <tbody>
                                            <tr>
                                                <td colSpan={6} className="bg-tiles-dark text-center">
                                                    <div className="flex flex-col items-center justify-center my-5 text-[#fda31b]">
                                                        <span className="text-lg">No pNodes found</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        </tbody>
                                        :
                                        <tbody>
                                            {data?.map((pnode, index) => {
                                                const isModified = modifiedRows.includes(index);
                                                const isSaving = savingRow === index;

                                                return (
                                                    <tr key={index} className="font-light text-white text-sm">
                                                        {/* Index */}
                                                        <td className="bg-tiles-dark text-center">
                                                            <div className="flex items-center justify-center h-full min-h-[40px]">
                                                                <span>{index + 1}</span>
                                                            </div>
                                                        </td>

                                                        {/* Registration Time */}
                                                        <td className="bg-tiles-dark text-center">
                                                            <div className="flex items-center justify-center h-full min-h-[40px]">
                                                                <span>
                                                                    {pnode?.registrationTime && pnode.registrationTime > 0
                                                                        ? new Date(pnode.registrationTime).toLocaleString()
                                                                        : '-'}
                                                                </span>
                                                            </div>
                                                        </td>

                                                        {/* pNode PubKey */}
                                                        <td className="bg-tiles-dark text-center relative group">
                                                            <div className="flex flex-row items-center justify-center gap-3 h-full min-h-[40px]">
                                                                {editingCell?.row === index && editingCell?.col === 'pnode' ? (
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
                                                                            processPublicKey(pnode?.pnode) == '' ?
                                                                                '-' :
                                                                                <span
                                                                                    className="text-xs hover:cursor-pointer hover:text-[#FDA31B]"
                                                                                    onClick={() => copyToClipboard(processPublicKey(pnode?.pnode) || '')}
                                                                                >
                                                                                    {processPublicKey(pnode?.pnode)?.slice(0, 4)}...{processPublicKey(pnode?.pnode)?.slice(-4)}
                                                                                </span>
                                                                        }
                                                                        <button
                                                                            onClick={() => startEditing(index, 'pnode', pnode.pnode)}
                                                                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                                        >
                                                                            <EditIcon fontSize="small" className="text-gray-400" />
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </td>

                                                        {/* NFT */}
                                                        {/* <td className="bg-tiles-dark text-center">
                                                            <div className="flex items-center justify-center h-full min-h-[40px] gap-2">
                                                                {showPopupSelectNFT && editingCell?.row === index && editingCell?.col === 'nft' ? (
                                                                    <span className="text-xs text-orange-400">Selecting NFT...</span>
                                                                ) : processPublicKey(pnode?.nft) ? (
                                                                    <>
                                                                        <span
                                                                            className="text-xs hover:cursor-pointer hover:text-[#FDA31B]"
                                                                            onClick={() => copyToClipboard(pnode.nft.toString())}
                                                                        >
                                                                            {pnode.nft.toString().slice(0, 4)}...{pnode.nft.toString().slice(-4)}
                                                                        </span>
                                                                        <div className="flex gap-1">
                                                                            <button onClick={() => startEditing(index, 'nft', pnode.nft)}>
                                                                                <EditIcon fontSize="small" className="text-gray-400" />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => window.confirm('Remove NFT?') && onHandleChanges(index, 'nft')}
                                                                                className="text-red-500 hover:text-red-400"
                                                                                disabled={isSaving}
                                                                            >
                                                                                {isSaving ? <span className="loading loading-spinner loading-xs"></span> : <Delete fontSize="small" />}
                                                                            </button>
                                                                        </div>
                                                                    </>
                                                                ) : (
                                                                    <button
                                                                        className="btn btn-xs bg-[#d98c18] hover:bg-[#fda31b] text-white"
                                                                        onClick={() => startEditing(index, 'nft', '')}
                                                                    >
                                                                        Select NFT
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td> */}

                                                        {/* Manager */}
                                                        <td className="bg-tiles-dark text-center">
                                                            <div className="flex items-center justify-center gap-2 h-full min-h-[40px]">
                                                                {showPopupSelectManager && editingCell?.row === index && editingCell?.col === 'manager' ? (
                                                                    <span className="text-xs text-orange-400">Selecting...</span>
                                                                ) : processPublicKey(pnode?.manager) != '' ? (
                                                                    <>
                                                                        <span
                                                                            className="text-xs hover:cursor-pointer hover:text-[#FDA31B]"
                                                                            onClick={() => copyToClipboard(pnode.manager.toString())}
                                                                        >
                                                                            {
                                                                                processPublicKey(pnode.manager) == '' ?
                                                                                    '-' :
                                                                                    processPublicKey(pnode.manager)?.slice(0, 4)}...{processPublicKey(pnode.manager)?.slice(-4)
                                                                            }
                                                                        </span>
                                                                        <div className="flex gap-1">
                                                                            <button onClick={() => startEditing(index, 'manager', pnode.manager)}>
                                                                                <EditIcon fontSize="small" className="text-gray-400" />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => window.confirm('Remove manager?') && onHandleChanges(index, 'manager')}
                                                                                className="text-red-500 hover:text-red-400"
                                                                                disabled={isSaving}
                                                                            >
                                                                                {isSaving ? <span className="loading loading-spinner loading-xs"></span> : <Delete fontSize="small" />}
                                                                            </button>
                                                                        </div>
                                                                    </>
                                                                ) : (
                                                                    <button
                                                                        className="btn btn-xs bg-[#d98c18] hover:bg-[#fda31b] text-white"
                                                                        onClick={() => startEditing(index, 'manager', '')}
                                                                    >
                                                                        Select Manager
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>

                                                        {/* Commission */}
                                                        <td className="bg-tiles-dark text-center">
                                                            <span>
                                                                {pnode?.managerCommission > 0 ? `${Number(pnode.managerCommission) / 100}%` : '-'}
                                                            </span>
                                                        </td>

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
                                                                            const originalRow = pNodeData[index];
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
                                                );
                                            })}
                                        </tbody>
                            }
                        </table>

                    </div>
                }
            </div>

            {/* popup to select NFT */}
            {
                showPopupSelectNFT &&
                <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black opacity-70"
                    />
                    {/* Modal Container */}
                    <div className="relative bg-tiles-dark border-xnd p-6 rounded-lg max-w-4xl w-full max-h-[70vh] overflow-y-auto shadow-2xl">
                        <button
                            onClick={() => setShowPopupSelectNFT(false)}
                            className="absolute top-4 right-4 hover:scale-110 transition-transform duration-100 z-10"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                color="#d98c18"
                                viewBox="0 0 24 24"
                                strokeWidth={1.5}
                                stroke="currentColor"
                                className="w-6 h-6"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                            </svg>
                        </button>

                        {/* Title */}
                        <h2 className="text-xl font-medium text-white text-center mb-6 pr-8">
                            Your NFTs
                        </h2>

                        {/* Main Content Card */}
                        <div className="relative bg-tiles border-xnd p-6 text-white text-base">
                            <div className="absolute -inset-2 -z-10 bg-gradient-to-r from-[#fda31b] via-[#622657] to-[#198476] blur rounded-lg"></div>

                            {
                                isLoading ?
                                    <div className="flex flex-col w-full justify-center items-center">
                                        <Loader />
                                    </div>
                                    :
                                    nftData?.length === 0 ?
                                        <div className="text-white">
                                            You do not have any NFTs available.
                                        </div>
                                        :
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            {nftData.map((nft, index) => (
                                                <div key={index} className="flex flex-col bg-tiles-dark border-xnd p-4 gap-5 rounded">
                                                    <div className="flex justify-center items-center w-full">
                                                        <NftLogo nft={nft.name?.toString()?.toLowerCase()} />
                                                    </div>
                                                    <div className="flex flex-col gap-2">
                                                        <span className="text-white font-normal text-base truncate">{nft?.name}</span>
                                                        <span className="text-white font-light text-sm truncate hover:cursor-pointer hover:text-[#FDA31B]" onClick={() => { copyToClipboard(nft?.mint) }}> {nft?.mint?.slice(0, 6)}...{nft?.mint?.slice(-4)}</span>
                                                    </div>
                                                    <button
                                                        className="btn btn-sm text-white bg-[#FDA31B] hover:bg-[#e5941a] w-full normal-case mt-2"
                                                        onClick={() => {
                                                            if (editingCell?.col === 'nft') {
                                                                const row = editingCell.row;
                                                                const updatedData = [...data];
                                                                updatedData[row] = { ...updatedData[row], nft: new PublicKey(nft?.mint) };
                                                                setData(updatedData);

                                                                // Track modification
                                                                const rowChanged = JSON.stringify(updatedData[row]) !== JSON.stringify(pNodeData[row]);
                                                                setModifiedRows(prev =>
                                                                    rowChanged ? [...new Set([...prev, row])] : prev.filter(i => i !== row)
                                                                );

                                                                setEditingCell(null);
                                                                setShowPopupSelectNFT(false);
                                                            }
                                                        }}
                                                    >
                                                        Select
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                            }
                        </div>
                    </div>
                </div>
            }

            {/* popup for selecting manager */}
            {
                showPopupSelectManager &&
                <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black opacity-70"
                    />

                    {/* Modal Container */}
                    <div className="relative bg-tiles-dark border-xnd p-6 rounded-lg max-w-4xl w-full max-h-[70vh] overflow-y-auto shadow-2xl">
                        <button
                            onClick={() => setShowPopupSelectManager(false)}
                            className="absolute top-4 right-4 hover:scale-110 transition-transform duration-100 z-10"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                color="#d98c18"
                                viewBox="0 0 24 24"
                                strokeWidth={1.5}
                                stroke="currentColor"
                                className="w-6 h-6"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                            </svg>
                        </button>

                        {/* Title */}
                        <h2 className="text-xl font-medium text-white text-center mb-6 pr-8">
                            Available Managers
                        </h2>

                        {/* Main Content Card */}
                        <div className="relative bg-tiles border-xnd p-6 text-white text-base">
                            <div className="absolute -inset-2 -z-10 bg-gradient-to-r from-[#fda31b] via-[#622657] to-[#198476] blur rounded-lg"></div>

                            <div className='flex w-full justify-end gap-4 items-center'>

                                <TextField
                                    fullWidth
                                    label='Search by Manager Public Key'
                                    variant='outlined'
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    size='small'
                                    sx={{
                                        width: '250px',
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: '8px',
                                            color: '#ffffff',
                                            '& fieldset': {
                                                borderColor: '##0091ad'
                                            },
                                            '&:hover fieldset': {
                                                borderColor: '#'
                                            },
                                            '&.Mui-focused fieldset': {
                                                borderColor: '#4f46e5'
                                            }
                                        },
                                        '& .MuiInputLabel-root': {
                                            color: '#cbd5e1'
                                        },
                                        '& .MuiInputLabel-root.Mui-focused': {
                                            color: '#cbd5e1'
                                        }
                                    }}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position='start'>
                                                <Search sx={{ color: '#cbd5e1' }} />
                                            </InputAdornment>
                                        )
                                    }}
                                />
                            </div>
                            <div className="overflow-x-auto w-full">
                                <table className="table table-auto table-zebra w-full normal-case border-collapse border border-gray-400">
                                    {/* head */}
                                    <thead>
                                        <tr className="border-b border-gray-400">
                                            <th className="bg-black text-white normal-case font-medium text-base text-center">Public Key</th>
                                            <th className="bg-black text-white normal-case font-medium text-base text-center">Commission</th>
                                            <th className="bg-black text-white normal-case font-medium text-base text-center">Currently Operating</th>
                                            <th className="bg-black text-white normal-case font-medium text-base text-center">Website</th>
                                            <th className="bg-black text-white normal-case font-medium text-base text-center">Discord</th>
                                            <th className="bg-black text-white normal-case font-medium text-base text-center">Telegram</th>
                                            <th className="bg-black text-white normal-case font-medium text-base text-center">Action</th>
                                        </tr>
                                    </thead>
                                    {
                                        isLoading ?
                                            <tbody>
                                                <tr>
                                                    <td colSpan={5} className="bg-black text-center">
                                                        <div className="flex flex-col items-center justify-center my-5">
                                                            <span className="loading loading-spinner loading-lg"></span>
                                                            <span className="text-gray-500">Loading Managers...</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            </tbody>
                                            :
                                            <tbody>
                                                {/* {managers.map((manager, index) => ( */}
                                                {filteredItems.map((manager, index) => (
                                                    <tr key={index} className="font-light text-white text-sm">
                                                        <td className="bg-black text-center hover:cursor-pointer" onClick={() => copyToClipboard(manager.pubkey?.toString())}>{manager?.pubkey?.slice(0, 4)}...{manager.pubkey?.slice(-4)}</td>
                                                        <td className="bg-black text-center">{Number(manager?.commission) / 100}%</td>
                                                        <td className="bg-black text-center">{manager?.currentlyOperating}</td>
                                                        <td className="bg-black text-center hover:cursor-pointer" onClick={() => copyToClipboard(manager?.wesiteLink?.toString())}>{manager?.wesiteLink}</td>
                                                        <td className="bg-black text-center hover:cursor-pointer" onClick={() => copyToClipboard(manager?.discord?.toString())}>{manager?.discord}</td>
                                                        <td className="bg-black text-center">
                                                            <a href={manager?.Telegram} target="_blank" rel="noreferrer">
                                                                <Telegram className="text-white" />
                                                            </a>
                                                        </td>
                                                        <td>
                                                            {
                                                                manager?.verified
                                                                    ?

                                                                    <button
                                                                        className="btn btn-sm bg-[#d98c18] border-xnd hover:bg-[#fda31b]"
                                                                        onClick={() => {
                                                                            if (editingCell?.col === 'manager') {
                                                                                const row = editingCell.row;
                                                                                const updatedData = [...data];
                                                                                updatedData[row] = { ...updatedData[row], manager: new PublicKey(manager?.pubkey), managerCommission: Number(manager?.commission) };
                                                                                setData(updatedData);

                                                                                const rowChanged = JSON.stringify(updatedData[row]) !== JSON.stringify(pNodeData[row]);
                                                                                setModifiedRows(prev =>
                                                                                    rowChanged ? [...new Set([...prev, row])] : prev.filter(i => i !== row)
                                                                                );

                                                                                setEditingCell(null);
                                                                                setShowPopupSelectManager(false);
                                                                            }
                                                                        }}
                                                                    >
                                                                        <span className='normal-case'>Select</span>
                                                                    </button>
                                                                    :
                                                                    <span className="text-red-500 font-medium">Not Verified</span>
                                                            }
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                    }
                                </table>
                            </div>
                        </div>
                    </div>
                </div >
            }

        </>
    );
};
