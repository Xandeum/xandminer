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

export async function getPnodeManagerAccountData(connection: Connection, pubkey: string) {
    let managerPda = PublicKey.findProgramAddressSync(
        [Buffer.from("manager"), new PublicKey(pubkey).toBuffer()],
        DEVNET_PROGRAM
    );

    let dat = await connection.getParsedAccountInfo(managerPda[0]);

    if (dat.value == null) {
        return null;
    }

    let data: any = dat.value.data;

    let odata = new PNodeManager(
        new PublicKey(data.slice(0, 32)),
        arrayToNum32(data.slice(32, 36)),
        arrayToNum32(data.slice(36, 40)),
    );
    return odata;
}
