import axios from "axios";

// Retrieve the API Key from environment variables
const API_KEY = process.env.NEXT_PUBLIC_XANDMINER_API_KEY;

// POST request to call api service to start or stop a service
export const callService = async (action: string, service: string) => {
    try {
        const headers = {
            'content-type': 'application/json',
            'x-api-key': API_KEY || '', // Attach the API Key to the request
        };

        const options = {
            method: 'POST',
            url: 'api/service',
            headers,
            data: { action, service },
        };

        const response = await axios(options);
        if (response?.data) {
            return { ok: true, data: response.data }
        }
        return { ok: false, error: 'No data returned from service' }
    } catch (error) {
        return { ok: false, error: error?.response?.data || error.message }
    }
}

// GET request to check the status of all services
export const getServiceStatus = async () => {
    try {
        const headers = {
            'content-type': 'application/json',
            'x-api-key': API_KEY || '', // Attach the API Key to the request
        };
        const options = {
            method: 'GET',
            url: 'api/service',
            headers,
        };
        const response = await axios(options);
        if (response?.data) {
            return { ok: true, data: response.data }
        }
        return { ok: false, error: 'No data returned from service' }
    } catch (error) {
        return { ok: false, error: error?.response?.data || error.message }
    }
}