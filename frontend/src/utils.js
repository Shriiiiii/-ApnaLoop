// Shared utility for resolving image URLs
// In development (Vite proxy), /uploads/ paths go through the proxy to localhost:8000
// In production, the API_URL env var points to the deployed backend

const API_URL = import.meta.env.VITE_API_URL || '';

export function getImageUrl(url) {
    if (!url) return '';
    if (url.startsWith('/uploads/')) return `${API_URL}${url}`;
    return url;
}
