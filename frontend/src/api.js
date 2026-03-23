const API = process.env.REACT_APP_API_URL || 'https://freshmart-1-z1ib.onrender.com/api';
export default API;

export async function fetchWithTimeout(url, options = {}, timeoutMs = 55000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    if (err.name === 'AbortError') {
      throw new Error('Server took too long to respond. Please try again.');
    }
    throw err;
  }
}
