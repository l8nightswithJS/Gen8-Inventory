// src/utils/barcodesApi.js
import axios from '../utils/axiosConfig';

export const lookupBarcode = async ({ code, clientId }) => {
  const { data } = await axios.get('/api/barcodes/lookup', {
    params: { code, client_id: clientId },
  });
  return data;
};

export const assignBarcode = async ({
  clientId,
  itemId,
  barcode,
  symbology,
}) => {
  const { data } = await axios.post('/api/barcodes', {
    client_id: clientId,
    item_id: itemId,
    barcode,
    symbology,
  });
  return data;
};

export const listItemBarcodes = async (itemId) => {
  const { data } = await axios.get(`/api/barcodes/items/${itemId}`);
  return data;
};

export const deleteBarcode = async (id) => {
  const { data } = await axios.delete(`/api/barcodes/${id}`);
  return data;
};
