import { execFile } from 'child_process';
import util from 'util';

const execFilePromise = util.promisify(execFile);

export default async function handler(req, res) {
    // SECURITY: Authentication Check (Fix #1)
    const apiKey = process.env.XANDMINER_API_KEY;
    const clientKey = req.headers['x-api-key'];

    if (apiKey && clientKey !== apiKey) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // SECURITY: CSRF Protection (Fix #3)
    const origin = req.headers.origin;
    const host = req.headers.host;
    if (origin) {
        try {
            const originUrl = new URL(origin);
            if (originUrl.host !== host) {
                return res.status(403).json({ error: 'Forbidden' });
            }
        } catch (e) {
            return res.status(403).json({ error: 'Forbidden' });
        }
    }

    const services = ['xandminer', 'xandminerd', 'pod'];
    const validActions = ['start', 'stop'];

    if (req.method === 'GET') {
        try {
            const statusPromises = services.map(async (service) => {
                try {
                    const { stdout, stderr } = await execFilePromise('/bin/systemctl', ['is-active', `${service}.service`]);

                    // SECURITY FIX #5: Sanitize stderr
                    if (stderr) {
                        console.error(`[System Error] ${service}: ${stderr}`); // Log internal detail
                        return { service, status: 'unknown', rawStatus: 'Service check failed' }; // Generic client message
                    }

                    const status = stdout.trim();
                    const statusMap = {
                        active: 'started',
                        inactive: 'stopped',
                        failed: 'failed',
                        unknown: 'unknown',
                    };
                    return { service, status: statusMap[status] || 'unknown', rawStatus: status };
                } catch (error) {
                    // SECURITY FIX #5: Sanitize catch block errors
                    console.error(`[Execution Error] ${service}:`, error);
                    return { service, status: 'unknown', rawStatus: 'Service check failed' };
                }
            });

            const results = await Promise.all(statusPromises);
            const statusObject = results.reduce((acc, { service, status }) => {
                acc[service] = status;
                return acc;
            }, {});

            res.status(200).json(statusObject);
        } catch (error) {
            console.error('[Critical Error] GET handler failed:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    } else if (req.method === 'POST') {
        const { action, service } = req.body;

        if (!validActions.includes(action) || !services.includes(service)) {
            return res.status(400).json({ error: 'Invalid parameters' });
        }

        try {
            // Fix #2: Use execFile and sudo
            const { stdout, stderr } = await execFilePromise('/usr/bin/sudo', ['/bin/systemctl', action, `${service}.service`]);

            if (stderr) {
                // Warning logging
                console.warn(`[System Warning] ${service} ${action}: ${stderr}`);
            }

            res.status(200).json({
                message: `Service ${service} ${action}ed successfully`,
                output: stdout, // stdout is generally safe for systemctl (e.g., "Service started")
            });
        } catch (error) {
            // SECURITY FIX #5: Genericize error messages
            console.error(`[Command Failed] ${service} ${action}:`, error);

            // We can return a slightly descriptive error if it's safe, or just 500
            // Here we check if the error was likely "service not found" without exposing the raw error
            const isNotFound = error?.message?.includes("not found") || error?.stderr?.includes("not found");
            const clientMsg = isNotFound
                ? "Service not found"
                : "Failed to execute service command";

            res.status(500).json({ error: clientMsg });
        }
    } else {
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).json({ error: 'Method Not Allowed' });
    }
}