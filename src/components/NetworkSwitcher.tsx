import { FC } from 'react';
import dynamic from 'next/dynamic';
import { useNetworkConfiguration } from '../contexts/NetworkConfigurationProvider';
import React from 'react';

const NetworkSwitcher: FC = () => {
  const { networkConfiguration, setNetworkConfiguration } = useNetworkConfiguration();

  return (
    <label className="cursor-pointer label">
      <a>Network</a>
      <select
        value={networkConfiguration}
        onChange={(e) => setNetworkConfiguration(e.target.value)}
        className="select max-w-xs"
      >
        <option value="devnet">devnet</option>
        <option value="mainnet-beta">mainnet-beta</option>
        <option value="testnet">testnet</option>
      </select>
    </label>
  );
};

export default dynamic(() => Promise.resolve(NetworkSwitcher), {
  ssr: false
})