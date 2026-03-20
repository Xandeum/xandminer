import axios from "axios";
import { API_BASE_URL } from "../CONSTS";

// SECURITY: Validation helper to prevent Command Injection.
// We strictly allow only alphanumeric characters, slashes, dots, hyphens, and underscores.
// This blocks shell metacharacters like ';', '&', '|', '$', '>', etc.
const isSafeInput = (input: any) => {
    if (typeof input !== 'string' && typeof input !== 'number') return false;
    const str = input.toString();
    // Regex allows: a-z, A-Z, 0-9, /, ., _, -
    return /^[a-zA-Z0-9_\-\.\/]+$/.test(str);
};

// POST request to dedicate space
export const dedicateSpace = async (space, path) => {

    // SECURITY: Validate inputs before sending
    if (!isSafeInput(path)) {
        console.error("Security Block: Invalid characters detected in path.");
        return { ok: false, error: "Invalid path format. Only alphanumeric characters, '/', '.', '_', and '-' are allowed." };
    }

    if (!isSafeInput(space)) {
        console.error("Security Block: Invalid characters detected in space parameter.");
        return { ok: false, error: "Invalid space format." };
    }

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
        return { ok: false, error: response?.data?.error }
    } catch (error) {
        return { ok: false, error: error?.response?.data }
    }
}