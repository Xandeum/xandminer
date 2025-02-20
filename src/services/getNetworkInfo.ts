import axios from "axios"
import { API_BASE_URL } from "CONSTS";
export const getNetworkInfo = async () => {
    console.log("calling getNetworkInfo")
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
        return { ok: true, data: response?.data?.data }
    } catch (error) {
        return { ok: false, error: error.message }
    }
}
