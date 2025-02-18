import axios from "axios"
export const getDriveInfo = async (API_ENDPOINT) => {
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
            // url: `${API_ENDPOINT}drives`,
            url: `${API_ENDPOINT}/drives`,
            // url: 'https://nixagent.xandeum.com/drives',
            // url: 'http://localhost:4000/drives',
            headers,
            // data: requestBody
        };
        const response = await axios(options);
        // console.log(response?.data?.data?.drives)

        return { ok: true, data: response?.data?.data?.drives }
        // return { ok: true, data: response?.data?.data }
    } catch (error) {
        throw new Error(error.message)
    }
}
