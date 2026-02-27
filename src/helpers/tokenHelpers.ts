import { PublicKey } from "@solana/web3.js";
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { mplCore, } from '@metaplex-foundation/mpl-core'
import { fetchAllDigitalAssetByOwner } from '@metaplex-foundation/mpl-token-metadata'


export const readMetaplexMetadata = async (connection: string, owner: string) => {

    const umi = createUmi(connection).use(
        mplCore()
    );
    try {

        const ownerPubKey = new PublicKey(owner);
        //@ts-ignore
        const digitalAssets = await fetchAllDigitalAssetByOwner(umi, ownerPubKey);

        if (!digitalAssets || digitalAssets.length === 0) {
            return [];
        }

        // check if digitalAssets?.metadata?.name is includes one of the following strings: titan, dragon, coyote, rabbit, cricket
        const filteredAssets = digitalAssets?.filter(asset => {
            const name = asset?.metadata?.name?.toLowerCase();
            return name?.includes("titan") || name?.includes("dragon") || name?.includes("coyote") || name?.includes("rabbit") || name?.includes("cricket");
        });

        // return filteredAssets mapped to an array of objects with the following properties: address, mint, name, logoURI
        return filteredAssets.map(asset => ({
            address: asset?.metadata?.mint,
            mint: asset?.metadata?.mint,
            name: asset?.metadata?.name,
            symbol: asset?.metadata?.symbol,
        }));

    } catch (error) {
        console.log("error while reading metaplex token metadata >>> ", error)
    }

}