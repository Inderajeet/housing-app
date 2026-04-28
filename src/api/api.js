import axios from 'axios';
import { matchesPropertyIdentifier, normalizeCategory, normalizeMode } from '../utils/propertyRouting';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' ? `${window.location.origin}/api/frontend` : 'http://localhost:3000/api/frontend');

export const apiClient = axios.create({ baseURL: BASE_URL });

export const endpoints = {
  getDistricts: () => apiClient.get('/locations/districts'),
  getTaluks: (districtId) => apiClient.get(`/locations/taluks/${districtId}`),
  getVillages: (talukId) => apiClient.get(`/locations/villages/${talukId}`),

  getProperties: (mode, type = null) => {
    const normalizedMode = normalizeMode(mode);
    const normalizedType = normalizeCategory(type);

    if (normalizedMode === 'rent') {
      return normalizedType
        ? apiClient.get(`/rent/${normalizedType}`)
        : apiClient.get('/rent');
    }

    return normalizedType
      ? apiClient.get(`/sale/${normalizedType}`)
      : apiClient.get('/sale');
  },

  getPropertyByIdentifier: async ({ mode, category, identifier }) => {
    const modesToTry = mode ? [normalizeMode(mode)] : ['rent', 'sale'];
    const normalizedCategory = normalizeCategory(category);

    for (const currentMode of modesToTry) {
      const requests = normalizedCategory
        ? [
            () => endpoints.getProperties(currentMode, normalizedCategory),
            () => endpoints.getProperties(currentMode),
          ]
        : [() => endpoints.getProperties(currentMode)];

      for (const request of requests) {
        try {
          const response = await request();
          const properties = response?.data?.data || [];
          const matchedProperty = properties.find((property) =>
            matchesPropertyIdentifier(property, identifier)
          );
          if (matchedProperty) return matchedProperty;
        } catch {
        }
      }
    }

    throw new Error('Property not found');
  },

  createProperty: (mode, data) => apiClient.post(`/${mode.toLowerCase()}`, data),
  updateProperty: (mode, id, data) => apiClient.put(`/${mode.toLowerCase()}/${id}`, data),
  uploadAsset: (propertyId, formData) => apiClient.post(`/property-assets/${propertyId}`, formData),

  getBookingFlowByPhone: ({ propertyId, unitType, unitId, phone }) =>
    apiClient.get('/booking-flow', { params: { propertyId, unitType, unitId, phone } }),

  updateBookingStage: (data) => apiClient.post('/booking-stage', data),

  getGeneralBookingFlow: ({ propertyId, unitType, unitId }) =>
    apiClient.get('/booking-general', { params: { propertyId, unitType, unitId } }),

  getSiteContent: (type) => apiClient.get('/site-content', { params: { type } }),

  getPlotLayout: (propertyId) => apiClient.get(`/plot-units/${propertyId}`),
  getFlatLayout: (propertyId) => apiClient.get(`/flat-units/${propertyId}`),

  getPremium: (params = {}) => {
    const cleanParams = Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ''));
    return apiClient.get('/premium', { params: cleanParams });
  },
};
