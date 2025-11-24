import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

export default async function handler(req, res) {
    const services = ['xandminer', 'xandminerd', 'pod'];
    const validActions = ['start', 'stop'];

    if (req.method === 'GET') {
        // Handle status check for all services
        try {
            const statusPromises = services.map(async (service) => {
                const command = `systemctl is-active ${service}.service`;
                try {
                    const { stdout, stderr } = await execPromise(command);
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
                    return { service, status: 'unknown', rawStatus: error.message };
                }
            });

            const results = await Promise.all(statusPromises);
            const statusObject = results.reduce((acc, { service, status }) => {
                acc[service] = status;
                return acc;
            }, {});

            res.status(200).json(statusObject);
        } catch (error) {
            res.status(500).json({ error: `Failed to get service statuses: ${error.message}` });
        }
    } else if (req.method === 'POST') {
        // Handle start/stop/restart/reload actions
        const { action, service } = req.body;

        if (!validActions.includes(action) || !services.includes(service)) {
            return res.status(400).json({ error: 'Invalid or missing action or service' });
        }

        try {
            const command = `systemctl daemon-reload && sudo systemctl ${action} ${service}.service`;
            const { stdout, stderr } = await execPromise(command);

            if (stderr) {
                return res.status(500).json({ error: `Command error: ${stderr}` });
            }

            res.status(200).json({
                message: `Service ${service} ${action}ed successfully`,
                output: stdout,
            });
        } catch (error) {
            let errorMsg = error?.message?.toString()?.includes("not found") ?
                `Service ${service} does not exist. Please ensure you have updated to the latest version.` :
                error.message;
            res.status(500).json(`${errorMsg}`);
        }
    } else {
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
}