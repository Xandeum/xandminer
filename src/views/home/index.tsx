// Next, React
import React, { FC } from 'react';
import Box from '@mui/material/Box';
import LinearProgress, { LinearProgressProps } from '@mui/material/LinearProgress';
import prettyBytes from 'pretty-bytes';
import { getDriveInfo } from '../../services/getDriveInfo';
import Slider from '@mui/material/Slider';
import StorageIcon from '@mui/icons-material/Storage';
import SpeedIcon from '@mui/icons-material/Speed';
import { TextField } from '@mui/material';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import { AddBox, IndeterminateCheckBox, Edit, CheckBox } from '@mui/icons-material';
import { useUrlConfiguration } from '../../contexts/UrlProvider';

export const HomeView: FC = ({ }) => {

  const { urlConfiguration } = useUrlConfiguration();

  const [driveInfo, setDriveInfo] = React.useState<Array<any>>([]);
  const [isFetching, setIsFetching] = React.useState<boolean>(false);
  const [dedicatingAmnt, setDedicatingAmnt] = React.useState([{ disk: 0, amount: 0, type: "GB", isEditing: false }]);
  const [inputValue, setInputValue] = React.useState([{ index: 0, amount: 0, type: "GB" }]);
  const [type, setType] = React.useState("GB");

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

  const setDedicatedInitialAmnt = (data: Array<any>) => {
    let drives = [];
    data.forEach((drive, index) => {
      drives.push({ disk: index, amount: 0, type: "GB", isEditing: false });
    });
    setDedicatingAmnt(drives);
    return;
  }

  // Function to normalise the values (MIN / MAX could be integrated)
  const normalise = (value, MIN, MAX) => ((value - MIN) * 100) / (MAX - MIN);

  //check the input value is greater than max value
  const forceToMax = (index, max, input) => {
    if (input > max) {
      dedicateWholeDrive(index, true);
    }
  }

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

  const formatAmount = (index, amount) => {
    if (dedicatingAmnt[index]?.type == "TB") {
      return (amount / 1000000000000)?.toFixed(2);
    }
    return (amount / 1000000000)?.toFixed(2);
  }

  return (
    <div className="flex flex-col items-center md:items-start w-full md:px-16 p-8">
      <h4 className="md:w-full text-4xl text-left text-slate-300 ">
        <p>Drive Information</p>
      </h4>
      <div className='border-b border-[#4a4a4a] mb-8 mt-2 w-full' />
      <div className="flex flex-row items-start justify-evenly flex-wrap gap-8 w-full px-4 md:min-h-[45vh]">
        {
          driveInfo?.length > 0 ?
            driveInfo?.map((drive, index) => {
              return (
                <div key={index} className="relative group lg:min-w-[22rem] min-w-full max-w-md">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-indigo-500 rounded-lg blur opacity-40 animate-tilt"></div>
                  <div className="card bg-base-100 shadow-xl items-start flex">
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
                      {/* <p>Total Space: {prettyBytes(drive?.size)}</p> */}
                      <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: '100%' }}>
                          {/* <span>{drive.used}GB</span> */}
                        </Box>
                        <Box sx={{ width: '100%', mr: 1 }}>
                          <LinearProgress variant="determinate" value={normalise((drive?.size - drive?.available), 0, drive?.size)} />
                        </Box>
                        <Box sx={{ width: '100%' }}>
                          {/* <span>{drive.used}GB</span> */}
                          <span>{prettyBytes(drive?.available ?? 0)} available of {prettyBytes(drive?.size || drive?.size)} </span>
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
                                  value: drive?.size,
                                  label: prettyBytes(drive?.size ?? 0),
                                },
                              ]}
                              step={5000000000}
                              disabled={drive?.size - 10000000000 <= 0}
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
                            disabled={drive?.size - 10000000000 <= 0}
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
                              console.log("dedicatingAmnt[index]?.amount + 10000000000 >>", dedicatingAmnt[index]?.amount + 10000000000)
                              console.log("drive?.size - 10000000000 >>", drive?.size - 10000000000)
                              const updatedArray = [...prevState];
                              if (dedicatingAmnt[index]?.amount + 10000000000 > drive?.size - 10000000000) return;
                              updatedArray[index] = { disk: index, amount: updatedArray[index].amount + 10000000000, type: ((prettyBytes(dedicatingAmnt[index]?.amount + 10000000000 || 0))?.split(" ")[1]), isEditing: false };
                              return updatedArray;
                            });
                          }}
                        >
                          <AddBox />
                        </IconButton>
                      </Box>
                      {
                        (drive?.size - 10000000000 <= 0) ?

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
                </div>
              )
            })
            :
            <div className="flex flex-col justify-center items-center">
              <p className="text-2xl font-bold">No Drives Found</p>
            </div>
        }
      </div>
      {/* <div className='border-b border-[#4a4a4a] mb-8 mt-2 w-full' /> */}

    </div>
  );
};
