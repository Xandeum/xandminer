import { Keypair } from '@solana/web3.js';
import { KEYPAIR_PATH } from 'CONSTS';
import fs from 'fs';
import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    try {
        const filePath = path.join('../xandminerd', './keypairs', 'pnode-keypair.json')

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Keypair file does not exist.' });
        }
        const keypairJson = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        res.status(200).json({
            keypair: keypairJson
        });
    } catch (error) {
        res.status(500).json({
            error: 'Failed to load keypair',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}