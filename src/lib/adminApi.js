import axios from 'axios';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_ADMIN_API_URL ||
  (typeof window !== 'undefined'
    ? `${window.location.origin}/api/admin`
    : 'http://localhost:3000/api/admin');

export const adminApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

adminApi.interceptors.request.use((config) => {
  if (config.data instanceof FormData) delete config.headers['Content-Type'];
  return config;
});

adminApi.interceptors.response.use(
  (res) => res,
  (err) => {
    const method = err.config?.method?.toUpperCase();
    const url = err.config?.url;
    const status = err.response?.status;
    const apiError = err.response?.data?.error || err.response?.data?.message;
    return Promise.reject(err);
  }
);

// Dashboard
export const getDashboardStats = () => adminApi.get('/dashboard');
export const getRecentEnquiries = () => adminApi.get('/dashboard?type=recent-enquiries');

// Rent
export const getRentProperties = () => adminApi.get('/rent');
export const createRentProperty = (data) => adminApi.post('/rent', data);
export const updateRentProperty = (id, data) => adminApi.put(`/rent/${id}`, data);
export const deleteRentProperty = (id) => adminApi.delete(`/rent/${id}`);

// Sale
export const getSaleProperties = () => adminApi.get('/sale');
export const createSaleProperty = (data) => adminApi.post('/sale', data);
export const updateSaleProperty = (id, data) => adminApi.put(`/sale/${id}`, data);
export const deleteSaleProperty = (id) => adminApi.delete(`/sale/${id}`);
export const uploadDrawingImage = (id, file) => {
  const fd = new FormData();
  fd.append('drawing_image', file);
  return adminApi.put(`/sale/${id}`, fd);
};

// Buyers
export const getBuyers = () => adminApi.get('/buyers');
export const updateBuyer = (id, data) => adminApi.put(`/buyers/${id}`, data);
export const getBuyerEnquiries = (id) => adminApi.get(`/buyers/${id}?sub=enquiries`);

// Sellers
export const getSellers = (type) => adminApi.get('/sellers', { params: type ? { type } : {} });
export const createSeller = (data) => adminApi.post('/sellers', data);
export const updateSeller = (id, data) => adminApi.put(`/sellers/${id}`, data);
export const getSellerDropdown = (search = '') => adminApi.get('/sellers', { params: { search } });
export const getSellerProperties = (id) => adminApi.get(`/sellers/${id}?sub=properties`);

// Enquiries
export const getEnquiries = (type, enquiryType) => {
  const params = {};
  if (type) params.type = type;
  if (enquiryType) params.enquiryType = enquiryType;
  return adminApi.get('/enquiries', { params });
};
export const createEnquiry = (data) => adminApi.post('/enquiries', data);
export const updateEnquiry = (id, data) => adminApi.put(`/enquiries/${id}`, data);

// Bookings
export const getBookings = (type, status) => {
  const params = {};
  if (type) params.type = type;
  if (status) params.status = status;
  return adminApi.get('/bookings', { params });
};

// Locations
export const getAllDistricts = () => adminApi.get('/locations/districts');
export const getTaluksByDistrict = (id) => adminApi.get(`/locations/taluks/${id}`);
export const getVillagesByTaluk = (id) => adminApi.get(`/locations/villages/${id}`);
export const updateDistrict = (id, data) => adminApi.put(`/locations/districts`, [{ district_id: id, ...data }]);
export const updateTaluk = (id, data) => adminApi.put(`/locations/taluks/${id}`, data);
export const updateVillage = (id, data) => adminApi.put(`/locations/villages/${id}`, data);
export const bulkUpdateDistrictCoords = (items) => adminApi.put('/locations/districts', items);
export const bulkUpdateTalukCoords = (items) => adminApi.put('/locations/taluks/bulk', items);
export const bulkUpdateVillageCoords = (items) => adminApi.put('/locations/villages/bulk', items);

// Locations uploads
export const uploadDistricts = (file) => {
  const fd = new FormData();
  fd.append('file', file);
  return adminApi.post('/locations/districts/upload', fd);
};
export const uploadTaluks = (file) => {
  const fd = new FormData();
  fd.append('file', file);
  return adminApi.post('/locations/taluks/upload', fd);
};
export const uploadVillages = (file) => {
  const fd = new FormData();
  fd.append('file', file);
  return adminApi.post('/locations/villages/upload', fd);
};

// Site Content — Headings
export const getContentHeadings = () => adminApi.get('/site-content/headings');
export const updateContentHeading = (key, value) => adminApi.put('/site-content/headings', { key, value });

