// Next, React
import React, { FC } from 'react';
import Box from '@mui/material/Box';
import LinearProgress, { LinearProgressProps } from '@mui/material/LinearProgress';
import { getDriveInfo } from '../../services/getDriveInfo';

export const HomeView: FC = ({ }) => {

  const [driveInfo, setDriveInfo] = React.useState<Array<any>>([]);
  const [isFetching, setIsFetching] = React.useState<boolean>(false);
  const [progress, setProgress] = React.useState(300);

  React.useEffect(() => {
    setIsFetching(true);
    getDriveInfo().then((response) => {
      if (response.ok) {
        setDriveInfo(response.data);
        setIsFetching(false);
      }
    }).catch((error) => {
      setIsFetching(false);
      console.log("error while fetching drive info", error);
    })
  }, []);

  // Function to normalise the values (MIN / MAX could be integrated)
  const normalise = (value, MIN, MAX) => ((value - MIN) * 100) / (MAX - MIN);

  function LinearProgressWithLabel(props: LinearProgressProps & { value: number }) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Box sx={{ width: '100%', mr: 1 }}>
          <LinearProgress variant="determinate" {...props} />
        </Box>
        <Box sx={{ minWidth: 35 }}>

          <span>{props.value}GB</span>
        </Box>
      </Box>
    );
  }

  return (
    <div className="flex flex-col items-center md:items-start w-full md:px-16 p-8">
      <h4 className="md:w-full text-4xl text-left text-slate-300 ">
        <p>Drive Information</p>
      </h4>
      <div className='border-b border-[#4a4a4a] mb-8 mt-2 w-full' />
      <div className="flex flex-row items-center justify-start flex-wrap gap-8 w-full px-4">
        {
          driveInfo.length > 0 ?
            driveInfo.map((drive, index) => {
              return (
                <div key={index} className="relative group lg:min-w-[20rem] min-w-full">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-indigo-500 rounded-lg blur opacity-40 animate-tilt"></div>
                  <div className="card mx-auto bg-base-100 shadow-xl items-start flex">
                    <div className="card-body w-full">
                      {/* <div className="bg-black p-4 rounded-lg shadow-md min-w-[20rem] border-white border"> */}
                      <h2 className="text-2xl font-bold mb-4">Drive {index + 1}</h2>
                      <p>Total Space: {drive.total} GB</p>
                      <Box sx={{ width: '100%' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Box sx={{ width: '100%', mr: 1 }}>
                            <LinearProgress variant="determinate" value={normalise(drive.used, 0, drive.total)} />
                          </Box>
                          <Box sx={{ minWidth: 35 }}>
                            <span>{drive.used}GB</span>
                          </Box>
                        </Box>
                      </Box>
                      {/* </div> */}

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
    </div>
  );
};
