/* eslint-disable */
import { Connection, PublicKey } from "@solana/web3.js";
import { GLOBAL_SEED, OWNER_SEED, PNODE_OWNER_SEED, PROGRAM, DEVNET_PROGRAM, PNODE_ACCOUNT_SEED, MANAGER_SEED } from "CONSTS";


class PNodeManager {
    owner: PublicKey;
    purchased_pnodes: number;
    registered_pnodes: number;
    constructor(owner, purchased_pnodes, registered_pnodes) {
        this.owner = owner;
        this.purchased_pnodes = purchased_pnodes;
        this.registered_pnodes = registered_pnodes;
    }
}


class Global {
    total: any;
    constructor(total) {
        this.total = total;

    }
}

class Count {
    count: number;
    constructor(count) {
        this.count = count;
    }
}

class PNodeOwner {
    user: any;
    pnode: any;
    pnode_with_coupon: any;
    constructor(total, pnode, pnode_with_coupon) {
        this.user = total;
        this.pnode = pnode;
        this.pnode_with_coupon = pnode_with_coupon;

    }
}

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

function arrayToNum8(array) {
    const arr = new Uint8Array(array);
    const view = new DataView(arr.buffer || arr);

    const num = view.getUint8(0);
    return num.toString();
}

function arrayToNumNew(array, startIndex = 0, byteLength = 8, littleEndian = true) {
    const arr = new Uint8Array(array);
    if (startIndex + byteLength > arr.length) {
        throw new Error("Not enough bytes in array");
    }

    const slicedArr = arr.slice(startIndex, startIndex + byteLength);
    const view = new DataView(slicedArr.buffer);

    let num;
    switch (byteLength) {
        case 1: num = view.getUint8(0); break;
        case 2: num = view.getUint16(0, littleEndian); break;
        case 4: num = view.getUint32(0, littleEndian); break;
        case 8: num = view.getBigUint64(0, littleEndian); break;
        default: throw new Error("Unsupported byte length");
    }

    return typeof num === "bigint" ? num.toString() : num;
}


export function derivePnodeAccountPda(ownerPubkey: PublicKey, index: number): [PublicKey, number] {
    const [pda, bump] = PublicKey.findProgramAddressSync(
        [
            Buffer.from(PNODE_ACCOUNT_SEED),
            ownerPubkey.toBuffer(),
            Buffer.from([index]),
        ],
        PROGRAM
    );
    return [pda, bump];
}

export function deriveOwnerPda(ownerPubkey) {
    const [pda, bump] = PublicKey.findProgramAddressSync(
        [Buffer.from(OWNER_SEED), ownerPubkey.toBuffer()],
        PROGRAM
    );
    return [pda, bump];
}



export async function getPnodeManagerAccountData(connection: Connection, pubkey: string) {
    let managerPda = PublicKey.findProgramAddressSync(
        [Buffer.from(MANAGER_SEED), new PublicKey(pubkey).toBuffer()],
        DEVNET_PROGRAM
    );

    let dat = await connection.getParsedAccountInfo(managerPda[0]);

    if (dat.value == null) {
        return null;
    }

    let tempData: any = dat?.value?.data

    let data = new PNodeManager(
        new PublicKey(tempData.slice(0, 32)),
        arrayToNumNew(dat?.value?.data, 32, 1, true),
        arrayToNumNew(dat?.value?.data, 33, 1, true),
    );
    return data;
}


export async function getGlobalAccountData(connection: Connection) {
    let global = PublicKey.findProgramAddressSync(
        [Buffer.from(GLOBAL_SEED)],
        PROGRAM
    );

    let dat = await connection.getParsedAccountInfo(global[0]);

    if (dat.value == null) {
        return null;
    }

    let data: any = dat.value.data;

    let gdata = new Global(
        arrayToNum32(data.slice(0, 4)),

    );
    return gdata;
}

export async function getPnodeOwnerAccountData(connection: Connection, pubkey: string) {
    let ownerPda = PublicKey.findProgramAddressSync(
        [Buffer.from(PNODE_OWNER_SEED), new PublicKey(pubkey).toBuffer()],
        PROGRAM
    );

    let dat = await connection.getParsedAccountInfo(ownerPda[0]);

    if (dat.value == null) {
        return null;
    }

    let data: any = dat.value.data;

    let odata = new PNodeOwner(
        new PublicKey(data.slice(0, 32)),
        arrayToNum8(data.slice(32, 33)),
        arrayToNum8(data.slice(33, 34)),
    );
    return odata;
}
export async function readPnodeInfoArray(connection: Connection, ownerPubkey: PublicKey, pNodesQty: number) {
    const pnodeInfos = [];

    for (let i = 0; i < pNodesQty; i++) {
        const [pnodeAccountPda] = derivePnodeAccountPda(ownerPubkey, i);

        const accountInfo = await connection.getAccountInfo(pnodeAccountPda);

        if (!accountInfo || !accountInfo.data) {
            // return null;
            pnodeInfos.push({
                owner: ownerPubkey,
                index: i,
                devnet_pnode: PublicKey.default,
                mainnet_pnode: PublicKey.default,
                nft_slot_1: PublicKey.default,
                nft_slot_2: PublicKey.default,
                manager: PublicKey.default,
                registration_time: 0,
                managerCommission: 0,
            })
            continue;
        }

        const data = accountInfo?.data;
        let offset = 0;

        const pnodeAccount = {
            owner: new PublicKey(data.slice(offset, offset + 32)),
            index: data[offset + 32],
            devnet_pnode: new PublicKey(data.slice(offset + 33, offset + 65)),
            mainnet_pnode: new PublicKey(data.slice(offset + 65, offset + 97)),
            nft_slot_1: new PublicKey(data.slice(offset + 97, offset + 129)),
            nft_slot_2: new PublicKey(data.slice(offset + 129, offset + 161)),
            manager: new PublicKey(data.slice(offset + 161, offset + 193)),
            registration_time: Number(data.readBigInt64LE(offset + 193)),
            managerCommission: data.readUInt32LE(offset + 201),
        };
        pnodeInfos.push(pnodeAccount);
    }

    return pnodeInfos;
}

export async function readPnodeAccount(connection: Connection, ownerPubkey: PublicKey, index: number) {

    const [pnodeAccountPda] = derivePnodeAccountPda(ownerPubkey, index);

    const accountInfo = await connection.getAccountInfo(pnodeAccountPda);

    if (!accountInfo || !accountInfo.data) {
        return null;
    }

    const data = accountInfo?.data;
    let offset = 0;

    const pnodeAccount = {
        owner: new PublicKey(data.slice(offset, offset + 32)),
        index: data[offset + 32],
        devnet_pnode: new PublicKey(data.slice(offset + 33, offset + 65)),
        mainnet_pnode: new PublicKey(data.slice(offset + 65, offset + 97)),
        nft_slot_1: new PublicKey(data.slice(offset + 97, offset + 129)),
        nft_slot_2: new PublicKey(data.slice(offset + 129, offset + 161)),
        manager: new PublicKey(data.slice(offset + 161, offset + 193)),
        registration_time: Number(data.readBigInt64LE(offset + 193)),
        managerCommission: data.readUInt32LE(offset + 201),
    };

    return pnodeAccount;
}

