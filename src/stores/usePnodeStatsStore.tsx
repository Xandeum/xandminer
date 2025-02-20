import create, { State } from "zustand";

interface PnodeStatsStore extends State {
    isConnectionError: boolean;
    setIsConnectionError: (isConnectionError: boolean) => void;
}

const usePnodeStatsStore = create<PnodeStatsStore>((set, _get) => ({
    isConnectionError: false,
    setIsConnectionError: (isConnectionError) => {
        set({ isConnectionError });
    },
}));

export default usePnodeStatsStore;