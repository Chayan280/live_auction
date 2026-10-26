// Shared API helpers used by every page and component.
// For hosting later, create frontend/.env with:  VITE_API_URL=https://your-server.com/api
export const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
// Shown when a player's photo is missing or fails to load (built in, so it needs no internet).
export const PLACEHOLDER = `data:image/svg+xml,${encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='400' height='500'><rect width='100%' height='100%' fill='#1f2937'/><text x='50%' y='50%' fill='#6b7280' font-family='sans-serif' font-size='30' text-anchor='middle'>No Photo</text></svg>")}`;

export const currency = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

export const imageUrl = (url) => {
  if (!url || url === 'N/A') return PLACEHOLDER;
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return match ? `${API}/image-proxy?url=${encodeURIComponent(`https://lh3.googleusercontent.com/d/${match[1]}=w800`)}` : url;
};

export async function api(path, options) {
  const response = await fetch(`${API}${path}`, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}
