// Next, React
import React, { FC, useEffect } from 'react';
import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import prettyBytes from 'pretty-bytes';
import { getDriveInfo } from '../../services/getDriveInfo';
import { getNetworkInfo } from '../../services/getNetworkInfo';
import { createKeypair, getKeypair } from '../../services/keypairServices'
import { getServerIP, getVersions } from '../../services/getServerInfo';
import Slider from '@mui/material/Slider';
import StorageIcon from '@mui/icons-material/Storage';
import SpeedIcon from '@mui/icons-material/Speed';
import CloseIcon from '@mui/icons-material/Close';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import PublishOutlinedIcon from '@mui/icons-material/PublishOutlined';

import RadioButtonCheckedRoundedIcon from '@mui/icons-material/RadioButtonCheckedRounded';
import Brightness1RoundedIcon from '@mui/icons-material/Brightness1Rounded';

import { CircularProgress, TextField, Tooltip } from '@mui/material';
import IconButton from '@mui/material/IconButton';
import { AddBox, IndeterminateCheckBox, Edit, CheckBox } from '@mui/icons-material';

import usePnodeStatsStore from "../../stores/usePnodeStatsStore"

import {
  Connection,
} from "@solana/web3.js";

import { useWallet } from '@solana/wallet-adapter-react';

import { notify } from 'utils/notifications';
import Loader from 'components/Loader';
import { FeatureInfoModal } from 'modals/featureInfoModal';
import { createPnode, getPnode } from 'services/pnodeServices';
import { getPnodeManagerAccountData } from 'helpers/pNodeHelpers';
import { dedicateSpace } from 'services/driveServices';
import InstallPod from 'views/install-pod';
import { VERSION_NO } from 'CONSTS';

