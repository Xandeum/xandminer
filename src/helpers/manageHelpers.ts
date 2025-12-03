import BN from "bn.js";
import { Connection, PublicKey, TransactionInstruction } from "@solana/web3.js";
import { ADMIN_WALLET, GLOBAL_SEED, MANAGER_ACCOUNT_SIZE, MANAGER_SEED, OWNER_SEED, PNODE_OWNER_SEED, PROGRAM } from "CONSTS";

// Helper functions for data deserialization
function arrayToNum(array) {
    const arr = new Uint8Array(array);
    const view = new DataView(arr.buffer || arr);
    const num = view.getBigUint64(0, true);
    return num.toString();
}

function arrayToNum32(array) {
    const arr = new Uint8Array(array);
    const view = new DataView(arr.buffer || arr);
    const num = view.getUint32(0, true);
    return num.toString();
}

function arrayToNum16(array) {
    const arr = new Uint8Array(array);
    const view = new DataView(arr.buffer || arr);
    const num = view.getUint16(0, true);
    return num.toString();
}

function arrayToNum8(array) {
    const arr = new Uint8Array(array);
    const view = new DataView(arr.buffer || arr);
    const num = view.getUint8(0);
    return num.toString();
}

function bytesTou32Array(array) {
    const len = array.length;
    const newLen = len / 4;
    let arr = [];
    for (let i = 0; i < newLen; i++) {
        const num = arrayToNum32(array.slice(i * 4, (i + 1) * 4));
        arr.push(num);
    }
    return arr;
}

function bytesToPubkeyArray(array, length) {
    const pubkeys = [];
    for (let i = 0; i < length; i++) {
        const pubkeyBytes = array.slice(i * 32, (i + 1) * 32);
        pubkeys.push(new PublicKey(pubkeyBytes));
    }
    return pubkeys;
}

export function bufferToString(number: BN): string {
    const buffer = Buffer.from(number.toArray('le', 8));
    const string = buffer.toString('utf8').replace(/\0/g, '');
    return string;
}

// Helper function to serialize a string in Borsh format
export function serializeBorshString(str) {
    const utf8Bytes = Buffer.from(str, 'utf8');
    const length = utf8Bytes.length;
    const lengthBuffer = Buffer.alloc(4);
    lengthBuffer.writeUInt32LE(length, 0);
    return Buffer.concat([lengthBuffer, utf8Bytes]);
}

// Data Classes
export class GlobalPdaData {
    total_pnode: any;
    constructor(total_pnode) {
        this.total_pnode = total_pnode;
    }
}

export class PNodeOwnerData {
    user: any;
    pnode: any;
    pnode_with_coupon: any;
    constructor(user, pnode, pnode_with_coupon) {
        this.user = user;
        this.pnode = pnode;
        this.pnode_with_coupon = pnode_with_coupon;
    }
}

export class CouponData {
    coupon_codes: any;
    constructor(coupon_codes) {
        this.coupon_codes = coupon_codes;
    }
}

export class OwnerData {
    user: any;
    reward_wallet: any;
    constructor(user, reward_wallet) {
        this.user = user;
        this.reward_wallet = reward_wallet;
    }
}

export class ManagerData {
    pubkey: any;
    rewards_wallet: any;
    commission: any;
    currentlyOperating: any;
    telegramId: any;
    discordId: any;
    constructor(pubkey, rewards_wallet, commission, currentlyOperating, telegramId, discordId) {
        this.pubkey = pubkey;
        this.rewards_wallet = rewards_wallet;
        this.commission = commission;
        this.currentlyOperating = currentlyOperating;
        this.telegramId = telegramId;
        this.discordId = discordId;
    }
}

// Deserialization functions
export function deserializeGlobalPda(data) {
    return new GlobalPdaData(
        arrayToNum32(data.slice(0, 4))
    );
}

export function deserializePNodeOwner(data) {
    return new PNodeOwnerData(
        new PublicKey(data.slice(0, 32)),
        arrayToNum8(data.slice(32, 33)),
        arrayToNum8(data.slice(33, 34))
    );
}

