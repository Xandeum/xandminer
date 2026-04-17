import { Keypair, PublicKey } from "@solana/web3.js";

export const API_BASE_URL = "http://localhost:4000";

export const XANDMint = new PublicKey("XANDuUoVoUqniKkpcKhrxmvYJybpJvUxJLr21Gaj3Hx");
export const FEE_DEPOSIT_ACC = new PublicKey("82m8SFM5ggHrCQYbD8nC8HxWRx4YHRR7RQAdeC8RNtyX");
export const REFUNDABLE_DEPOSIT_ACC = new PublicKey("FaWhmBgWevoJGcJyrx7CHaf6WNduMjEBb6WQEccSVp6Z");

export const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");

export const DEVNET_PROGRAM = new PublicKey("6Bzz3KPvzQruqBg2vtsvkuitd6Qb4iCcr5DViifCwLsL");
export const PNODE_PROGRAM = new PublicKey("3hMZVwdgRHYSyqkdK3Y8MdZzNwLkjzXod1XrKcniXw56");
export const METAPLEX_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

export const SYSTEM_RESERVE = 30_000_000_000;

export const GLOBAL_SEED = "pnodestore";
export const OWNER_SEED = "owner";
export const PNODE_OWNER_SEED = "pnodeowner";
export const MANAGER_SEED = "manager";
export const PNODE_ACCOUNT_SEED = "pnode_account";
export const NFT_VAULT_SEED = "nft_vault";
export const MANAGER_ACCOUNT_SIZE = 179;
export const PNODE_UPDATE_DATA_SIZE = 172;
export const PNODE_ACCOUNT_SIZE = 205;
export const MANAGER_OFFSET = 32 + 1 + 32 + 32 + 32 + 32;
export const KEYPAIR_PATH = "../xandminerd/keypairs/pnode-keypair.json";
export const BOOST_FACTOR = "16";

export const PROGRAM = new PublicKey("CZ9bXL6D4uiLXGsSk5s8KAgTFEVp3gdpxPxTCrgm3VoL"); // mainnet

export const VERSION_NO = "v1.3.4";
export const VERSION_NAME = "Cologne";

export const getVersionName = (versionNo: string) => {
    if (versionNo.startsWith("v1.3.")) {
        return VERSION_NAME;
    } else if (versionNo.startsWith("v1.2.")) {
        return "Bonn";
    } else if (versionNo.startsWith("v0.8.")) {
        return "Reinheim";
    } else if (versionNo.startsWith("v0.7.")) {
        return "Heidelberg";
    } else if (versionNo.startsWith("v0.6.")) {
        return "Stuttgart";
    } else if (versionNo.startsWith("v0.5.")) {
        return "Ingolstadt";
    } else if (versionNo.startsWith("v0.4.")) {
        return "Herrenberg";
    } else if (versionNo.startsWith("v0.3.")) {
        return "Munich";
    } else {
        return " "
    }
}

