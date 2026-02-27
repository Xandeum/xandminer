import BN from "bn.js";
import { Connection, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, TransactionInstruction } from "@solana/web3.js";
import { GLOBAL_SEED, MANAGER_ACCOUNT_SIZE, MANAGER_OFFSET, MANAGER_SEED, OWNER_SEED, PNODE_ACCOUNT_SIZE, PNODE_OWNER_SEED, PNODE_UPDATE_DATA_SIZE, PROGRAM } from "CONSTS";
import { derivePnodeAccountPda, readPnodeAccount, readPnodeInfoArray } from "./pNodeHelpers";

function arrayToNum32(array) {
    const arr = new Uint8Array(array);
    const view = new DataView(arr.buffer || arr);
    const num = view.getUint32(0, true);
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
    pnodeInfos: any;
    constructor(user, reward_wallet, pnodeInfos) {
        this.user = user;
        this.reward_wallet = reward_wallet;
        this.pnodeInfos = pnodeInfos;
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

function serializePnodeUpdateData(pnodeUpdate) {
    const buffer = Buffer.alloc(PNODE_UPDATE_DATA_SIZE);
    let offset = 0;

    pnodeUpdate.devnet_pnode.toBuffer().copy(buffer, offset);
    offset += 32;

    pnodeUpdate.mainnet_pnode.toBuffer().copy(buffer, offset);
    offset += 32;

    pnodeUpdate.nft_slot_1.toBuffer().copy(buffer, offset);
    offset += 32;

    pnodeUpdate.nft_slot_2.toBuffer().copy(buffer, offset);
    offset += 32;

    pnodeUpdate.manager.toBuffer().copy(buffer, offset);
    offset += 32;

    buffer.writeBigInt64LE(BigInt(pnodeUpdate.registration_time), offset);
    offset += 8;

    buffer.writeUInt32LE(pnodeUpdate.manager_commission, offset);
    offset += 4;

    return buffer;
}

export function deserializeOwner(data) {
    let offset = 0;

    // Read user (32 bytes)
    const user = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    // Read rewards_wallet (32 bytes)
    const rewardsWallet = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    // Read pnode_info Vec length (4 bytes)
    const pnodeInfoLength = data.readUInt32LE(offset);
    offset += 4;

    // Read each PnodeInfo (140 bytes each)
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

        const registration_time = data.readBigInt64LE(offset);
        offset += 8;

        const manager_commission = data.readUInt32LE(offset);
        offset += 4;

        pnodeInfos.push({
            index: i,
            pnode,
            nft_slot_1,
            nft_slot_2,
            manager,
            registration_time: Number(registration_time),
            manager_commission,
        });
    }

    return {
        user,
        rewardsWallet,
        pnodeInfos,
    };
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

    const pubkey = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const rewardsWallet = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const commission = data.readUInt32LE(offset);
    offset += 4;

    const currentlyOperating = data.readUInt16LE(offset);
    offset += 2;

    const telegramLength = data.readUInt32LE(offset);
    offset += 4;
    const telegramId = data.slice(offset, offset + telegramLength).toString('utf8');
    offset += telegramLength;

    const discordLength = data.readUInt32LE(offset);
    offset += 4;
    const discordId = data.slice(offset, offset + discordLength).toString('utf8');
    offset += discordLength;

    const websiteLength = data.readUInt32LE(offset);
    offset += 4;
    const websiteLink = data.slice(offset, offset + websiteLength).toString('utf8');
    offset += websiteLength;

    const verified = data.readUInt8(offset) === 1;

    return {
        pubkey: pubkey.toString(),
        rewardsWallet: rewardsWallet.toString(),
        commission,
        currentlyOperating,
        telegramId,
        discordId,
        websiteLink,
        verified,
    };
}

function deserializePnodeAccount(data) {
    return {
        owner: new PublicKey(data.slice(0, 32)),
        index: data[32],
        devnet_pnode: new PublicKey(data.slice(33, 65)),
        mainnet_pnode: new PublicKey(data.slice(65, 97)),
        nft_slot_1: new PublicKey(data.slice(97, 129)),
        nft_slot_2: new PublicKey(data.slice(129, 161)),
        manager: new PublicKey(data.slice(161, 193)),
        registration_time: Number(data.readBigInt64LE(193)),
        manager_commission: data.readUInt32LE(201),
    };
}

export async function getManagerAssignedPnodes(
    connection: Connection,
    managerWalletPubkey: PublicKey
) {

    const accounts = await connection.getProgramAccounts(PROGRAM, {
        filters: [
            { dataSize: PNODE_ACCOUNT_SIZE },
            { memcmp: { offset: MANAGER_OFFSET, bytes: managerWalletPubkey.toBase58() } },
        ],
    });

    return accounts.map((acc) => {
        const p = deserializePnodeAccount(acc.account.data);
        return {
            pnodeAccountPda: acc.pubkey,
            owner: p.owner,
            index: p.index,
            devnet_pnode: p.devnet_pnode,
            mainnet_pnode: p.mainnet_pnode,
            manager: p.manager,
            manager_commission: p.manager_commission,
            registration_time: p.registration_time,
            nft_slot_1: p.nft_slot_1,
            nft_slot_2: p.nft_slot_2,
        };
    });
}

async function getAllOwnerPdas(connection: Connection, programId: PublicKey) {
    try {
        // Get all accounts owned by the program
        // Filter by discriminator or size if needed
        const accounts = await connection.getProgramAccounts(programId,
            {
                filters: [
                    {
                        // Owner PDA size: 32 + 32 + 4 + (140 * 24) = 3428 bytes
                        dataSize: 3428,
                    },
                ],
            }
        );

        return accounts;
    } catch (error) {
        console.error("❌ Error fetching program accounts:", error);
        return [];
    }
}

// Fetch and deserialize functions
export async function fetchGlobalPdaData(connection: Connection) {
    const [globalPda] = PublicKey.findProgramAddressSync(
        [Buffer.from(GLOBAL_SEED)],
        PROGRAM
    );

    const accountInfo = await connection.getParsedAccountInfo(globalPda);
    if (!accountInfo.value) {
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
            return null;
        }

        // return deserializeOwner(accountInfo.value.data);
        const data = accountInfo?.value?.data as any;

        return {
            user: new PublicKey(data.slice(0, 32)),
            rewardsWallet: new PublicKey(data.slice(32, 64)),
        };

    } catch (error) {
        console.error("Error fetching owner data:", error);
        return null;
    }
}

