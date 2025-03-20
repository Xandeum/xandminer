import axios from "axios"
import { API_BASE_URL } from "../CONSTS";

//  POST request to create keypair
export const createKeypair = async () => {
    try {
        const headers = {
            'content-type': 'application/json',
        };
        const options = {
            method: 'POST',
            url: `${API_BASE_URL}/keypair/generate`,
            headers,
        };
        const response = await axios(options);
        return { ok: true, data: response?.data?.data?.createKeypair }
    } catch (error) {
        return { ok: false, error: error.message }
    }
}

// GET request to get keypair status
export const getKeypair = async () => {
    try {
        const headers = {
            'content-type': 'application/json',
        };
        const options = {
            method: 'GET',
            url: `${API_BASE_URL}/keypair`,
            headers,
        };
        const response = await axios(options);
        return { ok: true, data: response?.data?.publicKey }
    } catch (error) {
        console.log("error in reading keypair >>> ", error);
        return { ok: false, error: error.message }
    }
}

// read server IP
export const getServerIP = async () => {
    try {
        const headers = {
            'content-type': 'application/json',
        };
        const options = {
            method: 'GET',
            url: `${API_BASE_URL}/server-ip`,
            headers,
        };
        const response = await axios(options);
        return { ok: true, ip: response?.data?.ip }
    } catch (error) {
        console.log("error in reading server ip >>> ", error);
        return { ok: false, error: error.message }
    }
}