export function deserializeCoupon(data) {
    return new CouponData(
        bytesTou32Array(data.slice(0, 1536)) // 384 * 4 bytes
    );
}

export function deserializeOwner(data) {
    return new OwnerData(
        new PublicKey(data.slice(0, 32)),
        new PublicKey(data.slice(32, 64))
    );
}

function deserializeBorshString(data, offset) {
    // Read the length (u32, 4 bytes, little-endian)
    const length = data.readUInt32LE(offset);
    offset += 4;

    // Read the string bytes
    const stringBytes = data.slice(offset, offset + length);
    const string = stringBytes.toString('utf8');

    return { value: string, bytesRead: 4 + length };
}

export function deserializeManager(data) {
    let offset = 0;

    // Read pubkey (32 bytes)
    const pubkey = new PublicKey(data?.slice(offset, offset + 32));
    offset += 32;

    // Read rewards_wallet (32 bytes)
    const rewardsWallet = new PublicKey(data?.slice(offset, offset + 32));
    offset += 32;

    // Read commission (u32, 4 bytes, little-endian)
    const commission = data?.readUInt32LE(offset);
    offset += 4;

    // Read currently_operating (u16, 2 bytes, little-endian)
    const currentlyOperating = data?.readUInt16LE(offset);
    offset += 2;

    // Read telegram_id (Borsh string)
    const telegramResult = deserializeBorshString(data, offset);
    const telegramId = telegramResult.value;
    offset += telegramResult.bytesRead;

    // Read discord_id (Borsh string)
    const discordResult = deserializeBorshString(data, offset);
    const discordId = discordResult.value;
    offset += discordResult.bytesRead;

    // Read verified (bool, 1 byte)
    const verified = data.readUInt8(offset) === 1;

    return {
        pubkey: pubkey?.toBase58(),
        rewardsWallet: rewardsWallet?.toBase58(),
        commission,
        currentlyOperating,
        telegramId: telegramId?.toString(),
        discordId: discordId?.toString(),
        verified
    };
}

// Fetch and deserialize functions
export async function fetchGlobalPdaData(connection: Connection) {
    const [globalPda] = PublicKey.findProgramAddressSync(
        [Buffer.from(GLOBAL_SEED)],
        PROGRAM
    );

    const accountInfo = await connection.getParsedAccountInfo(globalPda);
    if (!accountInfo.value) {
        console.log("GlobalPda account not found");
        return null;
    }

    return deserializeGlobalPda(accountInfo.value.data);
}

export async function fetchPNodeOwnerData(connection: Connection, walletPubkey: PublicKey) {
    const [pnodeOwnerPda] = PublicKey.findProgramAddressSync(
        [Buffer.from(PNODE_OWNER_SEED), walletPubkey.toBuffer()],
        PROGRAM
    );

    const accountInfo = await connection.getParsedAccountInfo(pnodeOwnerPda);
    if (!accountInfo.value) {
        console.log("PNodeOwner account not found for wallet:", walletPubkey.toString());
        return null;
    }

    return deserializePNodeOwner(accountInfo.value.data);
}

export async function fetchCouponData(connection: Connection) {
    const [couponPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("coupon")],
        PROGRAM
    );

    const accountInfo = await connection.getParsedAccountInfo(couponPda);
    if (!accountInfo.value) {
        console.log("Coupon account not found");
        return null;
    }

    return deserializeCoupon(accountInfo.value.data);
}

