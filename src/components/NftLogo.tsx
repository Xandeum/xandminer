import Image from "next/image";

import XandeumLogo from "../assets/XandeumLogoStandard.png";

interface NftLogoProps {
    nft: string;
    classNames?: string;
}

export const NftLogo = ({ nft, classNames }: NftLogoProps) => {
    return (
        <>
            {
                nft == "none" ?

                    <Image
                        src={XandeumLogo}
                        alt="Logo"
                        width={100}
                        height={100}
                        priority
                        className={classNames}
                    />
                    :
                    <video
                        src={
                            nft.includes("dragon") ? "/nfts/Dragon.webm" :
                                nft.includes("coyote") ? "/nfts/Coyote.webm" :
                                    nft.includes("rabbit") ? "/nfts/Rabbit.webm" :
                                        nft.includes("cricket") ? "/nfts/Criket.webm" :
                                            nft.includes("titan") ? "/nfts/Titan.webm" : ""
                        }
                        autoPlay
                        loop
                        muted
                        playsInline
                        style={{
                            display: 'block',           // Remove inline video spacing
                            background: 'transparent',  // No background
                            border: 'none',             // No borders
                            outline: 'none',            // No focus ring
                            width: `100%`,        // Or your desired size
                            height: 'auto',
                            pointerEvents: 'none',      // Allow clicks to pass through
                        }}
                    />
            }
        </>
    );
};
