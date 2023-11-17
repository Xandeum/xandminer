import { WalletAdapterNetwork, WalletError } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import {
    SolflareWalletAdapter
} from '@solana/wallet-adapter-wallets';
import { Cluster, clusterApiUrl } from '@solana/web3.js';
import { FC, ReactNode, useCallback, useMemo } from 'react';
import { AutoConnectProvider, useAutoConnect } from './AutoConnectProvider';
import { notify } from "../utils/notifications";
import { NetworkConfigurationProvider, useNetworkConfiguration } from './NetworkConfigurationProvider';
import dynamic from "next/dynamic";
import { UrlConfigurationProvider } from './UrlProvider';

const ReactUIWalletModalProviderDynamic = dynamic(
    async () =>
        (await import("@solana/wallet-adapter-react-ui")).WalletModalProvider,
    { ssr: false }
);

const WalletContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const { autoConnect } = useAutoConnect();
    const { networkConfiguration } = useNetworkConfiguration();
    const network = networkConfiguration as WalletAdapterNetwork;
    let endpoint = useMemo(() => clusterApiUrl(network), [network]);

    if (network === WalletAdapterNetwork.Devnet) {
        // endpoint = "https://devnet.genesysgo.net/";
        // endpoint = "https://solana-devnet.g.alchemy.com/v2/-YivZ25qhF6gAEstW8OitDHzd27sOIOU";
        // endpoint = "https://api.devnet.solana.com";
        // endpoint = "https://morning-ultra-silence.solana-devnet.discover.quiknode.pro/509ee60896bf477916c101beca13fec25d2be8d5/";
        endpoint = "https://devnet.helius-rpc.com/?api-key=2aca1e9b-9f51-44a0-938b-89dc6c23e9b4";
    }
    if (network === WalletAdapterNetwork.Mainnet) {
        // endpoint = "https://red-yolo-mountain.solana-mainnet.quiknode.pro/174b836a161a7cafc760c335f3930638cf9f19ec/";
        endpoint = "https://rpc.helius.xyz/?api-key=2aca1e9b-9f51-44a0-938b-89dc6c23e9b4";
        // endpoint = "https://solana-mainnet.g.alchemy.com/v2/tEJrU0zUSsVQBDrV87jEi5hu0Bn388aW";
    }

    const wallets = useMemo(
        () => [
            new SolflareWalletAdapter(),
        ],
        [network]
    );

    const onError = useCallback(
        (error: WalletError) => {
            notify({ type: 'error', message: error.message ? `${error.name}: ${error.message}` : error.name });
            console.error(error);
        },
        []
    );

    return (
        // TODO: updates needed for updating and referencing endpoint: wallet adapter rework
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} onError={onError} autoConnect={autoConnect}>
                <ReactUIWalletModalProviderDynamic>
                    {children}
                </ReactUIWalletModalProviderDynamic>
            </WalletProvider>
        </ConnectionProvider>
    );
};

export const ContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
    return (
        <>
            <NetworkConfigurationProvider>
                <AutoConnectProvider>
                    <UrlConfigurationProvider>
                        <WalletContextProvider>{children}</WalletContextProvider>
                    </UrlConfigurationProvider>
                </AutoConnectProvider>
            </NetworkConfigurationProvider >
        </>
    );
};
