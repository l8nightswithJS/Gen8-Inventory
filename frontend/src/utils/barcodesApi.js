import axios from './axiosConfig'; // This is the main axios instance

// Create a new, separate axios instance specifically for the barcode service
const barcodeAxios = axios.create({
  baseURL: `${process.env.REACT_APP_BARCODE_API_URL}/api`,
});

// We need to add the auth token to every request for this new instance
barcodeAxios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// --- Barcode Endpoints ---

export const getBarcodeByCode = async (code) => {
  const response = await barcodeAxios.get(`/barcodes/${code}`);
  return response.data;
};

export const assignBarcodeToItem = async (code, itemId, clientId, sym) => {
  const response = await barcodeAxios.post('/barcodes/assign', {
    code,
    item_id: itemId,
    client_id: clientId,
    symbology: sym,
  });
  return response.data;
};

// --- Scan Endpoint ---

export const postScan = async (code, clientId) => {
  const response = await barcodeAxios.post('/scan', {
    code,
    client_id: clientId,
  });
  return response.data;
};