export async function fetchOwnerData(connection: Connection, walletPubkey: PublicKey) {
    try {
        const [ownerPda] = PublicKey.findProgramAddressSync(
            [Buffer.from(OWNER_SEED), walletPubkey.toBuffer()],
            PROGRAM
        );

        const accountInfo = await connection.getParsedAccountInfo(ownerPda);
        if (!accountInfo.value) {
            console.log("Owner account not found for wallet:", walletPubkey.toString());
            return null;
        }

        // return deserializeOwner(accountInfo.value.data);
        const data = accountInfo?.value?.data as any;
        let offset = 0;

        // Deserialize user (32 bytes)
        const user = new PublicKey(data.slice(offset, offset + 32));
        offset += 32;

        // Deserialize rewards_wallet (32 bytes)
        const rewardsWallet = new PublicKey(data.slice(offset, offset + 32));
        offset += 32;

        // Deserialize pnode_info Vec length (4 bytes)
        const pnodeInfoLength = data.readUInt32LE(offset);
        offset += 4;

        // Deserialize each PnodeInfo (140 bytes each)
        const pnodeInfos = [];
        for (let i = 0; i < pnodeInfoLength; i++) {
            const pnode = new PublicKey(data.slice(offset, offset + 32));
            offset += 32;

            const nft_slot_1 = new PublicKey(data.slice(offset, offset + 32));
            offset += 32;

            const nft_slot_2 = new PublicKey(data.slice(offset, offset + 32));
            offset += 32;

            const manager = new PublicKey(data.slice(offset, offset + 32));
            offset += 32;

            const registrationTime = data.readBigInt64LE(offset);
            offset += 8;

            const managerCommission = data.readUInt32LE(offset);
            offset += 4;

            pnodeInfos.push({
                index: i,
                pnode,
                nft_slot_1,
                nft_slot_2,
                manager,
                registrationTime: Number(registrationTime),
                managerCommission,
            });
        }

        return {
            user,
            rewardsWallet,
            pnodeInfos,
        };
    } catch (error) {
        console.error("Error fetching owner data:", error);
        return null;
    }
}

export async function fetchManagerData(connection: Connection, managerPubkey: PublicKey) {
    const [managerPda] = PublicKey.findProgramAddressSync(
        [Buffer.from(MANAGER_SEED), managerPubkey?.toBuffer()],
        PROGRAM
    );

    const accountInfo = await connection.getParsedAccountInfo(managerPda);
    if (!accountInfo.value) {
        console.log("Manager account not found for wallet:", managerPubkey?.toString());
        return null;
    }

    return deserializeManager(accountInfo.value.data);
}

export async function fetchAllManagers(connection: Connection) {


    try {
        // Fetch all accounts owned by the PROGRAM
        const accounts = await connection?.getProgramAccounts(PROGRAM, {
            filters: [
                {
                    dataSize: MANAGER_ACCOUNT_SIZE,
                },
            ],
        });

        console.log(`Found ${accounts.length} Manager account(s)\n`);

        if (accounts.length === 0) {
            console.log("No manager accounts found.");
            return [];
        }

        const managers = [];

        accounts.forEach((account, index) => {
            try {
                const managerData = deserializeManager(account.account.data);



                managers.push({
                    address: account.pubkey,
                    data: managerData,
                    lamports: account.account.lamports,
                });
            } catch (error) {
                console.error(`Error deserializing manager #${index + 1}:`, error.message);
            }
        });

        return managers;

    } catch (error) {
        console.error("Error fetching manager accounts:", error);
        return [];
    }
}

export const updateManagerAccount = async (connection: Connection, publicKey: PublicKey, newCommission: number, newTelegramId: string, newDiscordId: string, rewardWallet?: PublicKey): Promise<TransactionInstruction> => {
    try {
        const [managerPda] = PublicKey.findProgramAddressSync(
            [Buffer.from(MANAGER_SEED), publicKey.toBuffer()],
            PROGRAM
        );

        const currentManagerData = await fetchManagerData(connection, publicKey);
        if (!currentManagerData) {
            console.error("Error: Manager is not registered!");
            return;
        }

        let rewardWalletPubkey: PublicKey;
        if (rewardWallet && rewardWallet != null) {
            rewardWalletPubkey = rewardWallet;
        } else {
            rewardWalletPubkey = new PublicKey(currentManagerData?.rewardsWallet);
        }

        const keys = [
            {
                pubkey: publicKey,
                isSigner: true,
                isWritable: true,
            },
            {
                pubkey: managerPda,
                isSigner: false,
                isWritable: true,
            },
            {
                pubkey: rewardWallet,
                isSigner: false,
                isWritable: true,
            }
        ];

        const data = Buffer.concat([
            Buffer.from(Int8Array.from([9]).buffer),
            Buffer.from(Uint8Array.of(...new BN(newCommission).toArray("le", 4))),
            serializeBorshString(newTelegramId),
            serializeBorshString(newDiscordId),
        ]);

        return new TransactionInstruction({
            keys: keys,
            programId: PROGRAM,
            data: data,
        });
    } catch (error) {
        console.error("Error updating manager account:", error);
    }
}

