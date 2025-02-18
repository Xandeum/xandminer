import axios from "axios"

//  POST request to create keypair
export const createKeypair = async (API_ENDPOINT) => {
    try {
        const headers = {
            'content-type': 'application/json',
        };
        const options = {
            method: 'POST',
            url: `${API_ENDPOINT}/keypair/generate`,
            headers,
        };
        const response = await axios(options);
        return { ok: true, data: response?.data?.data?.createKeypair }
    } catch (error) {
        return { ok: false, error: error.message }
    }
}
