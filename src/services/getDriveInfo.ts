import axios from "axios"
import { API_BASE_URL } from "CONSTS";
export const getDriveInfo = async () => {
    try {

        const headers = {
            'content-type': 'application/json',
        };
        const requestBody = {
            query: `query {
            drives {
                name
                capacity
                used
                free
            }
        }`
        };
        const options = {
            method: 'POST',
            url: `${API_BASE_URL}/drives`,
            headers,
            // data: requestBody
        };
        const response = await axios(options);

        console.log("response >>> ", response?.data?.data?.drives)

        return { ok: true, data: response?.data?.data?.drives }

    } catch (error) {
        // throw new Error(error.message)
        return { ok: false, error: error.message }
    }
}
