import axios from "axios";
import { API_BASE_URL } from "../CONSTS";

// POST request to get pnode status
export const getPnode = async (pubKey: string) => {

    try {
        const headers = {
            'content-type': 'application/json',
        };

        const options = {
            method: 'POST',
            url: `${API_BASE_URL}/pnode`,
            headers,
            data: { pubKey },
        };

        const response = await axios(options);
        if (response?.data?.ok) {
            return { ok: true, data: response?.data }
        }
        return { ok: false, error: response?.data?.error }
    } catch (error) {
        return { ok: false, error: error.message }
    }
}