// start of owner helpers
export async function registerOwner(publicKey: PublicKey): Promise<TransactionInstruction | { error: string }> {
    try {
        const [pnodeOwnerPda] = PublicKey.findProgramAddressSync(
            [Buffer.from(PNODE_OWNER_SEED), publicKey.toBuffer()],
            PROGRAM
        );

        const [ownerPda] = PublicKey.findProgramAddressSync(
            [Buffer.from(OWNER_SEED), publicKey.toBuffer()],
            PROGRAM
        );

        const keys = [
            {
                pubkey: publicKey,
                isSigner: true,
                isWritable: true,
            },
            {
                pubkey: pnodeOwnerPda,
                isSigner: false,
                isWritable: false,
            },
            {
                pubkey: ownerPda,
                isSigner: false,
                isWritable: true,
            },
            {
                pubkey: new PublicKey("11111111111111111111111111111111"),
                isSigner: false,
                isWritable: false,
            },
            {
                pubkey: new PublicKey("SysvarRent111111111111111111111111111111111"),
                isSigner: false,
                isWritable: false,
            },
        ];


        const data = Buffer.from(Int8Array.from([7]).buffer);

        return new TransactionInstruction({
            keys: keys,
            programId: PROGRAM,
            data: data,
        });
    } catch (error) {
        console.error("Error while registering owner:", error);
        return { error: `Failed to register owner: ${error?.message || error}` };

    }
}

export async function registerRewardWallet(publicKey: PublicKey, rewardWalletPubkey: PublicKey): Promise<TransactionInstruction | { error: string }> {
    try {

        const [ownerPda] = PublicKey.findProgramAddressSync(
            [Buffer.from(OWNER_SEED), publicKey.toBuffer()],
            PROGRAM
        );

        const keys = [
            {
                pubkey: publicKey,
                isSigner: true,
                isWritable: false,
            },
            {
                pubkey: ownerPda,
                isSigner: false,
                isWritable: true,
            },
            {
                pubkey: rewardWalletPubkey,
                isSigner: false,
                isWritable: false,
            },
        ];


        const data = Buffer.from(Int8Array.from([10]).buffer);

        return new TransactionInstruction({
            keys: keys,
            programId: PROGRAM,
            data: data,
        });
    } catch (error) {
        console.error("Error while updating reward wallet:", error);
        return { error: `Failed to update reward wallet: ${error?.message || error}` };

    }
}

