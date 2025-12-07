import { execFile } from 'child_process';
import util from 'util';

const execFilePromise = util.promisify(execFile);

export default async function handler(req, res) {
    // SECURITY: Authentication Check (From Fix #1)
    const apiKey = process.env.XANDMINER_API_KEY;
    const clientKey = req.headers['x-api-key'];

    if (apiKey && clientKey !== apiKey) {
        return res.status(401).json({ error: 'Unauthorized: Invalid or missing API Key' });
    }

    // SECURITY: CSRF Protection (Fix #3)
    // We verify that the request originated from this same server/domain.
    // Browsers automatically send the 'origin' header for POST requests.
    const origin = req.headers.origin;
    const host = req.headers.host; // e.g., "localhost:3000" or "192.168.1.50:3000"

    if (origin) {
        try {
            const originUrl = new URL(origin);
            if (originUrl.host !== host) {
                return res.status(403).json({ error: 'Forbidden: CSRF Origin Mismatch' });
            }
        } catch (e) {
            // If the origin header is malformed, block the request.
            return res.status(403).json({ error: 'Forbidden: Invalid Origin Header' });
        }
    }

    const services = ['xandminer', 'xandminerd', 'pod'];
    const validActions = ['start', 'stop'];

    if (req.method === 'GET') {
        // ... (Existing GET logic remains unchanged) ...
        // [Copy the GET logic from the previous step]
        try {
            const statusPromises = services.map(async (service) => {
                try {
                    const { stdout, stderr } = await execFilePromise('/bin/systemctl', ['is-active', `${service}.service`]);
                    if (stderr) { return { service, status: 'unknown', rawStatus: stderr }; }
                    const status = stdout.trim();
                    const statusMap = { active: 'started', inactive: 'stopped', failed: 'failed', unknown: 'unknown' };
                    return { service, status: statusMap[status] || 'unknown', rawStatus: status };
                } catch (error) {
                    const status = error.stdout ? error.stdout.trim() : 'unknown';
                    const statusMap = { active: 'started', inactive: 'stopped', failed: 'failed', unknown: 'unknown' };
                    return { service, status: statusMap[status] || 'unknown', rawStatus: error.message };
                }
            });
            const results = await Promise.all(statusPromises);
            const statusObject = results.reduce((acc, { service, status }) => { acc[service] = status; return acc; }, {});
            res.status(200).json(statusObject);
        } catch (error) {
            res.status(500).json({ error: 'Failed to get service statuses' });
        }

    } else if (req.method === 'POST') {
        // ... (Existing POST logic remains unchanged) ...
        // [Copy the POST logic from the previous step]
        const { action, service } = req.body;

        if (!validActions.includes(action) || !services.includes(service)) {
            return res.status(400).json({ error: 'Invalid or missing action or service' });
        }

        try {
            const { stdout, stderr } = await execFilePromise('/usr/bin/sudo', ['/bin/systemctl', action, `${service}.service`]);
            if (stderr) { console.warn(`Service control stderr: ${stderr}`); }
            res.status(200).json({ message: `Service ${service} ${action}ed successfully`, output: stdout });
        } catch (error) {
            const errorMsg = error?.message?.toString()?.includes("not found") ? `Service ${service} does not exist.` : "Failed to execute service command.";
            console.error(error);
            res.status(500).json({ error: errorMsg });
        }

    } else {
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
}