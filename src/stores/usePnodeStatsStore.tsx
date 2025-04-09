import create, { State } from "zustand";

interface PnodeStatsStore extends State {
    isConnectionError: boolean;
    setIsConnectionError: (isConnectionError: boolean) => void;
}

const usePnodeStatsStore = create<PnodeStatsStore>((set, _get) => ({
    isConnectionError: true,
    setIsConnectionError: (isConnectionError) => {
        set({ isConnectionError });
    },
}));

export default usePnodeStatsStore;