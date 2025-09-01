// frontend/src/utils/barcodesApi.js
import api from './axiosConfig'; // unified gateway-backed axios instance

// --- Barcode Endpoints ---
// NOTE: All paths are now under /api/* (gateway proxies to the barcode service)

export const getBarcodeByCode = async (code) => {
  const { data } = await api.get(`/api/barcodes/${encodeURIComponent(code)}`);
  return data;
};

export const assignBarcodeToItem = async (code, itemId, clientId, sym) => {
  const { data } = await api.post('/api/barcodes/assign', {
    code,
    item_id: itemId,
    client_id: clientId,
    symbology: sym ?? '',
  });
  return data;
};

// --- Scan Endpoint ---
export const postScan = async (code, clientId) => {
  const { data } = await api.post('/api/scan', {
    code,
    client_id: clientId,
  });
  return data;
};
