import { FC } from 'react';
import CloseIcon from '@mui/icons-material/Close';


interface IProps {
    closeModal: () => void;
}

export const FeatureInfoModal: FC<IProps> = ({ closeModal }) => {

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
                    <h3 className='text-2xl font-bold text-white'>This feature is not available in the Constance Release.</h3>
                </div>
                <div className="text-center">
                    <button
                        className="px-8 m-2 btn bg-gradient-to-br from-[#fda31b] to-[#fda31b] hover:from-[#fdb74e] hover:to-[#fdb74e] text-black hover:text-white"
                        onClick={closeModal}
                    >
                        <span className='normal-case'>Got It</span>
                    </button>
                </div>

            </div>
        </div>
    )
}
