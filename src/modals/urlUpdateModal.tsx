import { FC, useEffect, useState } from 'react';
import CloseIcon from '@mui/icons-material/Close';


import { notify } from "../utils/notifications";
import { TextField } from '@mui/material';
import { useUrlConfiguration } from '../contexts/UrlProvider';


interface IProps {
    closeModal: () => void;
    openModal: () => void;
}

export const UrlUpdateModal: FC<IProps> = ({ closeModal, openModal }) => {
    const { urlConfiguration, setUrlConfiguration } = useUrlConfiguration();
    const [inputValue, setInputValue] = useState<string>('');

    useEffect(() => {
        if (urlConfiguration) {
            setInputValue(urlConfiguration)
        }
    }, [urlConfiguration])

    const handleUpdateClick = () => {

        if (!inputValue) {
            notify({ type: 'warning', message: 'URL cannot be empty!' });
            return;
        }
        setUrlConfiguration(inputValue)
        // Optionally, you can notify the user or perform any other action
        notify({ type: 'success', message: 'URL updated successfully' });

        // Close the modal or perform any other necessary actions
        closeModal();
    };

    return (
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
                    }]} onClick={closeModal}>
                    </CloseIcon>
                </div>
                <div className='text-center font-normal my-5 mt-10 w-[50ch]'>
                    <TextField
                        className='w-full '
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                '& fieldset': {
                                    borderBottom: '1px solid #2196f3',  // Customize the border style
                                },
                            },
                            input: {
                                color: 'white',
                                textAlign: 'right',
                                width: '100%',
                            },
                        }}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}

                    />
                </div>
                <div className="text-center">
                    <button
                        className="px-8 m-2 btn bg-gradient-to-br from-[#fda31b] to-[#fda31b] hover:from-[#fdb74e] hover:to-[#fdb74e] text-black hover:text-white"
                        onClick={handleUpdateClick}
                    >
                        <span className='normal-case'>Update the URL</span>
                    </button>
                </div>

            </div>
        </div>
    )
}
