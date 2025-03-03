/* eslint-disable */
import { Connection, PublicKey } from "@solana/web3.js";
import { DEVNET_PROGRAM } from "CONSTS";


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

    console.log("dataa >>> ", dat);

    let tempData: any = dat?.value?.data

    let data = new PNodeManager(
        new PublicKey(tempData.slice(0, 32)),
        arrayToNumNew(dat?.value?.data, 32, 1, true),
        arrayToNumNew(dat?.value?.data, 33, 1, true),
    );
    return data;
}

