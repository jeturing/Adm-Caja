const apiUrl = (method: string): string => {
  return `http://127.0.0.1:8001/${method}`;
};

export default apiUrl;
