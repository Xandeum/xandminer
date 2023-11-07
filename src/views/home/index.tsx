// Next, React
import React, { FC } from 'react';
import Box from '@mui/material/Box';
import LinearProgress, { LinearProgressProps } from '@mui/material/LinearProgress';

export const HomeView: FC = ({ }) => {

  const [driveInfo, setDriveInfo] = React.useState<Array<any>>([]);
  const [progress, setProgress] = React.useState(300);

  React.useEffect(() => {
    setDriveInfo([
      {
        name: 'Disk 01',
        total: 500,
        used: 300,
        free: 200,
        percentage: 60
      },
      {
        name: 'Disk 02',
        total: 1024,
        used: 600,
        free: 400,
        percentage: 60
      },
      {
        name: 'Disk 03',
        total: 2048,
        used: 1600,
        free: 400,
        percentage: 60
      }
    ]);
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
    <div className="md:hero mx-auto p-4">
      <div className="md:hero-content flex flex-col">
        {/* <div className='mt-6'>
          <h1 className="text-center text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-[#fda31b] to-[#fda31b] mb-4">
            XandMiner
          </h1>
        </div>
        <h4 className="md:w-full text-2xl md:text-4xl text-center text-slate-300 my-2 mb-6 md:mb-0">
          <p></p>
          <p className='text-slate-500 text-2x1 leading-relaxed'> </p>
        </h4> */}
        <h4 className="md:w-full text-2xl md:text-4xl text-left text-slate-300 my-2 mb-6 md:mb-0">
          <p>Drive Information</p>
        </h4>
        <div className="grid grid-cols-3 gap-8 w-full">

          {
            driveInfo.map((drive, index) => {
              return (
                <div className="relative group lg:min-w-[20rem]">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-indigo-500 rounded-lg blur opacity-40 animate-tilt"></div>
                  <div className="card mx-auto bg-base-100 shadow-xl items-start flex">
                    <div className="card-body w-full">
                      {/* <div className="bg-black p-4 rounded-lg shadow-md min-w-[20rem] border-white border"> */}
                      <h2 className="text-2xl font-bold">{drive.name}</h2>
                      <div>
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
                      </div>
                      {/* </div> */}

                    </div>
                  </div>
                </div>
              )
            })
          }
        </div>
      </div>
    </div >
  );
};
