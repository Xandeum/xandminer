import { execFile } from 'child_process';
import util from 'util';

// Use execFile instead of exec. 
// execFile does not spawn a shell, preventing shell injection attacks.
const execFilePromise = util.promisify(execFile);

export default async function handler(req, res) {
    // SECURITY: Authentication Check (From Fix #1)
    const apiKey = process.env.XANDMINER_API_KEY;
    const clientKey = req.headers['x-api-key'];

    if (apiKey && clientKey !== apiKey) {
        return res.status(401).json({ error: 'Unauthorized: Invalid or missing API Key' });
    }

    const services = ['xandminer', 'xandminerd', 'pod'];
    const validActions = ['start', 'stop'];

    if (req.method === 'GET') {
        // Handle status check for all services
        try {
            const statusPromises = services.map(async (service) => {
                // Use execFile for safety. 'systemctl' is usually in /bin or /usr/bin.
                // We assume /bin/systemctl here, but you might need /usr/bin/systemctl depending on your OS.
                try {
                    const { stdout, stderr } = await execFilePromise('/bin/systemctl', ['is-active', `${service}.service`]);

                    if (stderr) {
                        return { service, status: 'unknown', rawStatus: stderr };
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
                    // execFile throws if the command fails (exit code != 0), which systemctl does if service is inactive/failed
                    // We try to recover the status from stdout if available, or error message
                    const status = error.stdout ? error.stdout.trim() : 'unknown';
                    const statusMap = {
                        active: 'started',
                        inactive: 'stopped',
                        failed: 'failed',
                        unknown: 'unknown',
                    };
                    return { service, status: statusMap[status] || 'unknown', rawStatus: error.message };
                }
            });

            const results = await Promise.all(statusPromises);
            const statusObject = results.reduce((acc, { service, status }) => {
                acc[service] = status;
                return acc;
            }, {});

            res.status(200).json(statusObject);
        } catch (error) {
            // Avoid leaking detailed system error messages
            res.status(500).json({ error: 'Failed to get service statuses' });
        }
    } else if (req.method === 'POST') {
        const { action, service } = req.body;

        if (!validActions.includes(action) || !services.includes(service)) {
            return res.status(400).json({ error: 'Invalid or missing action or service' });
        }

        try {
            // SECURITY FIX: 
            // 1. Removed 'daemon-reload' (requires high privs).
            // 2. Used execFile with 'sudo' as the binary and arguments passed separately.
            // 3. Ensure full path to binaries (/usr/bin/sudo, /bin/systemctl) to avoid path hijacking.
            const { stdout, stderr } = await execFilePromise('/usr/bin/sudo', ['/bin/systemctl', action, `${service}.service`]);

            if (stderr) {
                // Note: systemctl sometimes writes warnings to stderr even on success. 
                // You might want to log this server-side instead of returning it.
                console.warn(`Service control stderr: ${stderr}`);
            }

            res.status(200).json({
                message: `Service ${service} ${action}ed successfully`,
                output: stdout,
            });
        } catch (error) {
            // SECURITY: Do not leak raw system errors to the client.
            const errorMsg = error?.message?.toString()?.includes("not found") ?
                `Service ${service} does not exist.` :
                "Failed to execute service command.";

            console.error(error); // Log the real error server-side
            res.status(500).json({ error: errorMsg });
        }
    } else {
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
}