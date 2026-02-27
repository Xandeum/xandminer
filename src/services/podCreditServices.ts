import axios from "axios";


export const fetchPodsCredits = async () => {

    try {
        const response = await axios.get("api/mainnet-pod-credits");

        if (response.status !== 200) {
            throw new Error(`HTTP error! Status: ${response.status}`)
        }
        return response.data;
    } catch (error) {
        console.error("Fetch pods credits error:", error);
        throw error;
    }
}

export const fetchDevnetPodsCredits = async () => {

    try {
        const response = await axios.get("api/pods-credits");

        if (response.status !== 200) {
            throw new Error(`HTTP error! Status: ${response.status}`)
        }
        return response.data;
    } catch (error) {
        console.error("Fetch pods credits error:", error);
        throw error;
    }
}