import axios from "axios"
import { API_BASE_URL } from "../CONSTS";

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
        return { ok: true, ip: response?.data?.data?.ip, hostname: response?.data?.data?.hostname }
    } catch (error) {
        console.log("error in reading server ip >>> ", error);
        return { ok: false, error: error.message }
    }
}

// read xandminderd and pod version
export const getVersions = async () => {
    try {
        const headers = {
            'content-type': 'application/json',
        };
        const options = {
            method: 'GET',
            url: `${API_BASE_URL}/versions`,
            headers,
        };
        const response = await axios(options);
        return { ok: true, data: response?.data?.data }
    } catch (error) {
        console.log("error in reading versions >>> ", error);
        return { ok: false, error: error.message }
    }
}