'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import DataTable from '@/components/admin/DataTable';
import Loader from '@/components/admin/Loader';
import LocationSelector from '@/components/admin/LocationSelector';
import PropertyAssetsTabs from '@/components/admin/PropertyAssetsTabs';
import {
  getSaleProperties, createSaleProperty, updateSaleProperty, deleteSaleProperty,
  uploadDrawingImage, getAllDistricts, getTaluksByDistrict, getVillagesByTaluk, adminApi,
} from '@/lib/adminApi';
import { reverseGeocodeDetailed } from '@/utils/geocode';

const SaleStatus = { NIL_BOOKING: 'Nil Booking', ON_BOOKING: 'ON_BOOKING', BOOKED: 'BOOKED', SOLD: 'SOLD' };
const SaleType = { HOUSE: 'house', LAND: 'land', PLOT: 'plot', FLAT: 'flat' };
const STATUS_COLORS = {
  'Nil Booking': 'bg-emerald-100 text-emerald-700',
  'ON_BOOKING':  'bg-yellow-100 text-yellow-800',
  'CONFIRMED':   'bg-red-100 text-red-800',
  'UNREGISTERED':'bg-red-100 text-red-800',
  'REGISTERED':  'bg-red-100 text-red-800',
  'SOLD':        'bg-red-100 text-red-800',
  'BOOKED':      'bg-red-100 text-red-800',
};

const TOKEN_PAID_TO_OPTIONS = ['', 'Paid Us', 'Paid to Owner', 'Owner returned', 'Returned to buyer'];
const RATE_UNIT_OPTIONS = ['', 'sqft', 'cent'];
const EXTENT_UNIT_OPTIONS = ['', 'sqft', 'cent', 'sq.m', 'acre', 'ground', 'guntha', 'kanal', 'marla'];

const EMPTY_FORM = {
  contact_phone: '', seller_name: '', alternate_contact_phone: '', alternate_seller_name: '',
  title: '', address: '', latitude: '', longitude: '',
  district_id: '', taluk_id: '', village_id: '',
  status: 'pending', sale_type: SaleType.LAND, price: '', rate_unit: '', extension: '', area_size: '',
  survey_number: '', street_name_or_road_name: '', layout_name: '',
  boundary_north: '', boundary_south: '', boundary_east: '', boundary_west: '',
  sale_status: SaleStatus.NIL_BOOKING, total_units_count: '', booked_units: '', open_units: '',
  description: '', dtcp: '', parent_document: '', sub_registrar_office: '', gift_deed: '',
  token_amount: '', token_paid_to: '', advance_amount: '', sold_rate: '', sold_date: '',
  area_speed: '', amenities_rating: '', utilities_rating: '', legal_rating: '',
};

const FORM_TABS = [
  { key: 'details', label: 'Details' },
  { key: 'seller', label: 'Seller' },
  { key: 'property-info', label: 'Property Info' },
  { key: 'legal', label: 'Legal' },
  { key: 'ratings', label: 'Ratings' },
  { key: 'images', label: 'Images' },
  { key: 'documents', label: 'Documents' },
];

const lbl = 'text-[10px] font-bold uppercase tracking-widest text-gray-500';
const fw = 'flex flex-col space-y-2';
const dd = 'px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all';

