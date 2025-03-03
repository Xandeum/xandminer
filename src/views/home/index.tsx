// Next, React
import React, { FC, useEffect } from 'react';
import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import prettyBytes from 'pretty-bytes';
import { getDriveInfo } from '../../services/getDriveInfo';
import { getNetworkInfo } from '../../services/getNetworkInfo';
import { createKeypair, getKeypair } from '../../services/keypairServices'
import Slider from '@mui/material/Slider';
import StorageIcon from '@mui/icons-material/Storage';
import SpeedIcon from '@mui/icons-material/Speed';
import CloseIcon from '@mui/icons-material/Close';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import PublishOutlinedIcon from '@mui/icons-material/PublishOutlined';

import RadioButtonCheckedRoundedIcon from '@mui/icons-material/RadioButtonCheckedRounded';
import Brightness1RoundedIcon from '@mui/icons-material/Brightness1Rounded';

import { CircularProgress, TextField, Tooltip } from '@mui/material';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import { AddBox, IndeterminateCheckBox, Edit, CheckBox } from '@mui/icons-material';

import usePnodeStatsStore from "../../stores/usePnodeStatsStore"

import {
  Connection,
  Transaction,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";

import { useWallet, useConnection } from '@solana/wallet-adapter-react';

import { notify } from 'utils/notifications';
import Loader from 'components/Loader';
import { FeatureInfoModal } from 'modals/featureInfoModal';
import { createPnode, getPnode } from 'services/pnodeServices';
import { getPnodeManagerAccountData } from 'helpers/pNodeHelpers';

export const HomeView: FC = ({ }) => {

  const wallet = useWallet();
  const { connection } = useConnection();
  const { setIsConnectionError, isConnectionError } = usePnodeStatsStore();

  const [driveInfo, setDriveInfo] = React.useState<Array<any>>([
    {
      available: 0,
      capacity: 0,
      mount: 0,
      name: "",
      type: "",
      used: 0
    }
  ]);
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
  const [isRegisterProcessing, setIsRegisterProcessing] = React.useState(false);
  const [isGenerateProcessing, setIsGenerateProcessing] = React.useState(false);
  const [showFeatureInfoModal, setShowFeatureInfoModal] = React.useState(false);

  const [isPnodeRegistered, setIsPnodeRegistered] = React.useState(false);
  const [keypairPubkey, setKeypairPubkey] = React.useState<string>(null);
  const [isKeypairGenerated, setIsKeypairGenerated] = React.useState(false);
  const [isServiceOnline, setIsServiceOnline] = React.useState(true);

  //read the drive info from the server on page load
  React.useEffect(() => {
    setIsFetching(true);
    getDriveInfo().then((response) => {
      if (response.ok) {
        setIsConnectionError(false);
        setDriveInfo(response.data);
        setDedicatedInitialAmnt(response.data)
        setIsFetching(false);
        return;
      }
      setIsConnectionError(true);
      setIsFetching(false);

    }).catch((error) => {
      setIsFetching(false);
      setIsConnectionError(true);
      console.log("error while fetching drive info", error);
    })

    getKeypair().then((response) => {
      if (response.ok) {
        setIsKeypairGenerated(true);

        getPnode().then((data) => {
          if (data?.ok) {
            setIsPnodeRegistered(true);
            console.log("pnode info >>> ", data);
            return;
          }
          setIsPnodeRegistered(false);

        }).catch((error) => {
          setIsPnodeRegistered(false);
          console.log("erroe while reading pnode registry", error);
        });

        setKeypairPubkey(response.data);
        return;
      }
      setIsKeypairGenerated(false);
    }
    ).catch((error) => {
      console.log("error while fetching keypair", error);
    }
    );

  }, []);

  //set Service status also on isConnectionError state
  useEffect(() => {
    isConnectionError ? setIsServiceOnline(false) : setIsServiceOnline(true);
  }, [isConnectionError])

  //function to set the initial values for dedicating amnt
  const setDedicatedInitialAmnt = (data: Array<any>) => {
    let drives = [];
    data.forEach((_drive, index) => {
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
      const response = await getNetworkInfo();
      if (response.ok) {
        setNetworkStats({ isFetching: false, isError: false, data: response.data });
        return;
      }
    } catch (error) {
      setNetworkStats({ isFetching: false, isError: true, data: null });
    }
  }

  //copy to clipboard method 
  function copyToClipboard() {
    navigator?.clipboard?.writeText(keypairPubkey).then(() => {
      notify({ type: 'success', message: 'Public key copied to the clipboard!' });

    }).catch((error) => {
      notify({ type: 'error', message: `Oops! Error occurred.` });

    });
  };

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
    let amountToDedicate = inputValue[index]?.amount * (dedicatingAmnt[index]?.type == "GB" ? 1000000000 : 10_000_000_000);

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
      amountToDedicate = inputValue[index]?.amount * 10_000_000_00000;
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
      dedicatingAmnt = driveInfo[index]?.available - 10_000_000_0000;
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
      return (amount / 10_000_000_00000)?.toFixed(2);
    }
    return (amount / 1000000000)?.toFixed(2);
  }

  //generate the keypair
  const onGenerateKeypair = async () => {
    setIsGenerateProcessing(true);
    try {
      const response = await createKeypair();

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
        const res = await getKeypair();
        if (res.ok) {
          setIsKeypairGenerated(true);
          setKeypairPubkey(res.data);
        }
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

  //register the pNode
  const onRegisterPNode = async () => {
    setIsRegisterProcessing(true);
    try {

      const connection = new Connection("https://api.devnet.xandeum.com:8899", 'confirmed');

      // check number of pNodes bought and registered
      const pNodeManagerInfo = await getPnodeManagerAccountData(connection, wallet?.publicKey?.toString());
      // const pNodeManagerInfo = await getPnodeManagerAccountData(connection, "9eVnceJcJFmdPiyNgFx1gQcqkLego5J4Pkmgoog4BDoU");
      // const pNodeManagerInfo = await getPnodeManagerAccountData(connection, "7dnikxxkGHcUPPCpnaZrvoCSD8RoHFhFse4dzmo6sVam");

      if (pNodeManagerInfo == null) {
        notify({
          message: "Error",
          description: "You need to purchase pNode(s) first in order to register",
          type: "error",
        });
        setIsRegisterProcessing(false);
        return;
      }

      // if (wallet?.publicKey?.toString() !== pNodeManagerInfo?.owner?.toString()) {
      //   notify({
      //     message: "Error",
      //     description: "Please connect the wallet which used to buy pNodes",
      //     type: "error",
      //   });
      //   return;
      // }

      if (pNodeManagerInfo?.registered_pnodes >= pNodeManagerInfo.purchased_pnodes) {
        notify({
          message: "Error",
          description: "You have already reached your maximum registration limit",
          type: "error",
        });
        setIsRegisterProcessing(false);
        return;
      }

      const res = await createPnode(wallet?.publicKey?.toString());
      console.log("res >>> ", res);

      if (res.ok) {
        notify({
          message: "Success",
          description: "pNode registered successfully",
          type: "success",
          txid: res?.data
        });
        setIsRegisterProcessing(false);
        return;
      }

      notify({
        message: "Error",
        description: res?.error?.message,
        type: "error",
      });
      setIsRegisterProcessing(false);

    } catch (error) {
      console.log("error >>> ", error);
      notify({
        message: "Error",
        description: error,
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
        <div className="w-full flex flex-col items-center justify-around border border-[#4a4a4a] rounded-lg p-3">
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
              <div className="w-full mx-auto grid grid-cols-1 md:grid-cols-3 2xl:grid-cols-4 justify-items-center justify-center gap-y-16 gap-x-10 mt-14 mb-5 px-5">
                {
                  driveInfo?.length > 0 ?
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
                                    min={10_000_000_000}
                                    max={drive?.available - 10_000_000_000}
                                    aria-label="Small"
                                    valueLabelDisplay="off"
                                    value={dedicatingAmnt[index] == undefined ? 0 : dedicatingAmnt[index]?.amount}
                                    onChange={(event, value) => {
                                      setDedicatingAmnt(prevState => {
                                        const updatedArray = [...prevState];
                                        updatedArray[index] = { disk: index, amount: value as number, type: ((prettyBytes(value as number || 0))?.split(" ")[1]), isEditing: false };
                                        return updatedArray;
                                      });
                                    }}
                                    marks={[
                                      {
                                        value: 1_000_000_000,
                                        label: '0',
                                      },
                                      {
                                        value: drive?.capacity,
                                        label: prettyBytes(drive?.capacity ?? 0),
                                      },
                                    ]}
                                    step={1_000_000_000}
                                    disabled={drive?.capacity - 10_000_000_000 <= 0}
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
                                    if (dedicatingAmnt[index]?.amount - 10_000_000_000 > drive?.available + 10_000_000_000) {
                                      return;
                                    };
                                    updatedArray[index] = { disk: index, amount: updatedArray[index].amount - 10_000_000_000, type: ((prettyBytes(dedicatingAmnt[index]?.amount - 10_000_000_000 || 0))?.split(" ")[1]), isEditing: false };
                                    return updatedArray;
                                  });
                                }}
                                disabled={dedicatingAmnt[index]?.amount - 10_000_000_000 <= 0}
                              >
                                <IndeterminateCheckBox />
                              </IconButton>
                              {dedicatingAmnt[index]?.isEditing
                                ?
                                <TextField
                                  id="outlined-basic"
                                  variant='outlined'
                                  // value={(dedicatingAmnt[index]?.amount / (dedicatingAmnt[index]?.type == "TB" ? 10_000_000_00000 : 1000000000)).toFixed(2)}
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
                                  onBlur={() => { forceToMax(index, (drive?.available - 10_000_000_000), dedicatingAmnt[index]?.amount) }}
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
                                          {
                                            parseInt(prettyBytes(drive?.capacity)) > 1000 ?
                                              <MenuItem value="TB">TB</MenuItem>
                                              :
                                              null
                                          }
                                        </Select>
                                        <IconButton
                                          aria-label="delete"
                                          color='info'
                                          // disabled={dedicatingAmnt[index]?.amount + 10_000_000_000 > drive?.available - 10_000_000_000}
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
                                  // disabled={drive?.capacity - 10_000_000_000 <= 0}
                                  disabled
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
                                    disabled
                                  >
                                    <Edit />
                                  </IconButton>

                                </div>
                              }

                              <IconButton
                                aria-label="delete"
                                color='info'
                                disabled={dedicatingAmnt[index]?.amount + 11_000_000_000 > drive?.available}
                                onClick={() => {
                                  setDedicatingAmnt(prevState => {
                                    const updatedArray = [...prevState];
                                    if (dedicatingAmnt[index]?.amount + 20_000_000_000 < drive?.available) {
                                      updatedArray[index] = { disk: index, amount: updatedArray[index].amount + 10_000_000_000, type: ((prettyBytes(dedicatingAmnt[index]?.amount + 10_000_000_000 || 0))?.split(" ")[1]), isEditing: false };
                                      return updatedArray;
                                    }
                                    updatedArray[index] = { disk: index, amount: drive?.available - 10_000_000_000, type: ((prettyBytes(drive?.available - 10_000_000_000 || 0))?.split(" ")[1]), isEditing: false }
                                    return updatedArray;
                                  });
                                }}
                              >
                                <AddBox />
                              </IconButton>
                            </Box>
                            {
                              (drive?.capacity - 10_000_000_000 <= 0) ?

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
                                        className="w-full btn bg-[#909090] hover:[#909090] text-white hover:text-white mb-4"
                                        onClick={() => { setShowFeatureInfoModal(true) }}
                                      >
                                        <span>
                                          Test Network Speed
                                        </span>
                                      </button>
                                      :
                                      null
                                  }
                                  <button
                                    className="w-full btn bg-[#909090] hover:[#909090] text-white  mb-4"
                                    onClick={() => { setShowFeatureInfoModal(true) }}
                                  >
                                    <span>
                                      Dedicate whole Drive for Rewards Boost
                                    </span>
                                  </button>
                                  <button
                                    className="w-full btn bg-[#909090] hover:[#909090] text-white "
                                    onClick={() => { setShowFeatureInfoModal(true) }}
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
                    isConnectionError ?
                      <div className="flex flex-col justify-center items-center">
                        <p className="text-2xl font-bold">XandMiner Deamon is offline</p>
                      </div>
                      :
                      <div className="flex flex-col justify-center items-center">
                        <p className="text-2xl font-bold">No Drives Found</p>
                      </div>
                }
              </div>
          }
        </div>


        {/* right side column */}

        <div className="w-full md:w-[20%] flex flex-col items-center justify-around border border-[#4a4a4a] rounded-lg h-full p-3">
          <div className='w-full flex flex-row items-center justify-around gap-4 border-b border-[#4a4a4a] pb-2'>
            {
              isServiceOnline ?
                <div className='flex flex-row items-center gap-3'>
                  <Brightness1RoundedIcon color='success' className='animate-pulse' />
                  <span className="text-3xl text-slate-300 ">
                    Daemon Online
                  </span>
                </div>
                :
                <div className='flex flex-row items-center gap-3'>
                  <RadioButtonCheckedRoundedIcon color='error' className='animate-pulse' />
                  <span className="text-3xl text-slate-300 ">
                    Daemon Offline
                  </span>
                </div>
            }
          </div>

          <div className='w-full flex flex-col items-center justify-between mt-8 gap-8 pt-5'>
            {/* {
              isServiceOnline ?
                <button className='btn bg-[#b7094c] text-white w-full normal-case' onClick={() => { setIsServiceOnline(false) }}>Stop the service</button>
                :
                <button className='btn bg-[#129f8c] text-white w-full normal-case' onClick={() => { setIsServiceOnline(true) }}>Start the service</button>
            } */}

            {
              !isKeypairGenerated ?
                <button onClick={onGenerateKeypair} disabled={!wallet?.connected || isGenerateProcessing || isConnectionError || isFetching} className='btn bg-[#FDA31B] hover:bg-[#622657] rounded-lg font-light w-full disabled:hover:bg-none disabled:bg-[#909090] text-white mt-8  normal-case'>
                  {
                    isGenerateProcessing ?
                      <span className='flex flex-row items-center gap-3'>
                        <Loader />
                        <span className="block group-disabled:hidden" >
                          Generate Identity Key-pair
                        </span>
                      </span>
                      :
                      <span className="block group-disabled:hidden" >
                        Generate Identity Key-pair
                      </span>
                  }

                  <div className="hidden group-disabled:block normal-case">
                    Generate Identity Key-pair
                  </div>
                </button>
                :
                <Tooltip title={`${keypairPubkey}`} placement='top'>
                  <button onClick={copyToClipboard} disabled={!wallet?.connected || isGenerateProcessing} className='btn bg-transparent hover:bg-[#622657] rounded-lg font-light w-full text-white mt-8  normal-case border-[#4a4a4a]'>
                    pNode Identity Pubkey: {keypairPubkey?.slice(0, 7)}...{keypairPubkey?.slice(keypairPubkey?.length - 7, keypairPubkey?.length)}
                  </button>
                </Tooltip>
            }

            {
              isPnodeRegistered ?
                <button onClick={() => { }} disabled className='btn bg-[#129f8c] hover:bg-[#198476] rounded-lg font-light w-full disabled:hover:bg-none disabled:bg-[#198476] disabled:text-white mt-8  normal-case'>
                  pNode has registered.
                </button>
                :
                null
            }

            {
              isKeypairGenerated && !isPnodeRegistered ?
                <button onClick={onRegisterPNode} disabled={!wallet?.connected || isRegisterProcessing || isConnectionError || isFetching} className='btn bg-[#129f8c] hover:bg-[#622657] rounded-lg font-light w-full disabled:hover:bg-none disabled:bg-[#909090] text-white mt-8  normal-case'>

                  {
                    isRegisterProcessing ?
                      <span className='flex flex-row items-center gap-3'>
                        <Loader />
                        <span className="block group-disabled:hidden" >
                          Register pNode
                        </span>
                      </span>
                      :
                      <span className="block group-disabled:hidden" >
                        Register pNode
                      </span>
                  }

                  <div className="hidden group-disabled:block normal-case">
                    Register pNode
                  </div>
                </button>
                :
                null
            }



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

      {/* feature info modal */}
      {
        showFeatureInfoModal ?
          <FeatureInfoModal closeModal={() => { setShowFeatureInfoModal(!showFeatureInfoModal) }} />
          :
          null
      }

    </div>
  );
};
