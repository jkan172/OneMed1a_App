import apiClient from "./apiClient.js";

/**
 * Suggest helper. Accepts optional opts { signal } to cancel requests.
 */
export async function suggest(text, opts = {}) {
    const response = await apiClient.get(`/media/suggest`, {
        params: { q: text },
        signal: opts.signal,
    });
    return response.data;
}