export default function SalePropertiesPage() {
  const [allProperties, setAllProperties] = useState([]);
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);
  const importFileRef = useRef();

  const [districts, setDistricts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [mode, setMode] = useState('add');
  const isReadOnly = mode === 'view';

  const [formTab, setFormTab] = useState('details');
  const [assets, setAssets] = useState([]);
  const [assetLoading, setAssetLoading] = useState(false);
  const [geocodingAddress, setGeocodingAddress] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({ dateRange: 'all', startDate: '', endDate: '', district_id: '', taluk_id: '', village_id: '', sale_type: 'all' });
  const [filterTaluks, setFilterTaluks] = useState([]);
  const [filterVillages, setFilterVillages] = useState([]);
  const [columnFilters, setColumnFilters] = useState({});

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);

  const [inlineEditId, setInlineEditId] = useState(null);
  const [inlineEditDraft, setInlineEditDraft] = useState({});
  const [inlineSaving, setInlineSaving] = useState(false);
  const [calcingAreaSpeed, setCalcingAreaSpeed] = useState(false);

  const handleInlineEdit = (p) => {
    setInlineEditId(p.property_id);
    setInlineEditDraft({ ...p, sold_date: p.sold_date ? String(p.sold_date).slice(0, 10) : '' });
  };
  const handleInlineCancel = () => { setInlineEditId(null); setInlineEditDraft({}); };
  const handleInlineDraftChange = (key, val) => setInlineEditDraft(prev => ({ ...prev, [key]: val }));
  const handleInlineSave = async () => {
    setInlineSaving(true);
    try {
      await updateSaleProperty(inlineEditId, inlineEditDraft);
      setAllProperties(prev => prev.map(p => p.property_id === inlineEditId ? { ...p, ...inlineEditDraft } : p));
      setInlineEditId(null);
    } catch (err) { alert('Failed: ' + (err?.response?.data?.error || err.message)); }
    finally { setInlineSaving(false); }
  };

  const showExtraFields = form.sale_type?.toUpperCase() === 'PLOT' || form.sale_type?.toUpperCase() === 'FLAT';
  const isNewProperty = !selected?.property_id;

  const inp = (f) => `w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold text-sm`;

  const tabBtnClass = (key) => {
    const isActive = formTab === key;
    const locked = isNewProperty && key !== 'details';
    return `py-3 px-1 text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${locked ? 'text-gray-300 cursor-not-allowed' : isActive ? 'border-b-2 border-emerald-600 text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`;
  };

  const fetchSale = async () => {
    setLoading(true);
    try {
      const res = await getSaleProperties();
      const data = res.data || res;
      setAllProperties(Array.isArray(data) ? data : []);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchSale(); }, []);
  useEffect(() => { getAllDistricts().then(r => setDistricts(r.data || [])).catch(() => {}); }, []);

  useEffect(() => {
    if (!filters.district_id) { setFilterTaluks([]); setFilterVillages([]); return; }
    getTaluksByDistrict(filters.district_id).then(r => setFilterTaluks(r.data || []));
  }, [filters.district_id]);

  useEffect(() => {
    if (!filters.taluk_id) { setFilterVillages([]); return; }
    getVillagesByTaluk(filters.taluk_id).then(r => setFilterVillages(r.data || []));
  }, [filters.taluk_id]);

  useEffect(() => {
    let result = [...allProperties];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        (p.formatted_id || '').toLowerCase().includes(q) ||
        (p.contact_phone || '').includes(q) ||
        (p.sale_type || '').toLowerCase().includes(q) ||
        String(p.price || '').includes(q)
      );
    }
    if (filters.sale_type !== 'all') result = result.filter(p => p.sale_type === filters.sale_type);
    if (filters.district_id) result = result.filter(p => Number(p.district_id) === Number(filters.district_id));
    if (filters.taluk_id) result = result.filter(p => Number(p.taluk_id) === Number(filters.taluk_id));
    if (filters.village_id) result = result.filter(p => Number(p.village_id) === Number(filters.village_id));
    if (filters.dateRange !== 'all') {
      const now = new Date(); const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
      result = result.filter(p => {
        if (!p.created_at) return false;
        const d = new Date(p.created_at);
        if (filters.dateRange === 'week') { const w = new Date(); w.setDate(now.getDate() - 7); w.setHours(0, 0, 0, 0); return d >= w && d <= todayEnd; }
        if (filters.dateRange === 'month') { const m = new Date(); m.setMonth(now.getMonth() - 1); m.setHours(0, 0, 0, 0); return d >= m && d <= todayEnd; }
        if (filters.dateRange === 'custom' && filters.startDate && filters.endDate) {
          const s = new Date(filters.startDate); s.setHours(0, 0, 0, 0);
          const e = new Date(filters.endDate); e.setHours(23, 59, 59, 999);
          return d >= s && d <= e;
        }
        return true;
      });
    }
    Object.entries(columnFilters).forEach(([key, val]) => {
      if (!val?.trim()) return;
      const q = val.trim().toLowerCase();
      result = result.filter(p => String(p[key] ?? '').toLowerCase().includes(q));
    });
    setFilteredProperties(result);
  }, [filters, allProperties, searchQuery, columnFilters]);

  const openModal = (property = null, modalMode = 'add') => {
    setSelected(property || null);
    setForm(property
      ? { ...EMPTY_FORM, ...Object.fromEntries(Object.entries(property).map(([k, v]) => [k, v ?? ''])) }
      : EMPTY_FORM);
    setMode(modalMode);
    setError('');
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (isModalOpen && selected?.property_id) {
      setAssetLoading(true);
      adminApi.get(`/property-assets/${selected.property_id}`).then(r => setAssets(r.data || [])).finally(() => setAssetLoading(false));
    } else { setAssets([]); setFormTab('details'); }
  }, [isModalOpen, selected]);

  const handleChange = (key, value) => {
    setForm(prev => {
      const updated = { ...prev, [key]: value ?? '' };
      if (showExtraFields && (key === 'total_units_count' || key === 'booked_units')) {
        const total = parseInt(key === 'total_units_count' ? value : prev.total_units_count);
        if (!isNaN(total) && total > 0) {
          const getBookedSet = (inp) => {
            const s = new Set(); if (!inp) return s;
            inp.toString().split(',').map(p => p.trim()).forEach(part => {
              if (part.includes('-')) { const [a, b] = part.split('-').map(Number); if (!isNaN(a) && !isNaN(b)) for (let i = Math.min(a, b); i <= Math.max(a, b); i++) s.add(i); }
              else { const n = Number(part); if (!isNaN(n)) s.add(n); }
            }); return s;
          };
          const bookedSet = getBookedSet(key === 'booked_units' ? value : prev.booked_units);
          const open = []; for (let i = 1; i <= total; i++) if (!bookedSet.has(i)) open.push(i);
          const getRng = (nums) => { if (!nums.length) return '0'; nums.sort((a, b) => a - b); const r = []; let s = nums[0], e = nums[0]; for (let i = 1; i <= nums.length; i++) { if (nums[i] === e + 1) { e = nums[i]; } else { r.push(s === e ? `${s}` : `${s}-${e}`); s = nums[i]; e = nums[i]; } } return r.join(', '); };
          updated.open_units = getRng(open);
        }
      }
      return updated;
    });
  };

  const handleCoordBlur = useCallback(async (latVal, lngVal) => {
    const lat = parseFloat(latVal), lng = parseFloat(lngVal);
    if (isNaN(lat) || isNaN(lng)) return;
    setGeocodingAddress(true);
    try {
      const geo = await reverseGeocodeDetailed(lat, lng);
      if (geo) {
        const update = { address: geo.address };
        if (geo.district && districts.length) {
          const matchedDistrict = districts.find(d =>
            d.district_name.toLowerCase().includes(geo.district.toLowerCase()) ||
            geo.district.toLowerCase().includes(d.district_name.toLowerCase())
          );
          if (matchedDistrict) {
            update.district_id = matchedDistrict.district_id;
            update.taluk_id = '';
            update.village_id = '';
            if (geo.taluk) {
              try {
                const taluks = (await getTaluksByDistrict(matchedDistrict.district_id)).data || [];
                const matchedTaluk = taluks.find(t =>
                  t.taluk_name.toLowerCase().includes(geo.taluk.toLowerCase()) ||
                  geo.taluk.toLowerCase().includes(t.taluk_name.toLowerCase())
                );
                if (matchedTaluk) {
                  update.taluk_id = matchedTaluk.taluk_id;
                  if (geo.village) {
                    try {
                      const villages = (await getVillagesByTaluk(matchedTaluk.taluk_id)).data || [];
                      const matchedVillage = villages.find(v =>
                        v.village_name.toLowerCase().includes(geo.village.toLowerCase()) ||
                        geo.village.toLowerCase().includes(v.village_name.toLowerCase())
                      );
                      if (matchedVillage) update.village_id = matchedVillage.village_id;
                    } catch {}
                  }
                }
              } catch {}
            }
          }
        }
        setForm(prev => {
          const merged = { ...prev, ...update };
          if (prev.district_id) { merged.district_id = prev.district_id; merged.taluk_id = prev.taluk_id; merged.village_id = prev.village_id; }
          return merged;
        });
      }
    } catch {} finally { setGeocodingAddress(false); }
  }, [districts]);

  const handleCreate = async () => {
    if (!form.latitude || !form.longitude || isNaN(parseFloat(form.latitude)) || isNaN(parseFloat(form.longitude))) {
      alert('Latitude and longitude are required to create a property.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await createSaleProperty(form);
      const created = res.data || res.property || res;
      await fetchSale();
      setSelected(created);
      setMode('edit');
      setFormTab('seller');
    } catch (err) {
      alert('Failed: ' + (err?.response?.data?.error || err.message));
    }
    finally { setSubmitting(false); }
  };

  const handleUpdate = async () => {
    if (mode === 'view' || !selected?.property_id) return;
    setSubmitting(true);
    try {
      await updateSaleProperty(selected.property_id, form);
      await fetchSale();
    } catch (err) {
      alert('Failed: ' + (err?.response?.data?.error || err.message));
    }
    finally { setSubmitting(false); }
  };

  const handleCalcAreaSpeed = async () => {
    const lat = parseFloat(form.latitude), lng = parseFloat(form.longitude);
    if (isNaN(lat) || isNaN(lng)) { alert('Enter valid latitude and longitude first.'); return; }
    setCalcingAreaSpeed(true);
    try {
      const res = await adminApi.get('/sale/area-speed', { params: { lat, lng } });
      const speed = res.data?.area_speed;
      if (speed != null) setForm(prev => ({ ...prev, area_speed: String(speed) }));
      else alert('No sold properties found within 1km over the past 2 years.');
    } catch (err) { alert('Failed to calculate: ' + (err?.response?.data?.error || err.message)); }
    finally { setCalcingAreaSpeed(false); }
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      await Promise.all([...selectedIds].map(id => deleteSaleProperty(id)));
      await fetchSale();
      setSelectedIds(new Set());
      setShowBulkConfirm(false);
    } catch (err) { alert('Bulk delete failed: ' + err.message); }
    finally { setBulkDeleting(false); }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteSaleProperty(deleteTarget.property_id || deleteTarget.id);
      await fetchSale();
      setDeleteTarget(null);
    } catch (err) { alert('Failed to delete: ' + err.message); }
    finally { setDeleting(false); }
  };

  const handleExport = () => {
    const rows = filteredProperties.map(p => ({
      'contact_phone': p.contact_phone, 'seller_name': p.seller_name || '',
      'alternate_contact_phone': p.alternate_contact_phone || '', 'alternate_seller_name': p.alternate_seller_name || '',
      'latitude': p.latitude, 'longitude': p.longitude, 'address': p.address,
      'district_id': p.district_id, 'taluk_id': p.taluk_id, 'village_id': p.village_id,
      'status': p.status, 'sale_type': p.sale_type, 'price': p.price,
      'area_size': p.area_size, 'survey_number': p.survey_number,
      'street_name_or_road_name': p.street_name_or_road_name, 'layout_name': p.layout_name || '',
      'sale_status': p.sale_status,
      'boundary_north': p.boundary_north, 'boundary_south': p.boundary_south,
      'boundary_east': p.boundary_east, 'boundary_west': p.boundary_west,
      'description': p.description, 'dtcp': p.dtcp || '', 'parent_document': p.parent_document || '',
      'sub_registrar_office': p.sub_registrar_office || '', 'gift_deed': p.gift_deed || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sale_Inventory');
    XLSX.writeFile(wb, `Sale_Inventory_${new Date().toLocaleDateString()}.xlsx`);
  };

  const handleImportFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    let created = 0, skipped = 0, failed = 0;
    try {
      const ab = await file.arrayBuffer();
      const wb = XLSX.read(ab);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json(ws, { defval: '' });
      const rows = rawRows.map(raw => {
        const normalized = {};
        Object.entries(raw).forEach(([k, v]) => { normalized[k.trim().toLowerCase().replace(/\s+/g, '_')] = v; });
        return normalized;
      });

      for (const row of rows) {
        const lat = parseFloat(row.latitude);
        const lng = parseFloat(row.longitude);
        if (isNaN(lat) || isNaN(lng)) { skipped++; continue; }

        const duplicate = allProperties.some(p => {
          const pLat = parseFloat(p.latitude); const pLng = parseFloat(p.longitude);
          return !isNaN(pLat) && !isNaN(pLng) && Math.abs(pLat - lat) < 0.0001 && Math.abs(pLng - lng) < 0.0001;
        });
        if (duplicate) { skipped++; continue; }

        try {
          let address = row.address || '', district_id = row.district_id || null, taluk_id = row.taluk_id || null, village_id = row.village_id || null;
          const geo = await reverseGeocodeDetailed(lat, lng);
          if (geo) {
            if (!address) address = geo.address || '';
            if (!district_id && geo.district && districts.length) {
              const matchedDistrict = districts.find(d =>
                d.district_name.toLowerCase().includes(geo.district.toLowerCase()) ||
                geo.district.toLowerCase().includes(d.district_name.toLowerCase())
              );
              if (matchedDistrict) {
                district_id = matchedDistrict.district_id;
                if (!taluk_id && geo.taluk) {
                  try {
                    const taluks = (await getTaluksByDistrict(district_id)).data || [];
                    const matchedTaluk = taluks.find(t => t.taluk_name.toLowerCase().includes(geo.taluk.toLowerCase()) || geo.taluk.toLowerCase().includes(t.taluk_name.toLowerCase()));
                    if (matchedTaluk) {
                      taluk_id = matchedTaluk.taluk_id;
                      const villageSearch = geo.village || row.village || '';
                      if (!village_id && villageSearch) {
                        try {
                          const villages = (await getVillagesByTaluk(taluk_id)).data || [];
                          const matchedVillage = villages.find(v => v.village_name.toLowerCase().includes(villageSearch.toLowerCase()) || villageSearch.toLowerCase().includes(v.village_name.toLowerCase()));
                          if (matchedVillage) village_id = matchedVillage.village_id;
                        } catch {}
                      }
                    }
                  } catch {}
                }
              }
            }
          }

          const splitField = (val) => String(val || '').split(',').map(s => s.trim()).filter(Boolean);
          const phones = splitField(row.contact_phone); const names = splitField(row.seller_name);
          await createSaleProperty({
            contact_phone: phones[0] || '', seller_name: names[0] || '',
            alternate_contact_phone: row.alternate_contact_phone ? String(row.alternate_contact_phone).trim() : (phones[1] || ''),
            alternate_seller_name: row.alternate_seller_name ? String(row.alternate_seller_name).trim() : (names[1] || ''),
            latitude: lat, longitude: lng, address, district_id, taluk_id, village_id,
            status: row.status || 'pending', sale_type: row.sale_type || SaleType.LAND,
            price: row.price || '', area_size: row.area_size || '',
            survey_number: String(row.survey_number || ''), street_name_or_road_name: row.street_name_or_road_name || '',
            layout_name: row.layout_name || '', sale_status: row.sale_status || SaleStatus.NIL_BOOKING,
            boundary_north: row.boundary_north || '', boundary_south: row.boundary_south || '',
            boundary_east: row.boundary_east || '', boundary_west: row.boundary_west || '',
            description: row.description || '', dtcp: String(row.dtcp || ''),
            parent_document: String(row.parent_document || ''), sub_registrar_office: row.sub_registrar_office || '',
            gift_deed: String(row.gift_deed || ''), property_use: 'sale',
          });
          created++;
        } catch { failed++; }
      }
      alert(`Import complete: ${created} created, ${skipped} skipped, ${failed} failed.`);
      await fetchSale();
    } catch (err) { alert('Failed to read file: ' + err.message); }
    finally { setImporting(false); if (importFileRef.current) importFileRef.current.value = ''; }
  };

  const resetFilters = () => {
    setFilters({ dateRange: 'all', sale_type: 'all', district_id: '', taluk_id: '', village_id: '', startDate: '', endDate: '' });
    setSearchQuery('');
    setColumnFilters({});
  };

  const handleColumnFilterChange = (key, value) => {
    setColumnFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Sale Inventory</h2>
          <p className="text-gray-500 text-xs uppercase tracking-widest font-bold">Manage Listings</p>
        </div>
        <div className="flex gap-3 flex-wrap justify-end">
          <input ref={importFileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportFile} />
          <button onClick={() => importFileRef.current.click()} disabled={importing} className="bg-white border border-blue-300 text-blue-700 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-blue-50 disabled:opacity-60">
            {importing ? 'Importing…' : 'Import Excel'}
          </button>
          <button onClick={handleExport} className="bg-white border border-gray-300 text-gray-700 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-50">
            Export Excel
          </button>
          <button onClick={() => openModal(null, 'add')} className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-emerald-200 hover:bg-emerald-700">
            Add Sale Listing
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className={fw}>
            <label className={lbl}>Search</label>
            <div className="relative">
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="ID, contact, type, price..."
                className="pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-emerald-500/20 w-56" />
              <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
          </div>
          <div className={fw}>
            <label className={lbl}>Date Range</label>
            <select value={filters.dateRange} onChange={e => setFilters({ ...filters, dateRange: e.target.value })} className={dd}>
              <option value="all">All Time</option>
              <option value="week">Past Week</option>
              <option value="month">Past Month</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
          <div className={fw}>
            <label className={lbl}>Property Type</label>
            <select value={filters.sale_type} onChange={e => setFilters({ ...filters, sale_type: e.target.value })} className={dd}>
              <option value="all">All Types</option>
              {Object.values(SaleType).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className={fw}>
            <label className={lbl}>District</label>
            <select value={filters.district_id} onChange={e => setFilters({ ...filters, district_id: e.target.value, taluk_id: '', village_id: '' })} className={dd}>
              <option value="">All Districts</option>
              {districts.map(d => <option key={d.district_id} value={d.district_id}>{d.district_name}</option>)}
            </select>
          </div>
          {filters.district_id && (
            <div className={fw}>
              <label className={lbl}>Taluk</label>
              <select value={filters.taluk_id} onChange={e => setFilters({ ...filters, taluk_id: e.target.value, village_id: '' })} className={dd}>
                <option value="">All Taluks</option>
                {filterTaluks.map(t => <option key={t.taluk_id} value={t.taluk_id}>{t.taluk_name}</option>)}
              </select>
            </div>
          )}
          {filters.taluk_id && (
            <div className={fw}>
              <label className={lbl}>Village</label>
              <select value={filters.village_id} onChange={e => setFilters({ ...filters, village_id: e.target.value })} className={dd}>
                <option value="">All Villages</option>
                {filterVillages.map(v => <option key={v.village_id} value={v.village_id}>{v.village_name}</option>)}
              </select>
            </div>
          )}
          <button onClick={resetFilters} className="text-[10px] font-bold text-red-500 uppercase pb-3 hover:underline">Reset</button>
        </div>
        {filters.dateRange === 'custom' && (
          <div className="flex gap-4 pt-2 border-t border-gray-50">
            <div className={fw}><label className={lbl}>From</label><input type="date" value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value })} className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold" /></div>
            <div className={fw}><label className={lbl}>To</label><input type="date" value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value })} className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold" /></div>
          </div>
        )}
      </div>

      {selectedIds.size > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-6 py-3 flex items-center justify-between">
          <span className="text-sm font-bold text-emerald-700">{selectedIds.size} item{selectedIds.size > 1 ? 's' : ''} selected</span>
          <div className="flex gap-3">
            <button onClick={() => setSelectedIds(new Set())} className="text-xs font-bold text-gray-500 uppercase hover:underline">Clear</button>
            <button onClick={() => setShowBulkConfirm(true)} className="bg-red-600 text-white px-4 py-1.5 rounded-xl font-bold text-xs uppercase hover:bg-red-700">Bulk Delete</button>
          </div>
        </div>
      )}

      {loading ? <Loader /> : (
        <DataTable
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          editingRowId={inlineEditId}
          editDraft={inlineEditDraft}
          onEditDraftChange={handleInlineDraftChange}
          onCellDoubleClick={handleInlineEdit}
          cellSaving={inlineSaving}
          columns={[
            { header: 'ID', accessor: 'formatted_id' },
            { header: 'Registered', accessor: p => new Date(p.created_at).toLocaleDateString(), sortable: true, sortBy: p => new Date(p.created_at).getTime() },
            { header: 'Type', accessor: 'sale_type', editable: true, editType: 'select', editOptions: Object.values(SaleType).map(v => ({ value: v, label: v })) },
            {
              header: 'Approval', sortable: true, sortBy: p => p.status || 'pending',
              accessor: p => { const s = p.status || 'pending'; const c = { approved: 'bg-green-100 text-green-800 border-green-200', pending: 'bg-yellow-100 text-yellow-800 border-yellow-200', rejected: 'bg-red-100 text-red-800 border-red-200' }; return <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${c[s] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>{s.charAt(0).toUpperCase() + s.slice(1)}</span>; },
              editable: true, editType: 'select', editField: 'status',
              editOptions: [{ value: 'pending', label: 'Pending' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }],
            },
            {
              header: 'Booking Status', sortable: true, sortBy: p => p.sale_status || '',
              accessor: p => <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${STATUS_COLORS[p.sale_status] || 'bg-gray-200'}`}>{p.sale_status}</span>,
              editable: true, editType: 'select', editField: 'sale_status',
              editOptions: Object.values(SaleStatus).map(v => ({ value: v, label: v })),
            },
            { header: 'Primary Phone', accessor: 'contact_phone', editable: true, filterable: true, filterKey: 'contact_phone', className: 'font-bold text-emerald-600' },
            { header: 'Alt Phone', accessor: 'alternate_contact_phone', editable: true, filterable: true, filterKey: 'alternate_contact_phone' },
            { header: 'Primary Name', accessor: 'seller_name', editable: true, filterable: true, filterKey: 'seller_name' },
            { header: 'Alt Name', accessor: 'alternate_seller_name', editable: true, filterable: true, filterKey: 'alternate_seller_name' },
            { header: 'Rate (₹)', accessor: p => p.price ? `₹${Number(p.price).toLocaleString()}${p.rate_unit ? ' / ' + p.rate_unit : ''}` : '-', editable: true, editType: 'number', editField: 'price', filterable: true, filterKey: 'price' },
            { header: 'Rate Unit', accessor: p => p.rate_unit || '-', editable: true, editType: 'select', editField: 'rate_unit', editOptions: RATE_UNIT_OPTIONS.map(v => ({ value: v, label: v || '— None —' })), filterable: true, filterKey: 'rate_unit' },
            { header: 'Extent Area', accessor: 'extension', editable: true, filterable: true, filterKey: 'extension' },
            { header: 'Extension Unit', accessor: p => p.area_size || '-', editable: true, editType: 'select', editField: 'area_size', editOptions: EXTENT_UNIT_OPTIONS.map(v => ({ value: v, label: v || '— None —' })), filterable: true, filterKey: 'area_size' },
            { header: 'Survey No.', accessor: 'survey_number', editable: true, filterable: true, filterKey: 'survey_number' },
            { header: 'Landmark', accessor: 'street_name_or_road_name', editable: true, filterable: true, filterKey: 'street_name_or_road_name' },
            { header: 'Layout Name', accessor: 'layout_name', editable: true, filterable: true, filterKey: 'layout_name' },
            { header: 'Token Amt', accessor: p => p.token_amount ? `₹${Number(p.token_amount).toLocaleString()}` : '-', editable: true, editType: 'number', editField: 'token_amount', filterable: true, filterKey: 'token_amount' },
            { header: 'Token Paid To', accessor: 'token_paid_to', editable: true, editType: 'select', editOptions: TOKEN_PAID_TO_OPTIONS.map(v => ({ value: v, label: v || '— None —' })), filterable: true, filterKey: 'token_paid_to' },
            { header: 'Advance Amt', accessor: p => p.advance_amount ? `₹${Number(p.advance_amount).toLocaleString()}` : '-', editable: true, editType: 'number', editField: 'advance_amount', filterable: true, filterKey: 'advance_amount' },
            { header: 'Sold Rate', accessor: p => p.sold_rate ? `₹${Number(p.sold_rate).toLocaleString()}` : '-', editable: true, editType: 'number', editField: 'sold_rate', filterable: true, filterKey: 'sold_rate' },
            { header: 'Sold Date', accessor: p => p.sold_date ? String(p.sold_date).slice(0, 10) : '-', editable: true, editType: 'date', editField: 'sold_date', filterable: true, filterKey: 'sold_date' },
            { header: 'Boundary N', accessor: 'boundary_north', editable: true, filterable: true, filterKey: 'boundary_north' },
            { header: 'Boundary S', accessor: 'boundary_south', editable: true, filterable: true, filterKey: 'boundary_south' },
            { header: 'Boundary E', accessor: 'boundary_east', editable: true, filterable: true, filterKey: 'boundary_east' },
            { header: 'Boundary W', accessor: 'boundary_west', editable: true, filterable: true, filterKey: 'boundary_west' },
            { header: 'DTCP', accessor: 'dtcp', editable: true, filterable: true, filterKey: 'dtcp' },
            { header: 'Sub Reg. Office', accessor: 'sub_registrar_office', editable: true, filterable: true, filterKey: 'sub_registrar_office' },
            { header: 'Gift Deed', accessor: 'gift_deed', editable: true, filterable: true, filterKey: 'gift_deed' },
            { header: 'Parent Doc', accessor: 'parent_document', editable: true, filterable: true, filterKey: 'parent_document' },
            { header: 'Latitude', accessor: 'latitude', filterable: true, filterKey: 'latitude' },
            { header: 'Longitude', accessor: 'longitude', filterable: true, filterKey: 'longitude' },
            { header: 'Address', accessor: 'address', editable: true, editType: 'textarea', filterable: true, filterKey: 'address' },
            { header: 'Description', accessor: 'description', editable: true, editType: 'textarea', filterable: true, filterKey: 'description' },
          ]}
          data={filteredProperties}
          columnFilters={columnFilters}
          onColumnFilterChange={handleColumnFilterChange}
          onView={p => openModal(p, 'view')}
          actions={(p, isRowEditing) => (
            <div className="flex gap-1 items-center">
              {isRowEditing ? (
                <>
                  <button onClick={handleInlineSave} disabled={inlineSaving} className="px-2 py-1 text-[10px] font-bold text-white bg-amber-500 rounded-lg hover:bg-amber-600 disabled:opacity-60 uppercase">
                    {inlineSaving ? '…' : 'Save'}
                  </button>
                  <button onClick={handleInlineCancel} className="px-2 py-1 text-[10px] font-bold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 uppercase">✕</button>
                </>
              ) : (
                <>
                  <button onClick={() => openModal(p, 'edit')} className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-100" title="Full Edit">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  </button>
                  <button onClick={() => setDeleteTarget(p)} className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-100" title="Delete">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </>
              )}
            </div>
          )}
        />
      )}

      {isModalOpen && (
        <div className="!m-0 fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 md:p-10">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-full">
            <div className="px-8 py-5 border-b flex justify-between items-center bg-gray-50/50 shrink-0">
              <h3 className="text-xl font-bold uppercase tracking-tight text-gray-800">
                {mode === 'add' ? 'Add' : mode === 'edit' ? 'Edit' : 'View'} Sale Property
                {selected?.formatted_id && <span className="ml-3 text-sm font-bold text-emerald-600 normal-case">{selected.formatted_id}</span>}
              </h3>
              <button className="text-2xl text-gray-400 hover:text-gray-600" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            <div className="flex gap-5 px-8 border-b bg-white shrink-0 overflow-x-auto">
              {FORM_TABS.map(t => (
                <button key={t.key} onClick={() => { if (!(isNewProperty && t.key !== 'details')) setFormTab(t.key); }} className={tabBtnClass(t.key)}>
                  {t.label}
                </button>
              ))}
            </div>
            <div className="p-8 overflow-y-auto flex-1">
              {formTab === 'details' && (
                <div className="space-y-6">
                  <div className={fw}>
                    <label className={lbl}>Approval Status</label>
                    <select disabled={isReadOnly} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold text-sm">
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className={fw}>
                      <label className={lbl}>Latitude</label>
                      <input disabled={isReadOnly} value={form.latitude} onChange={e => handleChange('latitude', e.target.value)}
                        onBlur={e => handleCoordBlur(e.target.value, form.longitude)} placeholder="e.g. 11.0168" className={inp('latitude')} />
                    </div>
                    <div className={fw}>
                      <label className={lbl}>Longitude</label>
                      <input disabled={isReadOnly} value={form.longitude} onChange={e => handleChange('longitude', e.target.value)}
                        onBlur={e => handleCoordBlur(form.latitude, e.target.value)} placeholder="e.g. 76.9558" className={inp('longitude')} />
                    </div>
                  </div>
                  <div className={fw}>
                    <label className={lbl}>Property Location (District / Taluk / Village)</label>
                    {geocodingAddress && <span className="text-[9px] font-bold text-blue-500 uppercase tracking-wide animate-pulse">Fetching location…</span>}
                    <LocationSelector district_id={form.district_id} taluk_id={form.taluk_id} village_id={form.village_id} disabled={isReadOnly} onChange={loc => setForm(p => ({ ...p, ...loc }))} />
                  </div>
                  <div className={fw}>
                    <label className={lbl}>Address</label>
                    <textarea disabled={isReadOnly} value={form.address} onChange={e => handleChange('address', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold text-sm min-h-[80px]" />
                  </div>
                </div>
              )}
              {formTab === 'seller' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className={fw}><label className={lbl}>Primary Phone</label>
                      <input disabled={isReadOnly} value={form.contact_phone} onChange={e => handleChange('contact_phone', e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10-digit number" className={inp()} /></div>
                    <div className={fw}><label className={lbl}>Primary Name</label>
                      <input disabled={isReadOnly} value={form.seller_name} onChange={e => handleChange('seller_name', e.target.value)} className={inp()} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className={fw}><label className={lbl}>Additional Phone</label>
                      <input disabled={isReadOnly} value={form.alternate_contact_phone} onChange={e => handleChange('alternate_contact_phone', e.target.value.replace(/\D/g, '').slice(0, 10))} className={inp()} /></div>
                    <div className={fw}><label className={lbl}>Additional Name</label>
                      <input disabled={isReadOnly} value={form.alternate_seller_name} onChange={e => handleChange('alternate_seller_name', e.target.value)} className={inp()} /></div>
                  </div>
                </div>
              )}
              {formTab === 'property-info' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className={fw}><label className={lbl}>Booking Status</label>
                      <select disabled={isReadOnly} value={form.sale_status} onChange={e => handleChange('sale_status', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold text-sm">
                        {Object.values(SaleStatus).map(s => <option key={s} value={s}>{s}</option>)}
                      </select></div>
                    <div className={fw}><label className={lbl}>Property Type</label>
                      <select disabled={isReadOnly} value={form.sale_type} onChange={e => handleChange('sale_type', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold text-sm">
                        {Object.values(SaleType).map(s => <option key={s} value={s}>{s}</option>)}
                      </select></div>
                  </div>
                  <div className="grid grid-cols-4 gap-6">
                    <div className={fw}><label className={lbl}>Rate (₹)</label><input disabled={isReadOnly} value={form.price} onChange={e => handleChange('price', e.target.value)} className={inp()} /></div>
                    <div className={fw}><label className={lbl}>Rate Unit</label>
                      <select disabled={isReadOnly} value={form.rate_unit || ''} onChange={e => handleChange('rate_unit', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold text-sm">
                        {RATE_UNIT_OPTIONS.map(o => <option key={o} value={o}>{o || '— Select —'}</option>)}
                      </select>
                    </div>
                    <div className={fw}><label className={lbl}>Extent Area</label><input disabled={isReadOnly} value={form.extension || ''} onChange={e => handleChange('extension', e.target.value)} className={inp()} /></div>
                    <div className={fw}><label className={lbl}>Extension Unit</label>
                      <select disabled={isReadOnly} value={form.area_size || ''} onChange={e => handleChange('area_size', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold text-sm">
                        {EXTENT_UNIT_OPTIONS.map(o => <option key={o} value={o}>{o || '— Select —'}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className={fw}><label className={lbl}>Survey Number</label><input disabled={isReadOnly} value={form.survey_number} onChange={e => handleChange('survey_number', e.target.value)} className={inp()} /></div>
                    <div className={fw}><label className={lbl}>Landmark</label><input disabled={isReadOnly} value={form.street_name_or_road_name} onChange={e => handleChange('street_name_or_road_name', e.target.value)} className={inp()} /></div>
                  </div>
                  <div className={fw}><label className={lbl}>Layout Name</label><input disabled={isReadOnly} value={form.layout_name} onChange={e => handleChange('layout_name', e.target.value)} className={inp()} /></div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className={fw}><label className={lbl}>Token Amount (₹)</label><input type="number" disabled={isReadOnly} value={form.token_amount || ''} onChange={e => handleChange('token_amount', e.target.value)} placeholder="Token amount paid" className={inp()} /></div>
                    <div className={fw}><label className={lbl}>Token Paid To</label>
                      <select disabled={isReadOnly} value={form.token_paid_to || ''} onChange={e => handleChange('token_paid_to', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold text-sm">
                        {TOKEN_PAID_TO_OPTIONS.map(o => <option key={o} value={o}>{o || '— Select —'}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className={fw}><label className={lbl}>Advance Amount (₹)</label><input type="number" disabled={isReadOnly} value={form.advance_amount || ''} onChange={e => handleChange('advance_amount', e.target.value)} placeholder="Advance paid" className={inp()} /></div>
                    <div className={fw}><label className={lbl}>Sold Rate (₹)</label><input type="number" disabled={isReadOnly} value={form.sold_rate || ''} onChange={e => handleChange('sold_rate', e.target.value)} placeholder="Final sold price" className={inp()} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className={fw}><label className={lbl}>Sold Date</label><input type="date" disabled={isReadOnly} value={form.sold_date || ''} onChange={e => handleChange('sold_date', e.target.value)} className={inp()} /></div>
                  </div>
                  {showExtraFields && (
                    <div className="grid grid-cols-3 gap-6">
                      <div className={fw}><label className={lbl}>Total Units</label><input type="number" disabled={isReadOnly} value={form.total_units_count} onChange={e => handleChange('total_units_count', e.target.value)} className={inp()} /></div>
                      <div className={fw}><label className={lbl}>Booked Units</label><input disabled={isReadOnly} value={form.booked_units} onChange={e => handleChange('booked_units', e.target.value)} placeholder="e.g. 1-5, 8" className={inp()} /></div>
                      <div className={fw}><label className={lbl}>Available{form.total_units_count ? ' (Auto)' : ''}</label><input disabled={isReadOnly || !!form.total_units_count} value={form.open_units} onChange={e => handleChange('open_units', e.target.value)} className={form.total_units_count ? 'w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold text-sm bg-gray-100 text-emerald-700' : inp()} /></div>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Boundaries</p>
                    <div className="grid grid-cols-2 gap-6">
                      {['boundary_north', 'boundary_south', 'boundary_east', 'boundary_west'].map(f => (
                        <div key={f} className={fw}><label className={lbl}>{f.replace('boundary_', '')}</label>
                          <input disabled={isReadOnly} value={form[f]} onChange={e => handleChange(f, e.target.value)} className={inp()} /></div>
                      ))}
                    </div>
                  </div>
                  <div className={fw}><label className={lbl}>Description</label>
                    <textarea disabled={isReadOnly} value={form.description} onChange={e => handleChange('description', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold text-sm min-h-[80px]" /></div>
                </div>
              )}
              {formTab === 'legal' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className={fw}><label className={lbl}>DTCP Approval</label><input disabled={isReadOnly} value={form.dtcp} onChange={e => handleChange('dtcp', e.target.value)} placeholder="DTCP number / details" className={inp()} /></div>
                    <div className={fw}><label className={lbl}>Sub Registrar Office</label><input disabled={isReadOnly} value={form.sub_registrar_office} onChange={e => handleChange('sub_registrar_office', e.target.value)} className={inp()} /></div>
                  </div>
                  <div className={fw}><label className={lbl}>Parent Document</label><input disabled={isReadOnly} value={form.parent_document} onChange={e => handleChange('parent_document', e.target.value)} className={inp()} /></div>
                  <div className={fw}><label className={lbl}>Gift Deed</label><input disabled={isReadOnly} value={form.gift_deed} onChange={e => handleChange('gift_deed', e.target.value)} className={inp()} /></div>
                </div>
              )}
              {formTab === 'ratings' && (
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
                    <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-1">Area Speed</p>
                    <p className="text-[11px] text-blue-500 mb-4">Auto-calculated: count of sold properties within 1km over the past 2 years ÷ 24 months. You can also edit it manually.</p>
                    <div className="flex gap-3 items-end">
                      <div className="flex-1">
                        <label className={lbl}>Area Speed (sales/month)</label>
                        <input type="number" step="0.01" disabled={isReadOnly} value={form.area_speed || ''} onChange={e => handleChange('area_speed', e.target.value)} placeholder="e.g. 5.00" className={inp()} />
                      </div>
                      {!isReadOnly && (
                        <button onClick={handleCalcAreaSpeed} disabled={calcingAreaSpeed} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-blue-700 disabled:opacity-60 shrink-0">
                          {calcingAreaSpeed ? 'Calculating…' : 'Recalculate'}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5">
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-600 mb-4">Manual Ratings (0–10)</p>
                    <div className="grid grid-cols-3 gap-6">
                      <div className={fw}>
                        <label className={lbl}>Amenities Rating</label>
                        <input type="number" step="0.1" min="0" max="10" disabled={isReadOnly} value={form.amenities_rating || ''} onChange={e => handleChange('amenities_rating', e.target.value)} placeholder="0–10" className={inp()} />
                      </div>
                      <div className={fw}>
                        <label className={lbl}>Utilities Rating</label>
                        <input type="number" step="0.1" min="0" max="10" disabled={isReadOnly} value={form.utilities_rating || ''} onChange={e => handleChange('utilities_rating', e.target.value)} placeholder="0–10" className={inp()} />
                      </div>
                      <div className={fw}>
                        <label className={lbl}>Legal Rating</label>
                        <input type="number" step="0.1" min="0" max="10" disabled={isReadOnly} value={form.legal_rating || ''} onChange={e => handleChange('legal_rating', e.target.value)} placeholder="0–10" className={inp()} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {formTab === 'images' && (
                assetLoading ? <Loader /> :
                  <PropertyAssetsTabs propertyId={selected?.property_id || null} assets={assets} setAssets={setAssets}
                    isReadOnly={isReadOnly} propertyData={selected || form} mode={mode} onlyType="image"
                    onDrawingImageUpload={async (url) => {
                      await adminApi.put(`/sale/${selected.property_id}`, { drawing_image_url: url });
                      setSelected(prev => ({ ...prev, drawing_image: url }));
                    }} />
              )}
              {formTab === 'documents' && (
                assetLoading ? <Loader /> :
                  <PropertyAssetsTabs propertyId={selected?.property_id || null} assets={assets} setAssets={setAssets}
                    isReadOnly={isReadOnly} propertyData={selected || form} mode={mode} onlyType="document" />
              )}
            </div>
            <div className="px-8 py-5 border-t flex justify-end gap-4 bg-gray-50 shrink-0">
              <button onClick={() => setIsModalOpen(false)} className="px-6 py-2 rounded-xl border border-gray-300 font-bold text-xs uppercase text-gray-600 hover:bg-gray-100">Close</button>
              {!isReadOnly && formTab !== 'images' && formTab !== 'documents' && (
                mode === 'add' && formTab === 'details' ? (
                  <button onClick={handleCreate} disabled={submitting} className="bg-emerald-600 text-white px-8 py-2 rounded-xl font-bold text-xs uppercase shadow-lg hover:bg-emerald-700 disabled:opacity-70">
                    {submitting ? 'Creating…' : 'Create Property'}
                  </button>
                ) : (
                  <button onClick={handleUpdate} disabled={submitting} className="bg-emerald-600 text-white px-8 py-2 rounded-xl font-bold text-xs uppercase shadow-lg hover:bg-emerald-700 disabled:opacity-70">
                    {submitting ? 'Saving…' : 'Update'}
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl">
            <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h3 className="text-lg font-bold text-center text-gray-900 mb-1">Delete Property</h3>
            <p className="text-sm text-gray-500 text-center mb-1"><span className="font-bold text-gray-800">{deleteTarget.formatted_id}</span></p>
            <p className="text-xs text-red-600 text-center font-bold uppercase tracking-wide mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 font-bold text-xs uppercase text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleDeleteConfirm} disabled={deleting} className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white font-bold text-xs uppercase hover:bg-red-700 disabled:opacity-70">
                {deleting ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showBulkConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl">
            <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h3 className="text-lg font-bold text-center text-gray-900 mb-1">Delete {selectedIds.size} Properties</h3>
            <p className="text-xs text-red-600 text-center font-bold uppercase tracking-wide mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowBulkConfirm(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 font-bold text-xs uppercase text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleBulkDelete} disabled={bulkDeleting} className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white font-bold text-xs uppercase hover:bg-red-700 disabled:opacity-70">
                {bulkDeleting ? 'Deleting…' : 'Yes, Delete All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