// Site Content — Booking Flow
export const getAdminBookingFlow = (type) => adminApi.get('/site-content/flow', { params: { type } });
export const addAdminStage = (flowType, { stageKey, title, timeframe, nextLabel }) =>
  adminApi.post('/site-content/flow', { flowType, stageKey, title, timeframe, nextLabel });
export const updateAdminStage = (id, data) => adminApi.put(`/site-content/stages/${id}`, data);
export const deleteAdminStage = (id) => adminApi.delete(`/site-content/stages/${id}`);

// Site Content — Subtitles
export const addAdminSubtitle = (stageId, text) => adminApi.post('/site-content/subtitles', { stageId, text });
export const updateAdminSubtitle = (id, text) => adminApi.put(`/site-content/subtitles/${id}`, { text });
export const deleteAdminSubtitle = (id) => adminApi.delete(`/site-content/subtitles/${id}`);

// Site Content — Points
export const addAdminPoint = (stageId, text) => adminApi.post('/site-content/points', { stageId, text });
export const updateAdminPoint = (id, text) => adminApi.put(`/site-content/points/${id}`, { text });
export const deleteAdminPoint = (id) => adminApi.delete(`/site-content/points/${id}`);

// Site Content — Services
export const getContentServices = () => adminApi.get('/site-content/services');
export const addContentService = (stageKey, flowType, text) => adminApi.post('/site-content/services', { stageKey, flowType, text });
export const updateContentService = (id, text) => adminApi.put(`/site-content/services/${id}`, { text });
export const deleteContentService = (id) => adminApi.delete(`/site-content/services/${id}`);

// Premium
export const getPremiumProperties = ({ type, filter } = {}) => {
  const params = {};
  if (type) params.type = type;
  if (filter) params.filter = filter;
  return adminApi.get('/premium', { params });
};
export const addPremiumProperty = (data) => adminApi.post('/premium', data);
export const requestPremiumProperty = (property_id) => adminApi.post('/premium', { property_id, request_only: true });
export const updatePremiumProperty = (id, data) => adminApi.put(`/premium/${id}`, data);
export const removePremiumProperty = (id) => adminApi.delete(`/premium/${id}`);

// Plot / Flat projects
export const getPlotProperties = () => adminApi.get('/plot-projects');
export const getPlotLayout = (id) => adminApi.get(`/plot-units/${id}`);
export const savePlotLayout = (id, elements) => adminApi.post(`/plot-units/${id}`, { elements });
export const getFlatProperties = () => adminApi.get('/flat-projects');
export const getFlatLayout = (id) => adminApi.get(`/flat-units/${id}`);
export const saveFlatLayout = (id, elements) => adminApi.post(`/flat-units/${id}`, { elements });

// Bulk plot unit status update by label/plot_number
export const bulkUpdatePlotStatuses = (propertyId, statusLabels) =>
  adminApi.put('/plot-units-bulk-status', { property_id: propertyId, ...statusLabels });

// Image blur edit — server applies blur to specified regions and re-uploads
export const blurImageRegions = (assetId, blurRegions) =>
  adminApi.post('/property-assets/blur', { asset_id: assetId, blur_regions: blurRegions });

// Site Content — Gallery
export const getAdminGalleryImages = () => adminApi.get('/site-content/gallery');
export const uploadGalleryImage = (formData) => adminApi.post('/site-content/gallery', formData);
export const updateGalleryImageById = (id, data) => adminApi.patch(`/site-content/gallery/${id}`, data);
export const deleteGalleryImageById = (id) => adminApi.delete(`/site-content/gallery/${id}`);

// Contact Notes
export const getContactNotes = (params) => adminApi.get('/contact-notes', { params });
export const createContactNote = (data) => adminApi.post('/contact-notes', data);
export const deleteContactNote = (id) => adminApi.delete(`/contact-notes/${id}`);

// Individual Plot / Flat unit CRUD
export const getAllPlotUnits = () => adminApi.get('/plot-unit-list');
export const updatePlotUnit = (id, data) => adminApi.put(`/plot-unit-list/${id}`, data);
export const deletePlotUnit = (id) => adminApi.delete(`/plot-unit-list/${id}`);
export const getAllFlatUnits = () => adminApi.get('/flat-unit-list');
export const updateFlatUnit = (id, data) => adminApi.put(`/flat-unit-list/${id}`, data);
export const deleteFlatUnit = (id) => adminApi.delete(`/flat-unit-list/${id}`);
