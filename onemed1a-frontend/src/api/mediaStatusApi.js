import apiClient from "./apiClient.js";


export async function uppsertMediaStatus(UserMediaStatus) {
    const response = await apiClient.post("/api/v1/usermedia", UserMediaStatus);
    return response.data;
}

export async function deleteMediaStatus(statusId) {
    const response = await apiClient.delete(`/api/v1/usermedia/${statusId}/`);
    return response.data;
}