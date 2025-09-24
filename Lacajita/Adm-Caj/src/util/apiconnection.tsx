export const apiUrl = (method: string) => {
  const base = import.meta.env.DEV
    ? '/api'
    : (import.meta.env.VITE_API_BASE_URL || '/api');
  const clean = (method || '').toString().replace(/^\/+/, '');
  return `${base}/${clean}`;
};

