// pages/api/pods-credits.ts
import axios from 'axios';
import type { NextApiRequest, NextApiResponse } from 'next';

const ATLAS_API_URL = 'https://podcredits.xandeum.network/api/mainnet-pod-credits';
export const revalidate = 30;

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {

        const response = await fetch(ATLAS_API_URL, {
            next: { revalidate: revalidate },
            headers: {
                'Cache-Control': 'max-age=10',
                'CDN-Cache-Control': 'max-age=60',
                'Vercel-CDN-Cache-Control': 'max-age=3600',
            },
        });

        if (!response.ok) {
            return res.status(response.status).json({ error: 'Upstream API error' });
        }
        const data = await response.json();
        res.status(200).json(data);
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
}