import axios from "axios"
export const getNetworkInfo = async (API_ENDPOINT) => {
    console.log("calling getNetworkInfo")
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
            method: 'GET',
            url: `${API_ENDPOINT}network`,
            // url: 'http://localhost:4000/drives',
            headers,
            data: requestBody
        };
        const response = await axios(options);
        return { ok: true, data: response?.data?.data }
    } catch (error) {
        throw new Error(error.message)
    }
}
