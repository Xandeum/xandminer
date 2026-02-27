import { useLocalStorage } from '@solana/wallet-adapter-react';
import { createContext, FC, ReactNode, useContext } from 'react';


export interface RpcConfigurationState {
    rpcEndpoint: string;
    setRpcEndpoint(rpcEndpoint: string): void;
}

export const RpcConfigurationContext = createContext<RpcConfigurationState>({} as RpcConfigurationState);

export function useRpcConfiguration(): RpcConfigurationState {
    return useContext(RpcConfigurationContext);
}

export const UrlConfigurationProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const [rpcEndpoint, setRpcEndpoint] = useLocalStorage("rpcEndpoint", "");

    return (
        <RpcConfigurationContext.Provider value={{ rpcEndpoint, setRpcEndpoint }}>{children}</RpcConfigurationContext.Provider>
    );
};