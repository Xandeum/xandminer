import axios from "axios";
import { API_BASE_URL } from "../CONSTS";

// POST request to create pnode
export const createPnode = async (pubKey: string) => {

    try {
        const headers = {
            'content-type': 'application/json',
        };

        const options = {
            method: 'POST',
            url: `${API_BASE_URL}/pnode`,
            headers,
            // data: { pubKey: "9eVnceJcJFmdPiyNgFx1gQcqkLego5J4Pkmgoog4BDoU" },
            data: { pubKey },
        };

        const response = await axios(options);
        if (response?.data?.ok) {
            return { ok: true, data: response?.data?.tx }
        }
        console.log("error >>> ", response?.data)
        return { ok: false, error: response?.data?.error }
    } catch (error) {
        console.log("errorrr >>> ", error?.response?.data)
        return { ok: false, error: error?.response?.data }
    }
}

// GET request to get pnode status
export const getPnode = async () => {
    try {
        const headers = {
            'content-type': 'application/json',
        };
        const options = {
            method: 'GET',
            url: `${API_BASE_URL}/pnode`,
            headers,
        };
        const response = await axios(options);
        return { ok: true, data: response?.data }
    } catch (error) {
        return { ok: false, error: error.message }
    }
}