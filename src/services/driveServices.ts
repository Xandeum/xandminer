import axios from "axios";
import { API_BASE_URL } from "../CONSTS";


// POST request to dedicate space
export const dedicateSpace = async (space, path) => {

    try {
        const headers = {
            'content-type': 'application/json',
        };

        const options = {
            method: 'POST',
            url: `${API_BASE_URL}/drive/dedicate`,
            headers,
            data: { space, path },
        };

        const response = await axios(options);
        if (response?.data?.data?.ok) {
            return { ok: true, path: response?.data?.data?.path }
        }
        console.log("error >>> ", response?.data)
        return { ok: false, error: response?.data?.error }
    } catch (error) {
        console.log("errorrr >>> ", error?.response?.data)
        return { ok: false, error: error?.response?.data }
    }
}
