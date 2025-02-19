// Next, React
import React, { FC } from 'react';
import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import prettyBytes from 'pretty-bytes';
import { getDriveInfo } from '../../services/getDriveInfo';
import { getNetworkInfo } from '../../services/getNetworkInfo';
import { createKeypair } from '../../services/keypairServices'
import Slider from '@mui/material/Slider';
import StorageIcon from '@mui/icons-material/Storage';
import SpeedIcon from '@mui/icons-material/Speed';
import CloseIcon from '@mui/icons-material/Close';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import PublishOutlinedIcon from '@mui/icons-material/PublishOutlined';

import RadioButtonCheckedRoundedIcon from '@mui/icons-material/RadioButtonCheckedRounded';
import Brightness1RoundedIcon from '@mui/icons-material/Brightness1Rounded';

import { CircularProgress, TextField } from '@mui/material';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import { AddBox, IndeterminateCheckBox, Edit, CheckBox } from '@mui/icons-material';
import { useUrlConfiguration } from '../../contexts/UrlProvider';


import {
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID
} from "@solana/spl-token";
import {
  Connection,
  Keypair,
  Transaction,
  clusterApiUrl,
  sendAndConfirmTransaction,
  SystemProgram,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";

import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import * as anchor from '@project-serum/anchor';
import { notify } from 'utils/notifications';
import { FEE_DEPOSIT_ACC, XANDMint } from 'CONSTS';
import Loader from 'components/Loader';





export const HomeView: FC = ({ }) => {

  const wallet = useWallet();
  const { connection } = useConnection();
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });

  const { urlConfiguration } = useUrlConfiguration();

  const [driveInfo, setDriveInfo] = React.useState<Array<any>>([]);
  const [isFetching, setIsFetching] = React.useState<boolean>(false);
  const [dedicatingAmnt, setDedicatingAmnt] = React.useState([{ disk: 0, amount: 0, type: "GB", isEditing: false }]);
  const [inputValue, setInputValue] = React.useState([{ index: 0, amount: 0, type: "GB" }]);
  const [networkStats, setNetworkStats] = React.useState({
    isFetching: false,
    isError: false,
    data: {
      downloadSpeed: 0,
      uploadSpeed: 0,
      latency: 0
    }
  });

  const [showNetworkSpeedModal, setShowNetworkSpeedModal] = React.useState(false);
  const [showKeypairModal, setShowKeypairModal] = React.useState(false);
  const [isRegisterProcessing, setIsRegisterProcessing] = React.useState(false);
  const [isGenerateProcessing, setIsGenerateProcessing] = React.useState(false);

  const [isServiceOnline, setIsServiceOnline] = React.useState(true);

  //read the drive info from the server on page load
  React.useEffect(() => {
    setIsFetching(true);
    getDriveInfo(urlConfiguration).then((response) => {
      if (response.ok) {
        setDriveInfo(response.data);
        setDedicatedInitialAmnt(response.data)
        setIsFetching(false);
      }
    }).catch((error) => {
      setIsFetching(false);
      console.log("error while fetching drive info", error);
    })
  }, [urlConfiguration]);

  //function to set the initial values for dedicating amnt
  const setDedicatedInitialAmnt = (data: Array<any>) => {
    let drives = [];
    data.forEach((drive, index) => {
      drives.push({ disk: index, amount: 0, type: "GB", isEditing: false });
    });
    setDedicatingAmnt(drives);
    return;
  }

  //function related to read the network stats
  const getNetworkStats = async () => {
    setShowNetworkSpeedModal(true);
    setNetworkStats({ isFetching: true, isError: false, data: null });
    try {
      const response = await getNetworkInfo(urlConfiguration);
      if (response.ok) {
        setNetworkStats({ isFetching: false, isError: false, data: response.data });
        return;
      }
    } catch (error) {
      setNetworkStats({ isFetching: false, isError: true, data: null });
    }
  }

  // Function to normalise the values (MIN / MAX could be integrated)
  const normalise = (value, MIN, MAX) => ((value - MIN) * 100) / (MAX - MIN);

  //check the input value is greater than max value
  const forceToMax = (index, max, input) => {
    if (input > max) {
      dedicateWholeDrive(index, true);
    }
  }

  //set the dedicating amnt and type on edit
  const setDedicatingAmntOnEdit = (index) => {
    let amountToDedicate = inputValue[index]?.amount * (dedicatingAmnt[index]?.type == "GB" ? 1000000000 : 10000000000);

    //if input value is 0 then ingore it and keep the previous value as it is
    if (inputValue[index]?.amount == 0) {
      setDedicatingAmnt(prevState => {
        const updatedArray = [...prevState];
        updatedArray[index] = { disk: index, amount: dedicatingAmnt[index]?.amount, type: dedicatingAmnt[index]?.type, isEditing: !dedicatingAmnt[index]?.isEditing };
        return updatedArray;
      });
      return;
    }
    if (inputValue[index]?.type == "TB") {
      amountToDedicate = inputValue[index]?.amount * 1000000000000;
    }

    //if input value is greater than max value then set max value
    if (amountToDedicate > driveInfo[index]?.available) {
      dedicateWholeDrive(index, true);
      return;
    }
    setDedicatingAmnt(prevState => {
      const updatedArray = [...prevState];
      updatedArray[index] = { disk: index, amount: amountToDedicate, type: inputValue[index]?.type, isEditing: !dedicatingAmnt[index]?.isEditing };
      return updatedArray;
    });

  }

  //dedicate the whole drive
  const dedicateWholeDrive = (index, isMax) => {
    let dedicatingAmnt = (driveInfo[index]?.available - 1000000000);;
    if (dedicatingAmnt[index]?.type == "TB" && !isMax) {
      dedicatingAmnt = driveInfo[index]?.available - 100000000000;
      return;
    }

    setDedicatingAmnt(prevState => {
      const updatedArray = [...prevState];
      updatedArray[index] = { disk: index, amount: dedicatingAmnt, type: inputValue[index]?.type, isEditing: false };
      return updatedArray;
    });
  }

  //format the amount to GB or TB
  const formatAmount = (index, amount) => {
    if (dedicatingAmnt[index]?.type == "TB") {
      return (amount / 1000000000000)?.toFixed(2);
    }
    return (amount / 1000000000)?.toFixed(2);
  }

  //generate the keypair
  const onGenerateKeypair = async () => {
    setIsGenerateProcessing(true);
    try {
      const response = await createKeypair(urlConfiguration);

      if (!response?.ok) {
        notify({
          message: "Error",
          description: "You already have a key-pair",
          type: "error",
        });
        setIsGenerateProcessing(false);
        return;
      }

      if (response.ok) {
        notify({
          message: "Success",
          description: "Key-pair generated successfully",
          type: "success",
        });
        setIsGenerateProcessing(false);
        return;
      }

    } catch (error) {
      console.log("error while generating keypair", error);
      notify({
        message: "Error",
        description: "Error while generating keypair",
        type: "error",
      });
      setIsGenerateProcessing(false);
    }
  }

  //register the PNode
  const onRegisterPNode = async () => {
    setIsRegisterProcessing(true);

    try {

      if (!wallet.publicKey) {
        notify({
          message: "Error",
          description: "Wallet not connected",
          type: "error",
        });
        return;
      }

      // XAND balance
      const ataAddress = PublicKey.findProgramAddressSync(
        [wallet?.publicKey?.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), XANDMint.toBuffer()],
        new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')
      )[0];
      const balance = await connection.getTokenAccountBalance(ataAddress);

      if (balance?.value?.uiAmount < 80000) {
        notify({
          message: "Error",
          description: "Insufficient XAND balance",
          type: "error",
        });
        setIsRegisterProcessing(false);
        return;
      }


      const feeDepositAcc = getAssociatedTokenAddressSync(XANDMint, FEE_DEPOSIT_ACC); // 5000XAND
      const refundableDepositAcc = getAssociatedTokenAddressSync(XANDMint, FEE_DEPOSIT_ACC); // 75,000XAND
      const userAcc = getAssociatedTokenAddressSync(XANDMint, wallet?.publicKey);
      const userAccInfo = await connection.getAccountInfo(userAcc);

      console.log("userAccInfo >>> ", userAccInfo);

      const toAccFee = await connection.getAccountInfo(feeDepositAcc);
      const toAccRefund = await connection.getAccountInfo(refundableDepositAcc);

      const transaction = new Transaction();
      let FeeAtaIx: TransactionInstruction = null;
      if (toAccFee == null || !toAccFee) {
        FeeAtaIx = createAssociatedTokenAccountInstruction(wallet?.publicKey, feeDepositAcc, wallet?.publicKey, XANDMint, TOKEN_PROGRAM_ID);
        transaction.add(FeeAtaIx);
      }
      let RefundAtaIx: TransactionInstruction = null;
      if (toAccRefund == null || !toAccRefund) {
        RefundAtaIx = createAssociatedTokenAccountInstruction(wallet?.publicKey, refundableDepositAcc, wallet?.publicKey, XANDMint, TOKEN_PROGRAM_ID);
        transaction.add(RefundAtaIx);
      }

      if (userAccInfo == null || !userAcc) {
        const userAtaIx = createAssociatedTokenAccountInstruction(wallet?.publicKey, userAcc, wallet?.publicKey, XANDMint, TOKEN_PROGRAM_ID);
        transaction.add(userAtaIx);
      }

      const feeTransferIx = createTransferInstruction(
        userAcc,
        // XANDMint,
        feeDepositAcc,
        wallet?.publicKey,
        5000 * Math.pow(10, 9)
      );

      const refundTransferIx = createTransferInstruction(
        userAcc,
        // XANDMint,
        refundableDepositAcc,
        wallet?.publicKey,
        75000 * Math.pow(10, 9)
      );

      transaction.add(feeTransferIx);
      transaction.add(refundTransferIx);

      const {
        context: { slot: minContextSlot },
        value: { blockhash, lastValidBlockHeight }
      } = await connection.getLatestBlockhashAndContext('confirmed');

      // transaction.recentBlockhash = blockhash;
      // transaction.feePayer = wallet.publicKey;
      // wallet.signTransaction(transaction);

      // const simulate = await connection.simulateTransaction(transaction);
      // console.log("simulate >>> ", simulate);
      // return;

      const tx = await wallet.sendTransaction(transaction, connection, {
        minContextSlot,
        skipPreflight: true,
        preflightCommitment: 'processed'
      });

      const confirmTx = await connection?.getSignatureStatuses([tx], { searchTransactionHistory: true });

      // Check if the transaction has a status
      const status = confirmTx?.value[0];
      if (!status) {
        notify({ type: 'error', message: 'Error!', description: 'Transaction status not found!' });
        setIsRegisterProcessing(false);
        return;
      }

      // Check if the transaction failed
      if (status?.err) {
        notify({ type: 'error', message: 'Transaction failed!', description: `${confirmTx?.value[0]?.err?.toString()}` });
        setIsRegisterProcessing(false);
        return;
      }

      notify({ type: 'success', message: 'Transaction Success!', description: 'Transfer is completed. Please wait for registration transaction' });
      setIsRegisterProcessing(false);

    } catch (error) {
      console.log("error while registering PNode", error);
      notify({
        message: "Error",
        description: "Error while registering PNode",
        type: "error",
      });
      setIsRegisterProcessing(false);

    }

  }

  return (
    <div className="flex mx-auto flex-col items-center md:items-start w-full p-4 ">

      {/* div with one side is 1/3 of the full screen with and rest with another div */}
      <div className="w-full h-full flex md:flex-row items-start justify-between gap-4 flex-col-reverse">

        {/* left side column */}
        <div className="w-full flex flex-col items-center justify-around border border-[#4a4a4a] rounded-lg p-2">
          <h4 className="md:w-full text-4xl text-left text-slate-300 ">
            <p>Drive Information</p>
          </h4>
          <div className='border-b border-[#4a4a4a] mb-4 mt-2 w-full' />
          {
            isFetching ?
              <div className="flex flex-col justify-center items-center w-full">
                <CircularProgress />
              </div>
              :
              <div className="w-full mx-auto grid grid-cols-1 md:grid-cols-3 2xl:grid-cols-4 justify-items-center justify-center gap-y-16 gap-x-10 mt-14 mb-5">
                {
                  driveInfo?.length > 0 && isServiceOnline ?
                    driveInfo?.map((drive, index) => {
                      return (
                        // <div key={index} className="relative group lg:min-w-[22rem] min-w-full max-w-md">
                        <div key={index} className="card relative flex gap-3 w-full project-card min-w-full min-h-[7rem] rounded-xl overflow-hidden items-center justify-between">

                          <div className="card-body w-full">
                            {/* <div className="bg-black p-4 rounded-lg shadow-md min-w-[20rem] border-white border"> */}
                            {/* <h2 className="text-2xl font-bold mb-4">Drive {index + 1}</h2> */}
                            <Box sx={{ width: '100%', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 4 }}>
                              <StorageIcon color='primary' fontSize='large' />
                              <h2 className="text-2xl font-bold ">{drive?.name || "Drive " + (index + 1)}</h2>
                            </Box>
                            <Box sx={{ width: '100%', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 4 }}>
                              <SpeedIcon color='primary' fontSize='medium' />
                              <h2 className="text-xl font-bold ">{drive?.type}</h2>
                            </Box>
                            {/* <p>Total Space: {prettyBytes(drive?.capacity)}</p> */}
                            <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ width: '100%' }}>
                                {/* <span>{drive.used}GB</span> */}
                              </Box>
                              <Box sx={{ width: '100%', mr: 1 }}>
                                <LinearProgress variant="determinate" value={normalise((drive?.capacity - drive?.available), 0, drive?.capacity)} />
                              </Box>
                              <Box sx={{ width: '100%' }}>
                                {/* <span>{drive.used}GB</span> */}
                                <span>{prettyBytes(drive?.available ?? 0)} available of {prettyBytes(drive?.capacity || drive?.capacity)} </span>
                              </Box>
                            </Box>
                            <div className='border-b border-[#4a4a4a] my-8 w-full' />
                            <p>Dedicate space</p>

                            <Box sx={{ width: '100%' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Box sx={{ width: '100%', mx: '0.35rem' }}>
                                  <Slider
                                    size="medium"
                                    defaultValue={0}
                                    min={10000000000}
                                    max={drive?.available - 10000000000}
                                    aria-label="Small"
                                    valueLabelDisplay="off"
                                    value={dedicatingAmnt[index]?.amount}
                                    onChange={(event, value) => {
                                      setDedicatingAmnt(prevState => {
                                        const updatedArray = [...prevState];
                                        updatedArray[index] = { disk: index, amount: value as number, type: ((prettyBytes(value as number || 0))?.split(" ")[1]), isEditing: false };
                                        return updatedArray;
                                      });
                                    }}
                                    marks={[
                                      {
                                        value: 1000000000,
                                        label: '0',
                                      },
                                      {
                                        value: drive?.capacity,
                                        label: prettyBytes(drive?.capacity ?? 0),
                                      },
                                    ]}
                                    step={5000000000}
                                    disabled={drive?.capacity - 10000000000 <= 0}
                                  />
                                </Box>
                                {/* <span>{(prettyBytes(dedicatingAmnt[index]?.amount)).split(" ")[1]}</span> */}


                              </Box>
                            </Box>

                            <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', width: '100%', marginBottom: 5 }}>
                              <IconButton
                                aria-label="delete"
                                color='info'
                                onClick={() => {
                                  setDedicatingAmnt(prevState => {
                                    const updatedArray = [...prevState];
                                    if (dedicatingAmnt[index]?.amount - 10000000000 > drive?.available + 10000000000) {
                                      return;
                                    };
                                    updatedArray[index] = { disk: index, amount: updatedArray[index].amount - 10000000000, type: ((prettyBytes(dedicatingAmnt[index]?.amount - 10000000000 || 0))?.split(" ")[1]), isEditing: false };
                                    return updatedArray;
                                  });
                                }}
                                disabled={dedicatingAmnt[index]?.amount - 10000000000 <= 0}
                              >
                                <IndeterminateCheckBox />
                              </IconButton>
                              {dedicatingAmnt[index]?.isEditing
                                ?
                                <TextField
                                  id="outlined-basic"
                                  variant='outlined'
                                  // value={(dedicatingAmnt[index]?.amount / (dedicatingAmnt[index]?.type == "TB" ? 1000000000000 : 1000000000)).toFixed(2)}
                                  // value={(inputValue[index]?.amount / 1000000000)}
                                  value={(inputValue[index]?.amount)}
                                  size="small"
                                  inputMode='decimal'
                                  onChange={(e) => {
                                    setInputValue(prevState => {
                                      const updatedArray = [...prevState];
                                      if (isNaN(parseFloat(e.target.value))) {
                                        return updatedArray;

                                      }
                                      // updatedArray[index] = { disk: index, amount: Math.abs(isNaN(parseFloat(e.target.value)) ? 0 : parseFloat(e.target.value) * 1000000000), type: ((prettyBytes((parseFloat(e.target.value) * 1000000000) || 0))?.split(" ")[1]) };
                                      updatedArray[index] = { index: index, amount: Math.abs(parseFloat(e.target.value)), type: dedicatingAmnt[index]?.type };
                                      return updatedArray;
                                    });
                                  }}
                                  onBlur={() => { forceToMax(index, (drive?.available - 10000000000), dedicatingAmnt[index]?.amount) }}
                                  InputProps={{
                                    inputProps: { min: 1000000000 },
                                    endAdornment: (
                                      // <div className='flex flex-row items-center ml-1 text-white'>
                                      //   <span className='pb-1'>{(prettyBytes(dedicatingAmnt[index]?.amount || 0))?.split(" ")[1] || null}</span>
                                      // </div>

                                      <div className='flex flex-row items-center ml-1 text-white'>
                                        <Select
                                          sx={{ color: 'white', minWidth: '4.35rem' }}
                                          value={inputValue[index]?.type}
                                          onChange={(event: SelectChangeEvent) => {
                                            setInputValue(prevState => {
                                              const updatedArray = [...prevState];
                                              updatedArray[index] = { type: event.target.value, index: index, amount: updatedArray[index].amount };
                                              return updatedArray;
                                            });
                                          }}
                                          displayEmpty
                                          inputProps={{ 'aria-label': 'Without label' }}
                                        >
                                          <MenuItem value="GB">GB</MenuItem>
                                          <MenuItem value="TB">TB</MenuItem>
                                        </Select>
                                        <IconButton
                                          aria-label="delete"
                                          color='info'
                                          // disabled={dedicatingAmnt[index]?.amount + 10000000000 > drive?.available - 10000000000}
                                          onClick={() => { setDedicatingAmntOnEdit(index) }}
                                        >
                                          <CheckBox />
                                        </IconButton>
                                      </div>
                                    ),
                                  }}
                                  className='text-white bg-black w-1/2'
                                  sx={{
                                    '& .MuiOutlinedInput-root': {
                                      '& fieldset': {
                                        borderBottom: '1px solid #2196f3',  // Customize the border style
                                      },
                                    },
                                    input: {
                                      color: 'white',
                                      textAlign: 'right',
                                      width: '50%',
                                    },
                                  }}
                                  disabled={drive?.capacity - 10000000000 <= 0}
                                />
                                :
                                <div className='flex flex-row items-center ml-1 text-white'>
                                  <span className='pb-1'>{formatAmount(index, dedicatingAmnt[index]?.amount)}&nbsp;</span>
                                  <span className='pb-1'>{(prettyBytes(dedicatingAmnt[index]?.amount || 0))?.split(" ")[1] || null}</span>
                                  <IconButton
                                    aria-label="edit"
                                    color='info'
                                    onClick={() => {
                                      setInputValue(prevState => {
                                        const updatedArray = [...prevState];
                                        updatedArray[index] = { index: index, amount: parseFloat(formatAmount(index, dedicatingAmnt[index]?.amount)), type: dedicatingAmnt[index]?.type };
                                        return updatedArray;
                                      });
                                      setDedicatingAmnt(prevState => {
                                        const updatedArray = [...prevState];
                                        updatedArray[index] = { disk: index, amount: dedicatingAmnt[index]?.amount, type: dedicatingAmnt[index]?.type, isEditing: !dedicatingAmnt[index]?.isEditing };
                                        return updatedArray;
                                      });
                                    }}
                                  >
                                    <Edit />
                                  </IconButton>

                                </div>
                              }

                              <IconButton
                                aria-label="delete"
                                color='info'
                                disabled={dedicatingAmnt[index]?.amount + 10000000000 > drive?.available}
                                onClick={() => {
                                  setDedicatingAmnt(prevState => {
                                    const updatedArray = [...prevState];
                                    if (dedicatingAmnt[index]?.amount + 10000000000 > drive?.capacity - 10000000000) return;
                                    updatedArray[index] = { disk: index, amount: updatedArray[index].amount + 10000000000, type: ((prettyBytes(dedicatingAmnt[index]?.amount + 10000000000 || 0))?.split(" ")[1]), isEditing: false };
                                    return updatedArray;
                                  });
                                }}
                              >
                                <AddBox />
                              </IconButton>
                            </Box>
                            {
                              (drive?.capacity - 10000000000 <= 0) ?

                                <button
                                  className="w-full btn bg-[#808080] text-slate-600"
                                  onClick={undefined}
                                >
                                  <span>
                                    Unavailable
                                  </span>
                                </button>
                                :
                                <div className='w-full'>
                                  {
                                    index == 0 ?
                                      <button
                                        className="w-full btn bg-gradient-to-br from-[#622657] to-[#622657] hover:from-[#742f68] hover:to-[#742f68] text-white hover:text-white mb-4"
                                        onClick={() => { getNetworkStats() }}
                                      >
                                        <span>
                                          Test Network Speed
                                        </span>
                                      </button>
                                      :
                                      null
                                  }
                                  <button
                                    className="w-full btn bg-gradient-to-br from-[#198476] to-[#198476] hover:from-[#129f8c] hover:to-[#129f8c] text-white hover:text-black mb-4"
                                    onClick={() => {
                                      dedicateWholeDrive(index, false);
                                      // setDedicatingAmnt(prevState => {
                                      //   const updatedArray = [...prevState];
                                      //   // updatedArray[index] = { disk: index, amount: Math.abs(isNaN(parseFloat(e.target.value)) ? 0 : parseFloat(e.target.value) * 1000000000), type: ((prettyBytes((parseFloat(e.target.value) * 1000000000) || 0))?.split(" ")[1]) };
                                      //   updatedArray[index] = { disk: index, amount: Math.abs(isNaN(parseFloat(drive?.available)) ? 0 : parseFloat(drive?.available) * (dedicatingAmnt[index]?.type == "GB" ? 1000000000 : 10000000000)), type: ((prettyBytes((parseFloat(drive?.available) * 1000000000) || 0))?.split(" ")[1]), isEditing: false };
                                      //   return updatedArray;
                                      // });
                                    }
                                    }
                                  >
                                    <span>
                                      Dedicate whole Drive for Rewards Boost
                                    </span>
                                  </button>
                                  <button
                                    className="w-full btn bg-gradient-to-br from-[#fda31b] to-[#fda31b] hover:from-[#fdb74e] hover:to-[#fdb74e] text-white hover:text-black"
                                    onClick={undefined}
                                  >
                                    <span>
                                      Dedicate and Earn
                                    </span>
                                  </button>
                                </div>

                            }
                          </div>


                        </div>
                      )
                    })
                    :
                    <div className="flex flex-col justify-center items-center">
                      <p className="text-2xl font-bold">No Drives Found</p>
                    </div>
                }
              </div>
          }
        </div>


        {/* right side column */}

        <div className="w-full md:w-[20%] flex flex-col items-center justify-around border border-[#4a4a4a] rounded-lg h-full p-2">
          <div className='w-full flex flex-row items-center justify-around gap-4 border-b border-[#4a4a4a] pb-2'>
            {/* <span className="text-4xl  text-slate-300 flex flex-row items-center gap-2">
              Status :
            </span> */}
            {
              isServiceOnline ?
                <div className='flex flex-col items-center gap-2'>
                  <span className="text-4xl text-slate-300 "><Brightness1RoundedIcon color='success' className='animate-pulse' /> Online</span>
                </div>
                :
                <div className='flex flex-row items-center gap-2'>
                  <span className="text-4xl text-slate-300 "><RadioButtonCheckedRoundedIcon color='error' className='animate-pulse' /> Stopped</span>
                </div>
            }
          </div>

          <div className='w-full flex flex-col items-center justify-between mt-8 gap-8 pt-5'>
            {
              isServiceOnline ?
                <button className='btn bg-[#b7094c] text-white w-full normal-case' onClick={() => { setIsServiceOnline(false) }}>Stop the service</button>
                :
                <button className='btn bg-[#129f8c] text-white w-full normal-case' onClick={() => { setIsServiceOnline(true) }}>Start the service</button>
            }
            {/* <button className='btn bg-[#FDA31B] hover:bg-[#622657] text-white w-full mt-5'>Claim Rewards</button> */}
            <button onClick={onRegisterPNode} disabled={!wallet?.connected || isRegisterProcessing} className='btn bg-[#FDA31B] hover:bg-[#622657] rounded-lg font-light w-full disabled:hover:bg-none disabled:bg-[#909090] text-white mt-8  normal-case'>

              {
                isRegisterProcessing ?
                  <Loader />
                  :
                  <span className="block group-disabled:hidden" >
                    Register PNode
                  </span>
              }

              <div className="hidden group-disabled:block normal-case">
                Register PNode
              </div>
            </button>

            <button onClick={onGenerateKeypair} disabled={!wallet?.connected || isGenerateProcessing} className='btn bg-[#FDA31B] hover:bg-[#622657] rounded-lg font-light w-full disabled:hover:bg-none disabled:bg-[#909090] text-white mt-8  normal-case'>

              {
                isGenerateProcessing ?
                  <Loader />
                  :
                  <span className="block group-disabled:hidden" >
                    Generate Identity Key-pair
                  </span>
              }

              <div className="hidden group-disabled:block normal-case">
                Generate Identity Key-pair
              </div>
            </button>

          </div>
        </div>
      </div>

      {/* Modals */}

      {/* network speed check modal */}
      {
        showNetworkSpeedModal ?
          <div className="flex flex-col justify-center items-center overflow-x-hidden overflow-y-auto fixed inset-0 z-50 focus:outline-none bg-[#0000009b] opacity-100">
            <div className="justify-center items-center flex-col overflow-x-hidden overflow-y-auto fixed  z-9999 rounded-lg px-10 py-5 bg-[#08113b]">
              <div className="absolute top-0 right-0 p-5 ">
                <CloseIcon sx={[{ color: "#b7094c", transform: "scale(1.5)" },
                { transition: "transform .1s" },
                {
                  '&:hover': {
                    // color: 'white',
                    cursor: 'pointer',
                    transform: "scale(1.7)"
                  },
                }]}
                  onClick={() => {
                    setShowNetworkSpeedModal(false);
                    networkStats?.data?.downloadSpeed == 0 ?
                      setNetworkStats({
                        isFetching: false, isError: false, data: null
                      })
                      :
                      null
                  }}
                >
                </CloseIcon>
              </div>
              {
                networkStats?.isFetching ?
                  <div className='text-center font-normal my-5 mt-10 w-[50ch]'>
                    <CircularProgress />
                  </div>
                  :
                  networkStats?.isError ?
                    <div className='text-center font-normal my-5 mt-10 w-[50ch]'>
                      <p className='text-2xl mb-4 '>Something went wrong. Please try again...</p>
                      <button
                        className="w-full btn bg-gradient-to-br from-[#fda31b] to-[#fda31b] hover:from-[#fdb74e] hover:to-[#fdb74e] text-white hover:text-black"
                        onClick={() => { getNetworkStats() }}
                      >
                        <span>
                          Retry
                        </span>
                      </button>
                    </div>
                    :
                    <div className='text-left font-normal my-5 mt-10 w-[50ch]'>
                      <p className='text-2xl mb-4 text-center'>Network Speed Status</p>
                      <div className='border-b border-[#4a4a4a] my-4 w-full' />
                      <div className='flex flex-row items-center justify-between mb-4'>
                        <div className="flex flex-col gap-4">
                          <p className='text-xl'>
                            <span className='mr-2'><DownloadOutlinedIcon /></span>
                            Download Speed
                          </p>
                          <p className='text-xl'>
                            <span className='mr-2'><PublishOutlinedIcon /></span>
                            Upload Speed
                          </p>
                          <p className='text-xl'>
                            <span className='mr-2'><TimerOutlinedIcon /></span>
                            Latency
                          </p>
                        </div>
                        <div className="flex flex-col  gap-4">
                          <p className='text-xl'>
                            :
                          </p>
                          <p className='text-xl'>
                            :
                          </p>
                          <p className='text-xl'>
                            :
                          </p>
                        </div>
                        <div className="flex flex-col  gap-4">
                          <p className='text-xl'>
                            {networkStats?.data?.downloadSpeed?.toFixed(2)} Mbps
                          </p>
                          <p className='text-xl'>
                            {networkStats?.data?.uploadSpeed?.toFixed(2)} Mbps
                          </p>
                          <p className='text-xl'>
                            {networkStats?.data?.latency} ms
                          </p>
                        </div>
                      </div>
                    </div>
              }

            </div>
          </div>
          :
          null
      }

      {/* network speed check modal */}
      {
        showKeypairModal ?
          <div className="flex flex-col justify-center items-center overflow-x-hidden overflow-y-auto fixed inset-0 z-50 focus:outline-none bg-[#0000009b] opacity-100">
            <div className="justify-center items-center flex-col overflow-x-hidden overflow-y-auto fixed  z-9999 rounded-lg px-10 py-5 bg-[#08113b]">
              <div className="absolute top-0 right-0 p-5 ">
                <CloseIcon sx={[{ color: "#b7094c", transform: "scale(1.5)" },
                { transition: "transform .1s" },
                {
                  '&:hover': {
                    // color: 'white',
                    cursor: 'pointer',
                    transform: "scale(1.7)"
                  },
                }]}
                  onClick={() => {
                    setShowKeypairModal(false);
                  }}
                >
                </CloseIcon>
              </div>
              <div className='text-left font-normal my-5 mt-10 w-[50ch]'>
                <p className='text-2xl mb-4 text-center'>Generate Identity Key-Pair</p>
                <div className='border-b border-[#4a4a4a] my-4 w-full' />
                <div className='flex flex-col items-center justify-between mb-4'>

                  <button className='btn bg-[#FDA31B] hover:bg-[#622657] text-white w-full' onClick={() => { onGenerateKeypair() }}>Generate Identity Key-pair</button>

                </div>
              </div>
              {/* } */}

            </div>
          </div>
          :
          null
      }

    </div>
  );
};
