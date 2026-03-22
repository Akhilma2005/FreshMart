const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const BACKEND = process.env.REACT_APP_API_URL
  ? process.env.REACT_APP_API_URL.replace('/api', '')
  : 'http://localhost:5000';

export const imgUrl = (src) => {
  if (!src) return '';
  if (src.startsWith('http://localhost:5000')) return src.replace('http://localhost:5000', BACKEND);
  if (src.startsWith('/uploads/')) return `${BACKEND}${src}`;
  return src;
};

export default API;
