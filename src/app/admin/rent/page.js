'use client';
import { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import DataTable from '@/components/admin/DataTable';
import Loader from '@/components/admin/Loader';
import LocationSelector from '@/components/admin/LocationSelector';
import PropertyAssetsTabs from '@/components/admin/PropertyAssetsTabs';
import {
  getRentProperties, createRentProperty, updateRentProperty, deleteRentProperty,
  getAllDistricts, getTaluksByDistrict, getVillagesByTaluk, adminApi,
} from '@/lib/adminApi';

const BookingStatus = { NIL_BOOKING: 'Nil Booking', ON_BOOKING: 'ON_BOOKING', BOOKED: 'BOOKED', RENTED: 'RENTED' };
const PropertyType = { RESIDENTIAL: 'residential', COMMERCIAL: 'commercial' };
const TOKEN_PAID_TO_OPTIONS = ['', 'Paid Us', 'Paid to Owner', 'Owner returned', 'Returned to buyer'];
const STATUS_COLORS = {
  'Nil Booking': 'bg-emerald-100 text-emerald-700',
  'ON_BOOKING':  'bg-yellow-100 text-yellow-800',
  'CONFIRMED':   'bg-red-100 text-red-800',
  'UNREGISTERED':'bg-red-100 text-red-800',
  'REGISTERED':  'bg-red-100 text-red-800',
  'RENTED':      'bg-red-100 text-red-800',
  'BOOKED':      'bg-red-100 text-red-800',
};

const EMPTY_FORM = {
  contact_phone: '', seller_name: '', alternate_contact_phone: '', alternate_seller_name: '',
  title: '', address: '', latitude: '', longitude: '',
  district_id: '', taluk_id: '', village_id: '',
  status: 'pending', bhk: '', rent_amount: '', advance_amount: '',
  property_use: PropertyType.RESIDENTIAL, rent_status: BookingStatus.NIL_BOOKING,
  landmark: '', extent_area: '', extent_unit: '', description: '',
  token_amount: '', token_paid_to: '', rent_out_rate: '', rent_out_date: '',
  legal_value: 'A+', area_sales_speed: '', facing: '', road_width: '',
};

const FORM_TABS = [
  { key: 'details', label: 'Details' },
  { key: 'seller', label: 'Seller' },
  { key: 'property-info', label: 'Property Info' },
  { key: 'custom-fields', label: 'Custom Fields' },
  { key: 'images', label: 'Images' },
  { key: 'documents', label: 'Documents' },
];

const LEGAL_VALUE_OPTIONS = ['A+', 'A', 'B', 'C'];
const FACING_OPTIONS = ['', 'North', 'South', 'East', 'West', 'North-East', 'North-West', 'South-East', 'South-West'];

const lbl = 'text-[10px] font-bold uppercase tracking-widest text-gray-500';
const fw = 'flex flex-col space-y-2';
const dd = 'px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all';
const inp = 'w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold text-sm';

export default function RentPropertiesPage() {
  const [allProperties, setAllProperties] = useState([]);
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [districts, setDistricts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [mode, setMode] = useState('add');
  const isReadOnly = mode === 'view';

  const [formTab, setFormTab] = useState('details');
  const [assets, setAssets] = useState([]);
  const [assetLoading, setAssetLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({ dateRange: 'all', startDate: '', endDate: '', district_id: '', taluk_id: '', village_id: '', property_use: 'all' });
  const [filterTaluks, setFilterTaluks] = useState([]);
  const [filterVillages, setFilterVillages] = useState([]);
  const [columnFilters, setColumnFilters] = useState({});

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);

  const [inlineEditId, setInlineEditId] = useState(null);
  const [inlineEditDraft, setInlineEditDraft] = useState({});
  const [inlineSaving, setInlineSaving] = useState(false);

  const isNewProperty = !selected?.property_id;

  const tabBtnClass = (key) => {
    const isActive = formTab === key;
    const locked = isNewProperty && key !== 'details';
    return `py-3 px-1 text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${locked ? 'text-gray-300 cursor-not-allowed' : isActive ? 'border-b-2 border-emerald-600 text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`;
  };

  const isCustomFieldsTab = formTab === 'custom-fields';

  const fetchRent = async () => {
    setLoading(true);
    try {
      const res = await getRentProperties();
      const data = res.data || res;
      setAllProperties(Array.isArray(data) ? data : []);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchRent(); }, []);
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
        (p.property_use || '').toLowerCase().includes(q) ||
        String(p.rent_amount || '').includes(q) ||
        (p.district_name || '').toLowerCase().includes(q) ||
        (p.taluk_name || '').toLowerCase().includes(q) ||
        (p.village_name || '').toLowerCase().includes(q)
      );
    }
    if (filters.property_use !== 'all') result = result.filter(p => p.property_use === filters.property_use);
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
    setForm(property ? { ...EMPTY_FORM, ...property } : EMPTY_FORM);
    setMode(modalMode);
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (isModalOpen && selected?.property_id) {
      setAssetLoading(true);
      adminApi.get(`/property-assets/${selected.property_id}`).then(r => setAssets(r.data || [])).finally(() => setAssetLoading(false));
    } else { setAssets([]); setFormTab('details'); }
  }, [isModalOpen, selected]);

  const handleChange = (key, value) => setForm(prev => ({ ...prev, [key]: value ?? '' }));

  const handleCreate = async () => {
    if (!form.latitude || !form.longitude || isNaN(parseFloat(form.latitude)) || isNaN(parseFloat(form.longitude))) {
      alert('Latitude and longitude are required to create a property.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await createRentProperty(form);
      const created = res.data || res.property || res;
      await fetchRent();
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
      await updateRentProperty(selected.property_id, form);
      await fetchRent();
    } catch (err) {
      alert('Failed: ' + (err?.response?.data?.error || err.message));
    }
    finally { setSubmitting(false); }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteRentProperty(deleteTarget.property_id || deleteTarget.id);
      await fetchRent();
      setDeleteTarget(null);
    } catch (err) { alert('Failed to delete: ' + err.message); }
    finally { setDeleting(false); }
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      await Promise.all([...selectedIds].map(id => deleteRentProperty(id)));
      await fetchRent();
      setSelectedIds(new Set());
      setShowBulkConfirm(false);
    } catch (err) { alert('Bulk delete failed: ' + err.message); }
    finally { setBulkDeleting(false); }
  };

  const handleExport = () => {
    const rows = filteredProperties.map(p => ({
      'formatted_id': p.formatted_id, 'contact_phone': p.contact_phone || '',
      'seller_name': p.seller_name || '', 'alternate_contact_phone': p.alternate_contact_phone || '',
      'alternate_seller_name': p.alternate_seller_name || '', 'latitude': p.latitude, 'longitude': p.longitude,
      'address': p.address || '', 'district_id': p.district_id, 'taluk_id': p.taluk_id, 'village_id': p.village_id,
      'status': p.status, 'property_use': p.property_use, 'rent_status': p.rent_status,
      'rent_amount': p.rent_amount, 'advance_amount': p.advance_amount, 'bhk': p.bhk || '',
      'extent_area': p.extent_area || '', 'extent_unit': p.extent_unit || '',
      'landmark': p.landmark || '', 'description': p.description || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rent_Inventory');
    XLSX.writeFile(wb, `Rent_Inventory_${new Date().toLocaleDateString()}.xlsx`);
  };

  const resetFilters = () => {
    setFilters({ dateRange: 'all', property_use: 'all', district_id: '', taluk_id: '', village_id: '', startDate: '', endDate: '' });
    setSearchQuery('');
    setColumnFilters({});
  };

  const handleColumnFilterChange = (key, value) => setColumnFilters(prev => ({ ...prev, [key]: value }));

  const handleInlineEdit = (p) => {
    setInlineEditId(p.property_id);
    setInlineEditDraft({ ...p, rent_out_date: p.rent_out_date ? String(p.rent_out_date).slice(0, 10) : '' });
  };
  const handleInlineCancel = () => { setInlineEditId(null); setInlineEditDraft({}); };
  const handleInlineDraftChange = (key, val) => setInlineEditDraft(prev => ({ ...prev, [key]: val }));
  const handleInlineSave = async () => {
    setInlineSaving(true);
    try {
      await updateRentProperty(inlineEditId, inlineEditDraft);
      setAllProperties(prev => prev.map(p => p.property_id === inlineEditId ? { ...p, ...inlineEditDraft } : p));
      setInlineEditId(null);
    } catch (err) { alert('Failed: ' + (err?.response?.data?.error || err.message)); }
    finally { setInlineSaving(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Rent Inventory</h2>
          <p className="text-gray-500 text-xs uppercase tracking-widest font-bold">Manage Listings</p>
        </div>
        <div className="flex gap-3 flex-wrap justify-end">
          <button onClick={handleExport} className="bg-white border border-gray-300 text-gray-700 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-50">
            Export Excel
          </button>
          <button onClick={() => openModal(null, 'add')} className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-emerald-200 hover:bg-emerald-700">
            Add Rent Listing
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className={fw}>
            <label className={lbl}>Search</label>
            <div className="relative">
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="ID, contact, type, amount..."
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
            <select value={filters.property_use} onChange={e => setFilters({ ...filters, property_use: e.target.value })} className={dd}>
              <option value="all">All Types</option>
              {Object.values(PropertyType).map(s => <option key={s} value={s}>{s}</option>)}
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
            {
              header: 'Property Type', accessor: 'property_use',
              editable: true, editType: 'select',
              editOptions: Object.values(PropertyType).map(v => ({ value: v, label: v })),
            },
            {
              header: 'Approval', sortable: true, sortBy: p => p.status || 'pending',
              accessor: p => { const s = p.status || 'pending'; const c = { approved: 'bg-green-100 text-green-800 border-green-200', pending: 'bg-yellow-100 text-yellow-800 border-yellow-200', rejected: 'bg-red-100 text-red-800 border-red-200' }; return <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${c[s] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>{s.charAt(0).toUpperCase() + s.slice(1)}</span>; },
              editable: true, editType: 'select', editField: 'status',
              editOptions: [{ value: 'pending', label: 'Pending' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }],
            },
            {
              header: 'Booking Status', sortable: true, sortBy: p => p.rent_status || '',
              accessor: p => <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${STATUS_COLORS[p.rent_status] || 'bg-gray-200'}`}>{p.rent_status || 'Nil Booking'}</span>,
              editable: true, editType: 'select', editField: 'rent_status',
              editOptions: Object.values(BookingStatus).map(v => ({ value: v, label: v })),
            },
            { header: 'Primary Phone', accessor: 'contact_phone', editable: true, filterable: true, filterKey: 'contact_phone', className: 'font-bold text-emerald-600' },
            { header: 'Alt Phone', accessor: 'alternate_contact_phone', editable: true, filterable: true, filterKey: 'alternate_contact_phone' },
            { header: 'Primary Name', accessor: 'seller_name', editable: true, filterable: true, filterKey: 'seller_name' },
            { header: 'Alt Name', accessor: 'alternate_seller_name', editable: true, filterable: true, filterKey: 'alternate_seller_name' },
            { header: 'Rent Amount (₹)', accessor: p => p.rent_amount ? `₹${Number(p.rent_amount).toLocaleString()}` : '-', editable: true, editType: 'number', editField: 'rent_amount', filterable: true, filterKey: 'rent_amount' },
            { header: 'Advance (₹)', accessor: p => p.advance_amount ? `₹${Number(p.advance_amount).toLocaleString()}` : '-', editable: true, editType: 'number', editField: 'advance_amount', filterable: true, filterKey: 'advance_amount' },
            { header: 'BHK', accessor: 'bhk', editable: true, editType: 'number', filterable: true, filterKey: 'bhk' },
            { header: 'Extent Area', accessor: 'extent_area', editable: true, editType: 'number', filterable: true, filterKey: 'extent_area' },
            { header: 'Extent Unit', accessor: 'extent_unit', editable: true, filterable: true, filterKey: 'extent_unit' },
            { header: 'Furnished', accessor: 'furnished_status', editable: true, filterable: true, filterKey: 'furnished_status' },
            { header: 'Landmark', accessor: 'landmark', editable: true, filterable: true, filterKey: 'landmark' },
            { header: 'Street Name', accessor: 'street_name', editable: true, filterable: true, filterKey: 'street_name' },
            { header: 'Token Amt', accessor: p => p.token_amount ? `₹${Number(p.token_amount).toLocaleString()}` : '-', editable: true, editType: 'number', editField: 'token_amount', filterable: true, filterKey: 'token_amount' },
            { header: 'Token Paid To', accessor: 'token_paid_to', editable: true, editType: 'select', editOptions: TOKEN_PAID_TO_OPTIONS.map(v => ({ value: v, label: v || '— None —' })), filterable: true, filterKey: 'token_paid_to' },
            { header: 'Rent Out Rate', accessor: p => p.rent_out_rate ? `₹${Number(p.rent_out_rate).toLocaleString()}` : '-', editable: true, editType: 'number', editField: 'rent_out_rate', filterable: true, filterKey: 'rent_out_rate' },
            { header: 'Rent Out Date', accessor: p => p.rent_out_date ? String(p.rent_out_date).slice(0, 10) : '-', editable: true, editType: 'date', editField: 'rent_out_date', filterable: true, filterKey: 'rent_out_date' },
            { header: 'District', accessor: p => p.district_name || '—', filterable: true, filterKey: 'district_name' },
            { header: 'Taluk', accessor: p => p.taluk_name || '—', filterable: true, filterKey: 'taluk_name' },
            { header: 'Village', accessor: p => p.village_name || '—', filterable: true, filterKey: 'village_name' },
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
                {mode === 'add' ? 'Add' : mode === 'edit' ? 'Edit' : 'View'} Rent Property
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
                    <select disabled={isReadOnly} value={form.status || ''} onChange={e => handleChange('status', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold text-sm">
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className={fw}>
                      <label className={lbl}>Latitude</label>
                      <input disabled={isReadOnly} value={form.latitude || ''} onChange={e => handleChange('latitude', e.target.value)} placeholder="e.g. 11.0168" className={inp} />
                    </div>
                    <div className={fw}>
                      <label className={lbl}>Longitude</label>
                      <input disabled={isReadOnly} value={form.longitude || ''} onChange={e => handleChange('longitude', e.target.value)} placeholder="e.g. 76.9558" className={inp} />
                    </div>
                  </div>
                  <div className={fw}>
                    <label className={lbl}>Property Location (District / Taluk / Village)</label>
                    <LocationSelector district_id={form.district_id} taluk_id={form.taluk_id} village_id={form.village_id} disabled={isReadOnly} onChange={loc => setForm(p => ({ ...p, ...loc }))} />
                  </div>
                  <div className={fw}>
                    <label className={lbl}>Address</label>
                    <textarea disabled={isReadOnly} value={form.address || ''} onChange={e => handleChange('address', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold text-sm min-h-[80px]" />
                  </div>
                </div>
              )}
              {formTab === 'seller' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className={fw}><label className={lbl}>Primary Phone</label>
                      <input disabled={isReadOnly} value={form.contact_phone || ''} onChange={e => handleChange('contact_phone', e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10-digit number" className={inp} /></div>
                    <div className={fw}><label className={lbl}>Primary Name</label>
                      <input disabled={isReadOnly} value={form.seller_name || ''} onChange={e => handleChange('seller_name', e.target.value)} className={inp} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className={fw}><label className={lbl}>Additional Phone</label>
                      <input disabled={isReadOnly} value={form.alternate_contact_phone || ''} onChange={e => handleChange('alternate_contact_phone', e.target.value.replace(/\D/g, '').slice(0, 10))} className={inp} /></div>
                    <div className={fw}><label className={lbl}>Additional Name</label>
                      <input disabled={isReadOnly} value={form.alternate_seller_name || ''} onChange={e => handleChange('alternate_seller_name', e.target.value)} className={inp} /></div>
                  </div>
                </div>
              )}
              {formTab === 'property-info' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className={fw}><label className={lbl}>Booking Status</label>
                      <select disabled={isReadOnly} value={form.rent_status || ''} onChange={e => handleChange('rent_status', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold text-sm">
                        {Object.values(BookingStatus).map(s => <option key={s} value={s}>{s}</option>)}
                      </select></div>
                    <div className={fw}><label className={lbl}>Property Type</label>
                      <select disabled={isReadOnly} value={form.property_use || ''} onChange={e => handleChange('property_use', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold text-sm">
                        {Object.values(PropertyType).map(s => <option key={s} value={s}>{s}</option>)}
                      </select></div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className={fw}><label className={lbl}>Rent Amount (₹)</label><input type="number" disabled={isReadOnly} value={form.rent_amount || ''} onChange={e => handleChange('rent_amount', e.target.value)} className={inp} /></div>
                    <div className={fw}><label className={lbl}>Advance Amount (₹)</label><input type="number" disabled={isReadOnly} value={form.advance_amount || ''} onChange={e => handleChange('advance_amount', e.target.value)} className={inp} /></div>
                  </div>
                  {form.property_use === 'residential' && (
                    <div className={fw}><label className={lbl}>BHK</label><input disabled={isReadOnly} value={form.bhk || ''} onChange={e => handleChange('bhk', e.target.value)} className={inp} /></div>
                  )}
                  {form.property_use === 'commercial' && (
                    <div className="grid grid-cols-2 gap-6">
                      <div className={fw}><label className={lbl}>Extent Area</label><input disabled={isReadOnly} value={form.extent_area || ''} onChange={e => handleChange('extent_area', e.target.value)} className={inp} /></div>
                      <div className={fw}><label className={lbl}>Extent Unit</label><input disabled={isReadOnly} value={form.extent_unit || ''} onChange={e => handleChange('extent_unit', e.target.value)} placeholder="e.g. sq.ft" className={inp} /></div>
                    </div>
                  )}
                  <div className={fw}><label className={lbl}>Landmark</label><input disabled={isReadOnly} value={form.landmark || ''} onChange={e => handleChange('landmark', e.target.value)} className={inp} /></div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className={fw}><label className={lbl}>Token Amount (₹)</label><input type="number" disabled={isReadOnly} value={form.token_amount || ''} onChange={e => handleChange('token_amount', e.target.value)} placeholder="Token amount paid" className={inp} /></div>
                    <div className={fw}><label className={lbl}>Token Paid To</label>
                      <select disabled={isReadOnly} value={form.token_paid_to || ''} onChange={e => handleChange('token_paid_to', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold text-sm">
                        {TOKEN_PAID_TO_OPTIONS.map(o => <option key={o} value={o}>{o || '— Select —'}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className={fw}><label className={lbl}>Advance Amount (₹)</label><input type="number" disabled={isReadOnly} value={form.advance_amount || ''} onChange={e => handleChange('advance_amount', e.target.value)} placeholder="Advance paid" className={inp} /></div>
                    <div className={fw}><label className={lbl}>Rent Out Rate (₹)</label><input type="number" disabled={isReadOnly} value={form.rent_out_rate || ''} onChange={e => handleChange('rent_out_rate', e.target.value)} placeholder="Final rent-out rate" className={inp} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className={fw}><label className={lbl}>Rent Out Date</label><input type="date" disabled={isReadOnly} value={form.rent_out_date || ''} onChange={e => handleChange('rent_out_date', e.target.value)} className={inp} /></div>
                  </div>
                  <div className={fw}><label className={lbl}>Description</label>
                    <textarea disabled={isReadOnly} value={form.description || ''} onChange={e => handleChange('description', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold text-sm min-h-[80px]" /></div>
                </div>
              )}
              {formTab === 'custom-fields' && (
                <div className="space-y-6">
                  <div className="bg-violet-50 border border-violet-100 rounded-2xl p-5">
                    <p className="text-xs font-bold uppercase tracking-widest text-violet-700 mb-4">Property Custom Fields</p>
                    <div className="grid grid-cols-2 gap-6">
                      <div className={fw}>
                        <label className={lbl}>Legal Value</label>
                        <select disabled={isReadOnly} value={form.legal_value || 'A+'} onChange={e => handleChange('legal_value', e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold text-sm">
                          {LEGAL_VALUE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                      <div className={fw}>
                        <label className={lbl}>Area Sales Speed (rentals/month)</label>
                        <input type="number" step="0.01" disabled={isReadOnly} value={form.area_sales_speed || ''} onChange={e => handleChange('area_sales_speed', e.target.value)} placeholder="Auto-calculated or manual" className={inp} />
                      </div>
                      <div className={fw}>
                        <label className={lbl}>Facing</label>
                        <select disabled={isReadOnly} value={form.facing || ''} onChange={e => handleChange('facing', e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold text-sm">
                          {FACING_OPTIONS.map(o => <option key={o} value={o}>{o || '— Select —'}</option>)}
                        </select>
                      </div>
                      <div className={fw}>
                        <label className={lbl}>Road Width</label>
                        <input type="text" disabled={isReadOnly} value={form.road_width || ''} onChange={e => handleChange('road_width', e.target.value)} placeholder="e.g. 30 ft, 9 m" className={inp} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {formTab === 'images' && (
                assetLoading ? <Loader /> :
                  <PropertyAssetsTabs propertyId={selected?.property_id || null} assets={assets} setAssets={setAssets}
                    isReadOnly={isReadOnly} propertyData={selected || form} mode={mode} onlyType="image" />
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
                ) : formTab !== 'details' || selected?.property_id ? (
                  <button onClick={handleUpdate} disabled={submitting} className="bg-emerald-600 text-white px-8 py-2 rounded-xl font-bold text-xs uppercase shadow-lg hover:bg-emerald-700 disabled:opacity-70">
                    {submitting ? 'Saving…' : 'Update'}
                  </button>
                ) : null
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
