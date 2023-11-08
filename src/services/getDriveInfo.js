import axios from "axios"

export const getDriveInfo = async () => {
    try {

        const headers = {
            'content-type': 'application/json',
        };
        const requestBody = {
            query: `query {
            drives {
                capacity
                used
                free
            }
        }`
        };
        const options = {
            method: 'POST',
            url: 'http://localhost:4000/drives',
            headers,
            data: requestBody
        };
        const response = await axios(options);
        console.log(response?.data?.data?.drives)
        return { ok: true, data: response?.data?.data?.drives }
    } catch (error) {
        throw new Error(error.message)
    }
}