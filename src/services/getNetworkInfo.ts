import axios from "axios"
import { API_BASE_URL } from "CONSTS";
export const getNetworkInfo = async () => {
    try {

        const headers = {
            'content-type': 'application/json',
        };

        const options = {
            method: 'GET',
            url: `${API_BASE_URL}/network`,
            headers,
        };
        const response = await axios(options);

        if (response?.data?.error) {
            return { ok: false, error: response.data.error };
        }
        return { data: response.data, ok: true, };

    } catch (error) {
        return { ok: false, error: error.message }
    }
}