export const HomeView: FC = ({ }) => {

  const wallet = useWallet();
  const { setIsConnectionError, isConnectionError } = usePnodeStatsStore();

  const [driveInfo, setDriveInfo] = React.useState<Array<any>>([
    {
      available: 0,
      capacity: 0,
      mount: 0,
      name: "",
      type: "",
      used: 0,
      dedicated: 0
    }
  ]);
  const [isFetching, setIsFetching] = React.useState<boolean>(false);
  const [dedicatingAmnt, setDedicatingAmnt] = React.useState([{ disk: 0, amount: 0, type: "GB", isEditing: false }]);
  const [inputValue, setInputValue] = React.useState([{ index: 0, amount: 0, type: "GB" }]);
  const [networkStats, setNetworkStats] = React.useState({
    isFetching: false,
    isError: false,
    data: {
      download: "0 Mbps",
      upload: "0 Mbps",
      ping: "0 ms",
      latency: "0 ms",
    }
  });

  const [showNetworkSpeedModal, setShowNetworkSpeedModal] = React.useState(false);
  const [isRegisterProcessing, setIsRegisterProcessing] = React.useState(false);
  const [isGenerateProcessing, setIsGenerateProcessing] = React.useState(false);
  const [showFeatureInfoModal, setShowFeatureInfoModal] = React.useState(false);

  const [isPnodeCheck, setIsPnodeCheck] = React.useState(false);
  const [isPnodeRegistered, setIsPnodeRegistered] = React.useState(false);
  const [keypairPubkey, setKeypairPubkey] = React.useState<string>(null);
  const [isKeypairGenerated, setIsKeypairGenerated] = React.useState(false);
  const [isServiceOnline, setIsServiceOnline] = React.useState(true);
  const [isDedicateProcessing, setIsDedicateProcessing] = React.useState(false);
  const [isDedicateWholeProcessing, setIsDedicateWholeProcessing] = React.useState(false);
  const [serverIP, setServerIP] = React.useState("");
  const [serverHostname, setServerHostname] = React.useState("");
  const [isServerInfoLoading, setIsServerInfoLoading] = React.useState(true);
  const [isShowInstallModal, setIsShowInstallModal] = React.useState(false);
  const [xandminderdVersion, setXandminderdVersion] = React.useState<string>("");
  const [podVersion, setPodVersion] = React.useState<string>("");

  //read the drive info from the server on page load
  React.useEffect(() => {
    setIsFetching(true);

    getDriveInfo().then((response) => {
      if (response.ok) {
        setIsConnectionError(false);
        setIsServiceOnline(true);
        setDriveInfo(response.data);
        setDedicatedInitialAmnt(response.data)
        setIsFetching(false);
        return;
      }
      setIsConnectionError(true);
      setIsServiceOnline(false);
      setIsFetching(false);

    }).catch((error) => {
      setIsFetching(false);
      setIsConnectionError(true);
      setIsServiceOnline(false);
      console.log("error while fetching drive info", error);
    })

    getServerIP().then((response) => {
      if (response?.ok) {
        setServerIP(response?.ip);
        setServerHostname(response?.hostname);
        setIsServerInfoLoading(false);
        return;
      }
    }).catch((error) => {
      setIsServerInfoLoading(false);
      console.log("error while fetching server IP", error);
    })

    //get the server versions
    getVersions().then((response) => {
      if (response?.ok) {
        setXandminderdVersion(response?.data?.xandminerd ?? '-');
        setPodVersion(response?.data?.pod ?? '-');
        setIsServerInfoLoading(false);
        return;
      }
    }).catch((error) => {
      setIsServerInfoLoading(false);
      console.log("error while fetching server versions", error);
    });

    getKeypair().then((response) => {
      if (response.ok) {
        setIsKeypairGenerated(true);
        setIsPnodeCheck(true);
        getPnode().then((data) => {
          if (data?.ok) {
            setIsPnodeRegistered(true);
            setIsPnodeCheck(false);
            return;
          }
          setIsPnodeRegistered(false);
          setIsPnodeCheck(false);
        }).catch((error) => {
          setIsPnodeRegistered(false);
          setIsPnodeCheck(false);
          console.log("erroe while reading pnode registry", error);
        });

        setKeypairPubkey(response.data);
        return;
      }
      setIsKeypairGenerated(false);
      setIsPnodeCheck(false);
    }
    ).catch((error) => {
      console.log("error while fetching keypair", error);
      setIsKeypairGenerated(false);
      setIsPnodeCheck(false);
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

  const scrollToDedicateBtn = () => {
    const element = document.getElementById('dedicateBtn');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  useEffect(() => {
    // scroll to dedicate button when dedicating amnt is greater than 10
    if (dedicatingAmnt?.some((drive) => drive?.amount > 0)) {
      scrollToDedicateBtn();
    }
  }, [dedicatingAmnt]);

  //function related to read the network stats
  const getNetworkStats = async () => {
    setNetworkStats({ ...networkStats, isFetching: true, isError: false, data: null });
    setShowNetworkSpeedModal(true);
    try {
      const response = await getNetworkInfo();
      if (response.ok) {
        setNetworkStats({ ...networkStats, isFetching: false, isError: false, data: response.data });
        return;
      }
      setNetworkStats({ ...networkStats, isFetching: false, isError: true, data: null });
    } catch (error) {
      setNetworkStats({ ...networkStats, isFetching: false, isError: true, data: null });
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

  // check space to dedicate
  const isEnoughSpace = (amount: number) => {
    const size = prettyBytes(amount);
    const splitSize = size?.split(" ");

    const value = parseInt(splitSize[0]);
    const unit = splitSize[1]?.toLowerCase();

    if (unit.includes("t")) {
      return true;
    }
    if (unit.includes("g") && value > 10) {
      return true;
    }
    return false;
  };

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

  // format to dedicate whole drive
  const onDedicateWholeDrive = async (amount: number, mount: string) => {

    try {
      setIsDedicateWholeProcessing(true);
      let space = 0;
      const size = prettyBytes(amount);
      const splitSize = size?.split(" ", size?.length - 1);

      if (splitSize[0] == '0') {
        notify({
          message: "Error",
          description: "Dedicating space cannot be 0",
          type: "error",
        });
        setIsDedicateWholeProcessing(false);
        return;
      }

      if (splitSize[1] == 'GB') {
        space = parseInt(splitSize[0]) - 10;
      } else if (splitSize[1] == 'TB') {
        space = parseInt(splitSize[0]) * 10;
      }

      const res = await dedicateSpace(space, mount);

      if (res?.ok) {
        notify({
          message: "Success",
          description: "Successfully dedicated the entire drive",
          type: "success",
        });
        setIsDedicateWholeProcessing(false);
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

        return;
      }
      notify({
        message: "Failed to dedicate the whole drive.",
        description: "Please try again",
        type: "error",
      });
      setIsDedicateWholeProcessing(false);

    } catch (error) {
      console.log("error while dedicating the space >>> ", error)
      notify({
        message: "Failed to dedicate the whole drive.",
        description: error,
        type: "error",
      });
      setIsDedicateWholeProcessing(false);
    }
  }

  const onDedicateSpace = async (index: number, mount: string) => {
    try {
      setIsDedicateProcessing(true);
      let space = 0;
      const size = prettyBytes(dedicatingAmnt[index].amount);
      const splitSize = size?.split(" ", size?.length - 1);

      if (splitSize[0] == '0') {
        notify({
          message: "Error",
          description: "Dedicating space cannot be 0",
          type: "error",
        });
        setIsDedicateProcessing(false);
        return;
      }

      if (splitSize[1] == 'GB') {
        space = parseInt(splitSize[0]);
      } else if (splitSize[1] == 'TB') {
        space = parseInt(splitSize[0]) * 10;
      }

      const res = await dedicateSpace(space, mount);

      if (res?.ok) {
        notify({
          message: "Success",
          description: `Created the file in ${res?.path}`,
          type: "success",
        });
        setIsDedicateProcessing(false);
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

        return;
      }
      notify({
        message: "Please try again",
        description: "Failed to dedicate the space.",
        type: "error",
      });
      setIsDedicateProcessing(false);

    } catch (error) {
      console.log("error while dedicating the space >>> ", error)
      notify({
        message: "Failed to dedicate the space.",
        description: error,
        type: "error",
      });
      setIsDedicateProcessing(false);
    }
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

      if (pNodeManagerInfo == null) {
        notify({
          message: "Error",
          description: "You need to purchase pNode(s) first. If you already did, please allow about one hour to propagate.",
          type: "error",
        });
        setIsRegisterProcessing(false);
        return;
      }

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

      if (res.ok) {
        notify({
          message: "Success",
          description: "pNode registered successfully",
          type: "success",
          txid: res?.data
        });
        setIsRegisterProcessing(false);
        window.location.reload()
        return;
      }

      notify({
        message: "Error",
        description: res?.error?.message,
        type: "error",
      });
      setIsRegisterProcessing(false);
      window.location.reload()

    } catch (error) {
      notify({
        message: "Error",
        description: error,
        type: "error",
      });
      setIsRegisterProcessing(false);
      window.location.reload()
    }
  }

  const onShowInstallModal = () => {
    // check if user has dedicated space
    const hasDedicatedSpace = driveInfo?.some(drive => drive?.dedicated > 0);
    if (!hasDedicatedSpace) {
      notify({
        message: "Error",
        description: "You need to dedicate space first to install the pod.",
        type: "error",
      });
      return;
    }
    setIsShowInstallModal(true);
  }

  return (
    <div className="flex mx-auto flex-col items-center md:items-start w-full px-5">

      {
        isServerInfoLoading ?
          <div className='flex flex-col md:flex-row items-center justify-center w-full mb-6 gap-3 md:gap-10'>
            <div className='flex flex-row items-center gap-2'>
              <span>IP address : </span>
              <CircularProgress size={12} className='mt-1' />
            </div>
            <div className='flex flex-row items-center gap-2'>
              <span>Hostname : </span>
              <CircularProgress size={12} className='mt-1' />
            </div>
          </div>
          :
          <div className='flex flex-col md:flex-row items-center justify-center w-full mb-6 gap-3 md:gap-10'>
            <span>IP address : <span className='text-[#fda31b]'>{serverIP}</span></span>
            <span>Hostname : <span className='text-[#fda31b]'>{serverHostname}</span></span>
            <span className="underline cursor-pointer text-white hover:text-[#fda31b]" onClick={async () => { await getNetworkStats(); setShowNetworkSpeedModal(true) }}>Test Network Speed</span>
          </div>
      }
      {/* div with one side is 1/3 of the full screen with and rest with another div */}
      <div className="w-full h-full flex md:flex-row items-start justify-between gap-4 flex-col-reverse">

        {/* left side column */}
        <div className="w-full flex flex-col items-center justify-around border border-[#4a4a4a] rounded-lg p-3">
          <h4 className="md:w-full text-2xl text-left text-slate-300 ">
            <p>Manage Drives</p>
          </h4>
          <div className='border-b border-[#4a4a4a] mb-4 mt-2 w-full' />
          {
            isFetching ?
              <div className="flex flex-col justify-center items-center w-full">
                <CircularProgress />
              </div>
              :
              <div className="w-full mx-auto grid grid-cols-1 md:grid-cols-3 2xl:grid-cols-4 justify-items-center justify-center gap-y-16 gap-x-10 mt-5 mb-5 px-5">
                {
                  driveInfo?.length > 0 ?
                    driveInfo?.map((drive, index) => {
                      return (
                        <div key={index} className="card relative flex gap-3 w-full project-card min-w-full min-h-[7rem] rounded-xl overflow-hidden items-center justify-between">

                          <div className="card-body w-full">
                            <Box sx={{ width: '100%', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 1, marginBottom: 2 }}>
                              <StorageIcon color='primary' fontSize='large' />
                              <h2 className="text-2xl font-bold ">{drive?.name || "Drive " + (index + 1)}</h2>
                            </Box>

                            <Box sx={{ width: '100%', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 1, marginBottom: 2 }}>
                              <h2 className="text-lg font-bold text-[#2196f3]">Drive Type: </h2>
                              <h2 className="text-lg font-bold ">{drive?.type == 'part' ? 'Partition' : drive?.type}</h2>
                            </Box>

                            <p className='mb-2'>Dedicated: {prettyBytes(drive?.dedicated ?? 0)}</p>

                            <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ width: '100%', mr: 1 }}>
                                <LinearProgress variant="determinate" value={normalise((drive?.capacity - drive?.available), 0, drive?.capacity)} />
                              </Box>
                              <Box sx={{ width: '100%' }}>
                                <span>{prettyBytes(drive?.available ?? 0)} available of {prettyBytes(drive?.capacity || drive?.capacity)} </span>
                              </Box>
                            </Box>
                            <div className='border-b border-[#4a4a4a] my-4 w-full' />

                            <p>Dedicate {drive?.dedicated ? "additional" : null} space</p>

                            <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', width: '100%' }}>
                              <IconButton
                                aria-label="delete"
                                color='info'
                                onClick={() => {
                                  setDedicatingAmnt(prevState => {
                                    const updatedArray = [...prevState];
                                    if (dedicatingAmnt[index]?.amount - 20_000_000_000 < 10_000_000_000) {
                                      updatedArray[index] = { disk: index, amount: 10_000_000_000, type: ((prettyBytes(10_000_000_000))?.split(" ")[1]), isEditing: false };
                                      return updatedArray;
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
                                  value={(inputValue[index]?.amount)}
                                  size="small"
                                  inputMode='decimal'
                                  onChange={(e) => {
                                    setInputValue(prevState => {
                                      const updatedArray = [...prevState];
                                      if (isNaN(parseFloat(e.target.value))) {
                                        return updatedArray;

                                      }
                                      updatedArray[index] = { index: index, amount: Math.abs(parseFloat(e.target.value)), type: dedicatingAmnt[index]?.type };
                                      return updatedArray;
                                    });
                                  }}
                                  onBlur={() => { forceToMax(index, (drive?.available - 10_000_000_000), dedicatingAmnt[index]?.amount) }}
                                  InputProps={{
                                    inputProps: { min: 1000000000 },
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
                                    disabled={drive?.capacity - 10_000_000_000 <= 0 || drive?.available == 0}
                                  />
                                </Box>
                              </Box>
                            </Box>
                            {
                              (drive?.available == 0) ?

                                <button
                                  className="w-full btn bg-[#909090] disabled:bg-[#909090] text-white disabled:text-black normal-case"
                                  disabled
                                >
                                  <span>
                                    No More Space to Dedicate
                                  </span>
                                </button>
                                :
                                <div className='w-full'>
                                  <button
                                    id='dedicateBtn'
                                    className={`w-full btn bg-[#198476] hover:bg-[#279d8d] disabled:bg-[#909090] disabled:text-black text-white normal-case ${dedicatingAmnt[index]?.amount > 0 ? 'animate-pulse' : ''}`}
                                    onClick={() => { onDedicateSpace(index, drive?.mount?.toString()) }}
                                    disabled={isDedicateProcessing || !isEnoughSpace(drive?.available) || !wallet?.connected || isConnectionError || isFetching || !isKeypairGenerated || !isPnodeRegistered}
                                  >
                                    {isDedicateProcessing
                                      ?
                                      <Loader />
                                      :
                                      <span>
                                        Dedicate and Earn
                                      </span>
                                    }
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

        <div className="w-full md:w-[25%] flex flex-col items-center justify-around border border-[#4a4a4a] rounded-lg h-full p-3">
          <div className='w-full flex flex-row items-start justify-start gap-4 border-b border-[#4a4a4a] pb-2'>
            <span className="text-2xl text-slate-300 ">
              Manage pNode
            </span>
          </div>

          {
            isServerInfoLoading ?
              <div className='text-base flex flex-col w-full px-3 pt-2 '>
                <table className='w-full mt-4'>
                  <tbody>
                    <tr className='border-none'>
                      <td className='p-1'>xandminer</td>
                      <td className='p-1'>{VERSION_NO}</td>
                    </tr>
                    <tr className='border-none'>
                      <td className='p-1'>xandminerd</td>
                      <td className='p-1 pt-2'><CircularProgress size={12} /></td>
                    </tr>
                    <tr className='border-none'>
                      <td className='p-1'>pod</td>
                      <td className='p-1 pt-2'><CircularProgress size={12} /></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              :
              <div className='text-base flex flex-col w-full px-3 pt-2'>
                <table className='w-full mt-4'>
                  <tbody>
                    <tr className='border-none'>
                      <td className='p-1 text-left'>xandminer</td>
                      <td className='p-1 text-right'>{VERSION_NO}</td>
                    </tr>
                    <tr className='border-none'>
                      <td className='p-1 text-left'>xandminerd</td>
                      <td className='p-1 text-right'>{xandminderdVersion}</td>
                    </tr>
                    <tr className='border-none'>
                      <td className='p-1 text-left'>pod</td>
                      <td className='p-1 text-right'>{podVersion}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
          }

          <div className='w-full flex flex-col items-center justify-between mt-2 gap-2'>
            <button
              className='btn bg-[#198476] hover:bg-[#279d8d] disabled:bg-[#909090] rounded-lg font-light text-white w-full normal-case disabled:hover:bg-none'
              onClick={() => { onShowInstallModal() }}
              disabled={!wallet?.connected || isConnectionError}
            >
              <div className="hidden group-disabled:block normal-case">
                Update pNode Software
              </div>
              <span className="block group-disabled:hidden" >
                Update pNode Software
              </span>
            </button>

            {
              !isKeypairGenerated ?
                <button onClick={onGenerateKeypair} disabled={!wallet?.connected || isGenerateProcessing || isConnectionError || isFetching} className='btn bg-[#198476] hover:bg-[#279d8d] disabled:bg-[#909090] rounded-lg font-light w-full disabled:hover:bg-none  text-white mt-8  normal-case'>
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
                <Tooltip title={`Click to copy ${keypairPubkey}`} placement='top'>
                  <button onClick={copyToClipboard} disabled={!wallet?.connected || isGenerateProcessing} className='btn bg-transparent hover:bg-[#622657] rounded-lg font-light w-full text-white mt-8  normal-case border-[#4a4a4a]'>
                    pNode Identity Pubkey: {keypairPubkey?.slice(0, 7)}...{keypairPubkey?.slice(keypairPubkey?.length - 7, keypairPubkey?.length)}
                  </button>
                </Tooltip>
            }

            {
              isKeypairGenerated && !isPnodeRegistered ?
                <button onClick={onRegisterPNode}
                  disabled={!wallet?.connected || isRegisterProcessing || isConnectionError || isFetching || isPnodeCheck}
                  className='btn bg-[#198476] hover:bg-[#279d8d] disabled:bg-[#909090] rounded-lg font-light w-full disabled:hover:bg-none text-white normal-case'>

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
                    networkStats?.data?.download == "0Mbps" ?
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
                  <div className='text-center font-normal my-5 w-[50ch]'>
                    <p className='text-2xl mb-7 text-center'>Network Speed Status</p>

                    <CircularProgress />
                  </div>
                  :
                  networkStats?.isError ?
                    <div className='text-center font-normal my-5 mt-10 w-[50ch]'>
                      <p className='text-2xl mb-4 '>Something went wrong. Please try again...</p>
                      <button
                        className="px-5 py-2 btn btn-sm bg-gradient-to-br from-[#fda31b] to-[#fda31b] hover:from-[#fdb74e] hover:to-[#fdb74e] text-white hover:text-black"
                        onClick={async () => { await getNetworkStats() }}
                      >
                        Retry
                      </button>
                    </div>
                    :
                    <div className='text-left font-normal my-5 w-[50ch]'>
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
                        </div>
                        <div className="flex flex-col  gap-4">
                          <p className='text-xl'>
                            :
                          </p>
                          <p className='text-xl'>
                            :
                          </p>
                        </div>
                        <div className="flex flex-col  gap-4">
                          <p className='text-xl'>
                            {networkStats?.data?.download}
                          </p>
                          <p className='text-xl'>
                            {networkStats?.data?.upload}
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

      {/* pod install output modal */}
      {
        isShowInstallModal
          ?
          <div className="flex flex-col justify-center items-center overflow-x-hidden overflow-y-auto fixed inset-0 z-50 focus:outline-none bg-[#0000009b] opacity-100">
            <div className="justify-center items-center flex-col overflow-x-hidden overflow-y-auto fixed z-9999 rounded-lg px-10 py-5 bg-[#08113b]">
              <h2 className="absolute top-0 left-0 p-5 text-xl">Update pNode Software</h2>
              <InstallPod onClose={() => { setIsShowInstallModal(!isShowInstallModal) }} />
            </div>
          </div>
          :
          null
      }
    </div>
  );
};
