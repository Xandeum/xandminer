/* eslint-disable */
import { Connection, PublicKey } from "@solana/web3.js";
import { GLOBAL_SEED, OWNER_SEED, PNODE_OWNER_SEED, PROGRAM, DEVNET_PROGRAM } from "CONSTS";


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

class PNodeInfoData {
    pnode: any;
    nft: any;
    manager: any;
    registration_time: any;
    manager_commission: any;
    constructor(pnode, nft, manager, registration_time, manager_commission) {
        this.pnode = pnode;
        this.nft = nft;
        this.manager = manager;
        this.registration_time = registration_time;
        this.manager_commission = manager_commission;
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

export async function getPnodeManagerAccountData(connection: Connection, pubkey: string) {
    let managerPda = PublicKey.findProgramAddressSync(
        [Buffer.from("manager"), new PublicKey(pubkey).toBuffer()],
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
export async function readPnodeInfoArray(connection: Connection, pubkey: PublicKey) {
    const [ownerPda] = PublicKey.findProgramAddressSync(
        [Buffer.from(OWNER_SEED), pubkey?.toBuffer()],
        PROGRAM
    );

    const accountInfo = await connection.getAccountInfo(ownerPda);

    if (!accountInfo || !accountInfo.data) {
        return null;
    }

    const data = accountInfo.data;
    let offset = 64; // Skip user (32) + rewards_wallet (32)

    // Read Vec length (4 bytes)
    const length = data.readUInt32LE(offset);
    offset += 4;

    // Read each PnodeInfo (108 bytes each)
    const pnodeInfos = [];
    for (let i = 0; i < length; i++) {
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

    return pnodeInfos;
}

