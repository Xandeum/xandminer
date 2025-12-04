import { Keypair, PublicKey } from "@solana/web3.js";

export const API_BASE_URL = "http://localhost:4000";

export const XANDMint = new PublicKey("XANDuUoVoUqniKkpcKhrxmvYJybpJvUxJLr21Gaj3Hx");
export const FEE_DEPOSIT_ACC = new PublicKey("82m8SFM5ggHrCQYbD8nC8HxWRx4YHRR7RQAdeC8RNtyX");
export const REFUNDABLE_DEPOSIT_ACC = new PublicKey("FaWhmBgWevoJGcJyrx7CHaf6WNduMjEBb6WQEccSVp6Z");

export const DEVNET_PROGRAM = new PublicKey("6Bzz3KPvzQruqBg2vtsvkuitd6Qb4iCcr5DViifCwLsL");
export const PNODE_PROGRAM = new PublicKey("3hMZVwdgRHYSyqkdK3Y8MdZzNwLkjzXod1XrKcniXw56");

export const SYSTEM_RESERVE = 30_000_000_000;

export const VERSION_NO = "v0.5.0";
export const VERSION_NAME = "Ingolstadt";


export const GLOBAL_SEED = "pnodestore";
export const OWNER_SEED = "owner5";
export const PNODE_OWNER_SEED = "pnodeowner";
export const MANAGER_SEED = "manager5";
export const MANAGER_ACCOUNT_SIZE = 143;
export const KEYPAIR_PATH = "../xandminerd/keypairs/pnode-keypair.json";

export const PROGRAM = new PublicKey("GSfmK1JX1yh7WYWt1QySC8VYp9PfgUM2paMc9F6YD1F1"); // devnet - Abhi


export const getVersionName = (versionNo: string) => {
    if (versionNo.startsWith("v0.5.")) {
        return "Ingolstadt";
    } else if (versionNo.startsWith("v0.4.")) {
        return "Herrenberg";
    } else if (versionNo.startsWith("v0.3.")) {
        return "Munich";
    } else {
        return " "
    }
}

