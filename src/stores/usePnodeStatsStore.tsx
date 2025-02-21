import create, { State } from "zustand";

interface PnodeStatsStore extends State {
    isConnectionError: boolean;
    isPnodeRegisterError: boolean;
    setIsConnectionError: (isConnectionError: boolean) => void;
    setIsPnodeRegisterError: (isPnodeRegisterError: boolean) => void;
}

const usePnodeStatsStore = create<PnodeStatsStore>((set, _get) => ({
    isConnectionError: false,
    isPnodeRegisterError: false,
    setIsConnectionError: (isConnectionError) => {
        set({ isConnectionError });
    },
    setIsPnodeRegisterError: (isPnodeRegisterError) => {
        set({ isPnodeRegisterError });
    },
}));

export default usePnodeStatsStore;