export const fetchpNodeInfoWithManager = async (connection: Connection, managerPubkey: PublicKey) => {
    const ownerAccounts = await getAllOwnerPdas(connection, PROGRAM);

    let pnodeinfoArr = [];
    for (const account of ownerAccounts) {
        try {

            const ownerData = deserializeOwner(account.account.data);
            const pNodeOwnerData = await fetchPNodeOwnerData(connection, ownerData?.user);
            const pNodeInfoData = await readPnodeInfoArray(connection, ownerData?.user, pNodeOwnerData?.pnode);

            for (const pnodeInfo of pNodeInfoData) {
                if (pnodeInfo.manager.equals(managerPubkey)) {
                    pnodeinfoArr.push({
                        ...pnodeInfo,
                    });
                    // return { pnodeInfo, ownerData, pNodeOwnerData };
                }
            }

        } catch (error) {
            console.error(`⚠️  Error processing account ${account.pubkey.toString()}:`, error.message);
        }
    }
    return pnodeinfoArr;
}

export async function fetchManagerData(connection: Connection, managerPubkey: PublicKey) {
    const [managerPda] = PublicKey.findProgramAddressSync(
        [Buffer.from(MANAGER_SEED), managerPubkey?.toBuffer()],
        PROGRAM
    );

    const accountInfo = await connection.getParsedAccountInfo(managerPda);
    if (!accountInfo.value) {
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

        if (accounts.length === 0) {
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

export const updateManagerAccount = async (connection: Connection, publicKey: PublicKey, newCommission: number, newTelegramId: string, newDiscordId: string, websiteLink: string, rewardWallet?: PublicKey): Promise<TransactionInstruction> => {
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
            serializeBorshString(websiteLink)
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

export async function updatePnodeDetails(ownerWallet: PublicKey, index: number, pnodeInfo: any, oldManagerPubkey: PublicKey | null = null, expectedSigner: PublicKey, pNodeKeyChanging: boolean, isManager: boolean, managerPubkey?: PublicKey): Promise<TransactionInstruction> {

    const [pnodeOwnerPda] = PublicKey.findProgramAddressSync(
        [Buffer.from(PNODE_OWNER_SEED), ownerWallet?.toBuffer()],
        PROGRAM
    );

    const [pnodeAccountPda] = derivePnodeAccountPda(ownerWallet, index);

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
            pubkey: isManager ? managerPubkey : ownerWallet,
            isSigner: true,
            isWritable: true,
        },
        {
            pubkey: ownerPda,
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: pnodeAccountPda,
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: pnodeOwnerPda,
            isSigner: false,
            isWritable: false,
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
        {
            pubkey: expectedSigner || SystemProgram.programId,
            isSigner: pNodeKeyChanging,
            isWritable: false
        },
        {
            pubkey: SystemProgram.programId,
            isSigner: false,
            isWritable: false
        },
        {
            pubkey: SYSVAR_RENT_PUBKEY,
            isSigner: false,
            isWritable: false
        }
    ];

    // Instruction tag 6 for UpdatePnodeDetails
    const instructionTag = Buffer.from(Int8Array.from([6]).buffer);
    const indexBuffer = Buffer.from([index]);
    const serializedPnodeInfo = serializePnodeUpdateData(pnodeInfo);

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