export async function updatePnodeDetails(ownerWallet: PublicKey, index: number, pnodeInfo: any, oldManagerPubkey: PublicKey | null = null): Promise<TransactionInstruction> {

    console.log("Updating pnode details with info:", pnodeInfo);

    const [pnodeOwnerPda] = PublicKey.findProgramAddressSync(
        [Buffer.from(PNODE_OWNER_SEED), ownerWallet?.toBuffer()],
        PROGRAM
    );

    const [ownerPda] = PublicKey.findProgramAddressSync(
        [Buffer.from(OWNER_SEED), ownerWallet?.toBuffer()],
        PROGRAM
    );

    // Determine old and new manager PDAs
    const oldManagerPda = oldManagerPubkey ?
        PublicKey.findProgramAddressSync(
            [Buffer.from(MANAGER_SEED), oldManagerPubkey.toBuffer()],
            PROGRAM
        )[0] : PublicKey.default;

    const newManagerPda = pnodeInfo.manager && !pnodeInfo.manager.equals(PublicKey.default) ?
        PublicKey.findProgramAddressSync(
            [Buffer.from(MANAGER_SEED), pnodeInfo.manager.toBuffer()],
            PROGRAM
        )[0] : PublicKey.default;

    const keys = [
        {
            pubkey: ownerWallet,
            isSigner: true,
            isWritable: true,
        },
        {
            pubkey: ownerPda,
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: pnodeOwnerPda,
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: oldManagerPda,
            isSigner: false,
            isWritable: oldManagerPda && !oldManagerPda.equals(PublicKey.default),
        },
        {
            pubkey: newManagerPda,
            isSigner: false,
            isWritable: newManagerPda && !newManagerPda.equals(PublicKey.default),
        },

    ];

    // Instruction tag 6 for UpdatePnodeDetails
    const instructionTag = Buffer.from(Int8Array.from([6]).buffer);

    const indexBuffer = Buffer.from([index]);

    const pnodeBuffer = pnodeInfo.pnode.toBuffer();
    const nftSlot1Buffer = pnodeInfo.nft_slot_1.toBuffer();
    const nftSlot2Buffer = pnodeInfo.nft_slot_2.toBuffer();
    const managerBuffer = pnodeInfo.manager.toBuffer();
    const timeBuffer = Buffer.alloc(8);
    timeBuffer.writeBigInt64LE(BigInt(pnodeInfo.registrationTime), 0);
    const commissionBuffer = Buffer.alloc(4);
    commissionBuffer.writeUInt32LE(pnodeInfo.managerCommission, 0);

    const serializedPnodeInfo = Buffer.concat([
        pnodeBuffer,
        nftSlot1Buffer,
        nftSlot2Buffer,
        managerBuffer,
        timeBuffer,
        commissionBuffer
    ]);

    const data = Buffer.concat([
        instructionTag,
        indexBuffer,
        serializedPnodeInfo,
    ]);

    return new TransactionInstruction({
        keys: keys,
        programId: PROGRAM,
        data: data,
    });
}


export async function approveManager(publicKey: PublicKey): Promise<TransactionInstruction | { error: string }> {
    try {

        if (!publicKey.equals(ADMIN_WALLET)) {
            return { error: `Only admin can approve managers.` };
        }

        const [managerPda] = PublicKey.findProgramAddressSync(
            [Buffer.from(MANAGER_SEED), publicKey.toBuffer()],
            PROGRAM
        );

        const instructionData = Buffer.from([11]);

        return new TransactionInstruction({
            keys: [
                { pubkey: publicKey, isSigner: true, isWritable: false },
                { pubkey: managerPda, isSigner: false, isWritable: true },
            ],
            programId: PROGRAM,
            data: instructionData,
        });

    } catch (error) {
        console.error("Error while approving manager:", error);
        return { error: `Failed to approve manager: ${error?.message || error}` };

    }
}

export async function disApproveManager(publicKey: PublicKey): Promise<TransactionInstruction | { error: string }> {
    try {

        if (!publicKey.equals(ADMIN_WALLET)) {
            return { error: `Only admin can approve managers.` };
        }

        const [managerPda] = PublicKey.findProgramAddressSync(
            [Buffer.from(MANAGER_SEED), publicKey.toBuffer()],
            PROGRAM
        );

        const instructionData = Buffer.from([12]);

        return new TransactionInstruction({
            keys: [
                { pubkey: publicKey, isSigner: true, isWritable: false },
                { pubkey: managerPda, isSigner: false, isWritable: true },
            ],
            programId: PROGRAM,
            data: instructionData,
        });

    } catch (error) {
        console.error("Error while approving manager:", error);
        return { error: `Failed to approve manager: ${error?.message || error}` };

    }
}


