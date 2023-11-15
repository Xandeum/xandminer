// Next, React
import React, { FC } from 'react';
import Box from '@mui/material/Box';
import LinearProgress, { LinearProgressProps } from '@mui/material/LinearProgress';
import prettyBytes from 'pretty-bytes';
import { getDriveInfo } from '../../services/getDriveInfo';
import Slider from '@mui/material/Slider';
import StorageIcon from '@mui/icons-material/Storage';
import { TextField } from '@mui/material';
import IconButton from '@mui/material/IconButton';
import { AddBox, IndeterminateCheckBox } from '@mui/icons-material';

export const HomeView: FC = ({ }) => {

  const [driveInfo, setDriveInfo] = React.useState<Array<any>>([]);
  const [isFetching, setIsFetching] = React.useState<boolean>(false);
  const [dedicatingAmnt, setDedicatingAmnt] = React.useState([{ disk: 0, amount: 0 }]);

  React.useEffect(() => {
    setIsFetching(true);
    getDriveInfo().then((response) => {
      if (response.ok) {
        setDriveInfo(response.data);
        setDedicatedInitialAmnt(response.data)
        setIsFetching(false);
      }
    }).catch((error) => {
      setIsFetching(false);
      console.log("error while fetching drive info", error);
    })
  }, []);

  const setDedicatedInitialAmnt = (data: Array<any>) => {
    let drives = [];
    data.forEach((drive, index) => {
      drives.push({ disk: index, amount: 0 });
    });
    setDedicatingAmnt(drives);
    return;
  }

  // Function to normalise the values (MIN / MAX could be integrated)
  const normalise = (value, MIN, MAX) => ((value - MIN) * 100) / (MAX - MIN);

  //check the input value is greater than max value
  const forceToMax = (index, max, input) => {
    if (input > max) {
      setDedicatingAmnt(prevState => {
        const updatedArray = [...prevState];
        updatedArray[index] = { disk: index, amount: max };
        return updatedArray;
      });
    }
  }

  return (
    <div className="flex flex-col items-center md:items-start w-full md:px-16 p-8">
      <h4 className="md:w-full text-4xl text-left text-slate-300 ">
        <p>Drive Information</p>
      </h4>
      <div className='border-b border-[#4a4a4a] mb-8 mt-2 w-full' />
      <div className="flex flex-row items-start justify-evenly flex-wrap gap-8 w-full px-4 md:min-h-[45vh]">
        {
          driveInfo.length > 0 ?
            driveInfo.map((drive, index) => {
              return (
                <div key={index} className="relative group lg:min-w-[22rem] min-w-full">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-indigo-500 rounded-lg blur opacity-40 animate-tilt"></div>
                  <div className="card bg-base-100 shadow-xl items-start flex">
                    <div className="card-body w-full">
                      {/* <div className="bg-black p-4 rounded-lg shadow-md min-w-[20rem] border-white border"> */}
                      {/* <h2 className="text-2xl font-bold mb-4">Drive {index + 1}</h2> */}
                      <Box sx={{ width: '100%', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 4 }}>
                        <StorageIcon color='primary' fontSize='large' />
                        <h2 className="text-2xl font-bold ">{drive?.name}</h2>
                      </Box>
                      {/* <p>Total Space: {prettyBytes(drive.capacity)}</p> */}
                      <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: '100%' }}>
                          {/* <span>{drive.used}GB</span> */}
                        </Box>
                        <Box sx={{ width: '100%', mr: 1 }}>
                          <LinearProgress variant="determinate" value={normalise(drive.used, 0, drive.capacity)} />
                        </Box>
                        <Box sx={{ width: '100%' }}>
                          {/* <span>{drive.used}GB</span> */}
                          <span>{prettyBytes(drive?.free)} available of {prettyBytes(drive?.capacity)} </span>
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
                              min={1000000000}
                              max={drive?.capacity - 10000000000}
                              aria-label="Small"
                              valueLabelDisplay="off"
                              value={dedicatingAmnt[index]?.amount}
                              onChange={(event, value) => {
                                setDedicatingAmnt(prevState => {
                                  const updatedArray = [...prevState];
                                  updatedArray[index] = { disk: index, amount: value as number };
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
                                  label: prettyBytes(drive?.capacity),
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
                              updatedArray[index] = { disk: index, amount: updatedArray[index].amount - 10000000000 };
                              return updatedArray;
                            });
                          }}
                          disabled={dedicatingAmnt[index]?.amount - 10000000000 <= 0}
                        >
                          <IndeterminateCheckBox />
                        </IconButton>
                        <TextField
                          id="outlined-basic"
                          variant='outlined'
                          value={(dedicatingAmnt[index]?.amount / 1000000000).toFixed(0)}
                          size="small"
                          onChange={(e) => {
                            setDedicatingAmnt(prevState => {
                              const updatedArray = [...prevState];
                              updatedArray[index] = { disk: index, amount: Math.abs(isNaN(parseFloat(e.target.value)) ? 0 : parseFloat(e.target.value) * 1000000000) };
                              return updatedArray;
                            });
                          }}
                          onBlur={() => { forceToMax(index, (drive?.capacity - 10000000000), dedicatingAmnt[index]?.amount) }}
                          InputProps={{
                            inputProps: { min: 1000000000 },
                            endAdornment: (
                              (drive?.capacity - 10000000000 >= 0) ?
                                <div className='flex flex-row items-center ml-1 text-white'>
                                  <span className='pb-1'>{(prettyBytes(dedicatingAmnt[index]?.amount || 0))?.split(" ")[1] || null}</span>
                                </div>
                                :
                                null

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
                        <IconButton
                          aria-label="delete"
                          color='info'
                          disabled={dedicatingAmnt[index]?.amount + 10000000000 > drive?.capacity - 10000000000}
                          onClick={() => {
                            setDedicatingAmnt(prevState => {
                              const updatedArray = [...prevState];
                              if (dedicatingAmnt[index]?.amount + 10000000000 > drive?.capacity - 10000000000) return;
                              updatedArray[index] = { disk: index, amount: updatedArray[index].amount + 10000000000 };
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
                              unavailable
                            </span>
                          </button>
                          :
                          <button
                            className="w-full btn bg-gradient-to-br from-[#fda31b] to-[#622657] hover:from-[#622657] hover:to-[#fda31b] text-white hover:animate-pulse"
                            onClick={undefined}
                          >
                            <span>
                              Dedicate and Earn
                            </span>
                          </button>

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
