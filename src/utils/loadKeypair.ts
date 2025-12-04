// utils/loadKeypair.ts
import fs from 'fs';
import bs58 from 'bs58';
import { Keypair } from '@solana/web3.js';
import { KEYPAIR_PATH } from 'CONSTS';

export function loadKeypairFromFile(): Keypair {
    const raw = fs.readFileSync(KEYPAIR_PATH, 'utf8').trim();

    // Try JSON array (Solana id.json format)
    try {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
            const secretKey = Uint8Array.from(arr);
            return Keypair.fromSecretKey(secretKey);
        }
    } catch {
        // not JSON, fall through
    }

    // Try base58 string
    try {
        const secretKey = bs58.decode(raw);
        return Keypair.fromSecretKey(secretKey);
    } catch {
        // not base58 either
    }

    throw new Error('Unsupported key format. Expected JSON array or base58 string.');
}