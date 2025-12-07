import { useLocalStorage } from '@solana/wallet-adapter-react';
import { createContext, FC, ReactNode, useContext } from 'react';


export interface UrlConfigurationState {
    urlConfiguration: string;
    setUrlConfiguration(urlConfiguration: string): void;
}

export const UrlConfigurationContext = createContext<UrlConfigurationState>({} as UrlConfigurationState);

export function useUrlConfiguration(): UrlConfigurationState {
    return useContext(UrlConfigurationContext);
}

export const UrlConfigurationProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const [urlConfiguration, setUrlConfiguration] = useLocalStorage("url", "https://nixagent.xandeum.com/drives");

    return (
        <UrlConfigurationContext.Provider value={{ urlConfiguration, setUrlConfiguration }}>{children}</UrlConfigurationContext.Provider>
    );
};