import { PublicKey } from "@solana/web3.js";
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { mplCore, } from '@metaplex-foundation/mpl-core'
import { fetchAllDigitalAssetByOwner, fetchDigitalAsset } from '@metaplex-foundation/mpl-token-metadata'
import { BOOST_FACTOR } from "CONSTS";


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
            return name?.includes("titan") ||
                name?.includes("dragon") ||
                name?.includes("coyote") ||
                name?.includes("rabbit") ||
                name?.includes("cricket") ||
                name?.includes("bitoku") ||
                name?.includes("eno") ||
                name?.includes("xeno")
                ;
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

// read nft metadata.name return boost value based on the following rules:
export const getBoostValueFromName = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes("titan")) return 11;
    if (lowerName.includes("dragon")) return 4;
    if (lowerName.includes("coyote")) return 2.5;
    if (lowerName.includes("rabbit")) return 1.5;
    if (lowerName.includes("cricket")) return 1.1;
    if (lowerName.includes("bitoku")) return 1.1;
    if (lowerName.includes("eno")) return 1.1;
    if (lowerName.includes("xeno")) return 1.1;
    return 0;
}

export const getpNodeInfoWithBoost = async (connection: string, pnodeInfoArray: Array<any>) => {
    const umi = createUmi(connection).use(
        mplCore()
    );

    return Promise.all(pnodeInfoArray.map(async (pnodeInfo) => {
        try {
            const nftSlot1 = (pnodeInfo?.nft_slot_1 as PublicKey).equals(PublicKey.default) ? null : pnodeInfo?.nft_slot_1;
            const nftSlot2 = (pnodeInfo?.nft_slot_2 as PublicKey).equals(PublicKey.default) ? null : pnodeInfo?.nft_slot_2;
            let boostValue = 1;

            if (nftSlot1) {
                const metadataNft1 = await fetchDigitalAsset(umi, nftSlot1);
                boostValue *= getBoostValueFromName(metadataNft1?.metadata?.name || "");
            }

            if (nftSlot2) {
                const metadataNft2 = await fetchDigitalAsset(umi, nftSlot2);
                boostValue *= getBoostValueFromName(metadataNft2?.metadata?.name || "");
            }
            boostValue = Number((boostValue * parseFloat(BOOST_FACTOR)).toFixed(2));

            return {
                ...pnodeInfo,
                boostValue
            }
        } catch (error) {
            console.log("error while fetching digital asset >>> ", error);
            return {
                ...pnodeInfo,
                boostValue: 0
            }
        }
    }))
}