'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DataTable from '@/components/admin/DataTable';
import Loader from '@/components/admin/Loader';
import { getPlotProperties, getPlotLayout, getAllPlotUnits, updatePlotUnit, deletePlotUnit, updateSaleProperty, adminApi, bulkUpdatePlotStatuses } from '@/lib/adminApi';
import { formatPropertyId, getAdminPropertyHref } from '@/utils/propertyRouting';

const STATUS_COLORS = {
  'Nil Booking': 'bg-emerald-100 text-emerald-700',
  'ON_BOOKING':  'bg-yellow-100 text-yellow-800',
  'CONFIRMED':   'bg-red-100 text-red-800',
  'UNREGISTERED':'bg-red-100 text-red-800',
  'REGISTERED':  'bg-red-100 text-red-800',
  'SOLD':        'bg-red-100 text-red-800',
  'BOOKED':      'bg-red-100 text-red-800',
};

const UNIT_STATUS_OPTIONS = ['Nil Booking', 'ON_BOOKING', 'CONFIRMED', 'UNREGISTERED', 'REGISTERED', 'SOLD'];
const TOKEN_PAID_TO_OPTIONS = ['', 'Paid Us', 'Paid to Owner', 'Owner returned', 'Returned to buyer'];
const SALE_STATUS_OPTIONS = ['Nil Booking', 'ON_BOOKING', 'BOOKED', 'SOLD'];
const RATE_UNIT_OPTIONS = ['', 'sqft', 'cent'];
const EXTENT_UNIT_OPTIONS = ['', 'sqft', 'cent', 'sq.m', 'acre', 'ground', 'guntha', 'kanal', 'marla'];

function LabelCell({ labels, colorClass }) {
  if (!labels) return <span className="text-gray-300 text-xs">—</span>;
  const items = labels.split(',').map(l => l.trim()).filter(Boolean);
  if (!items.length) return <span className="text-gray-300 text-xs">—</span>;
  const preview = items.slice(0, 6).join(', ');
  const extra = items.length > 6 ? ` +${items.length - 6}` : '';
  return (
    <span className={`font-bold text-xs ${colorClass}`} title={labels}>
      {preview}{extra && <span className="text-gray-400">{extra}</span>}
    </span>
  );
}

const getApprovalClasses = (status) => {
  const s = String(status || '').toLowerCase();
  if (s === 'approved') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (s === 'pending') return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  if (s === 'rejected') return 'bg-red-100 text-red-800 border-red-200';
  return 'bg-gray-100 text-gray-600 border-gray-200';
};

export default function PlotsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('properties');

  const [plots, setPlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [propEditId, setPropEditId] = useState(null);
  const [propEditDraft, setPropEditDraft] = useState({});
  const [propSaving, setPropSaving] = useState(false);

  const [plotUnits, setPlotUnits] = useState([]);
  const [unitsLoading, setUnitsLoading] = useState(true);
  const [unitEditId, setUnitEditId] = useState(null);
  const [unitEditDraft, setUnitEditDraft] = useState({});
  const [unitSaving, setUnitSaving] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getPlotProperties()
      .then(res => { const d = res.data || res; setPlots(Array.isArray(d) ? d : []); })
      .catch(() => setPlots([]))
      .finally(() => setLoading(false));

    getAllPlotUnits()
      .then(res => { const d = res.data || res; setPlotUnits(Array.isArray(d) ? d : []); })
      .catch(() => setPlotUnits([]))
      .finally(() => setUnitsLoading(false));
  }, []);

  const handleOpenEditor = async (p) => {
    try { await getPlotLayout(p.property_id); } catch {}
    router.push(`/admin/plots/editor/${p.property_id}`);
  };

  const handlePropInlineEdit = (p) => {
    setPropEditId(p.property_id);
    setPropEditDraft({
      ...p,
      sold_date: p.sold_date ? String(p.sold_date).slice(0, 10) : '',
      nil_labels: p.nil_booking || '',
      on_labels: p.on_booking || '',
      confirmed_labels: p.confirmed || '',
      unreg_labels: p.unregistered || '',
      reg_labels: p.registered || '',
      sold_labels: p.sold || '',
    });
  };
  const handlePropInlineCancel = () => { setPropEditId(null); setPropEditDraft({}); };
  const handlePropDraftChange = (key, val) => setPropEditDraft(prev => ({ ...prev, [key]: val }));
  const handlePropInlineSave = async () => {
    setPropSaving(true);
    try {
      const full = (await adminApi.get(`/sale/${propEditId}`)).data || {};
      const { booking_status, seller_phone, nil_labels, on_labels, confirmed_labels, unreg_labels, reg_labels, sold_labels, ...rest } = propEditDraft;
      const merged = {
        ...full,
        ...rest,
        sale_status: booking_status ?? full.sale_status,
        contact_phone: rest.contact_phone ?? seller_phone ?? full.contact_phone,
      };
      await updateSaleProperty(propEditId, merged);

      const hasStatusEdits = [nil_labels, on_labels, confirmed_labels, unreg_labels, reg_labels, sold_labels].some(v => v !== undefined);
      if (hasStatusEdits) {
        await bulkUpdatePlotStatuses(propEditId, {
          nil_booking: nil_labels,
          on_booking: on_labels,
          confirmed: confirmed_labels,
          unregistered: unreg_labels,
          registered: reg_labels,
          sold: sold_labels,
        });
      }

      setPlots(prev => prev.map(p => p.property_id === propEditId ? { ...p, ...propEditDraft } : p));
      setPropEditId(null);
    } catch (err) { alert('Failed: ' + (err?.response?.data?.error || err.message)); }
    finally { setPropSaving(false); }
  };

  const handleUnitInlineEdit = (u) => {
    setUnitEditId(u.plot_unit_id);
    setUnitEditDraft({ ...u, sold_date: u.sold_date ? String(u.sold_date).slice(0, 10) : '' });
  };
  const handleUnitInlineCancel = () => { setUnitEditId(null); setUnitEditDraft({}); };
  const handleUnitDraftChange = (key, val) => setUnitEditDraft(prev => ({ ...prev, [key]: val }));
  const handleUnitInlineSave = async () => {
    setUnitSaving(true);
    try {
      await updatePlotUnit(unitEditId, unitEditDraft);
      setPlotUnits(prev => prev.map(u => u.plot_unit_id === unitEditId ? { ...u, ...unitEditDraft } : u));
      setUnitEditId(null);
    } catch (err) { alert('Failed: ' + (err?.response?.data?.error || err.message)); }
    finally { setUnitSaving(false); }
  };

  const handleDeleteUnit = async (unit) => {
    setDeleting(true);
    try {
      await deletePlotUnit(unit.plot_unit_id);
      setPlotUnits(prev => prev.filter(u => u.plot_unit_id !== unit.plot_unit_id));
      setDeleteConfirm(null);
    } finally { setDeleting(false); }
  };

  const tabClass = (tab) =>
    `px-5 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Plot Properties</h2>
        <p className="text-gray-500 text-xs uppercase tracking-widest font-bold mt-1">Manage plot layouts and individual units</p>
      </div>

      <div className="flex border-b border-gray-200">
        <button className={tabClass('properties')} onClick={() => setActiveTab('properties')}>Plot Properties</button>
        <button className={tabClass('units')} onClick={() => setActiveTab('units')}>Individual Plots</button>
      </div>

      {activeTab === 'properties' && (
        loading ? <Loader /> : (
          <DataTable
            columns={[
              {
                header: 'Property ID',
                accessor: p => p.formatted_id
                  ? <Link href={getAdminPropertyHref(p.formatted_id)} target="_blank" className="font-mono font-semibold text-blue-600 hover:underline">{formatPropertyId(p.formatted_id)}</Link>
                  : '-',
              },
              { header: 'Seller Name', accessor: 'seller_name', editable: true, filterable: true, filterKey: 'seller_name' },
              { header: 'Seller Phone', accessor: 'seller_phone', editable: true, editField: 'contact_phone', filterable: true, filterKey: 'seller_phone' },
              { header: 'Alt Phone', accessor: 'alternate_contact_phone', editable: true, filterable: true, filterKey: 'alternate_contact_phone' },
              { header: 'Alt Name', accessor: 'alternate_seller_name', editable: true, filterable: true, filterKey: 'alternate_seller_name' },
              {
                header: 'Approval', sortable: true, sortBy: p => p.status || '',
                accessor: (p) => <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${getApprovalClasses(p.status)}`}>{p.status || 'pending'}</span>,
                editable: true, editType: 'select', editField: 'status',
                editOptions: [{ value: 'pending', label: 'Pending' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }],
              },
              {
                header: 'Booking Status', sortable: true, sortBy: p => p.booking_status || '',
                accessor: (p) => <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${STATUS_COLORS[p.booking_status] || 'bg-gray-100 text-gray-600'}`}>{p.booking_status || 'Nil Booking'}</span>,
                editable: true, editType: 'select', editField: 'booking_status',
                editOptions: SALE_STATUS_OPTIONS.map(v => ({ value: v, label: v })),
              },
              { header: 'Rate (₹)', accessor: p => p.price ? `₹${Number(p.price).toLocaleString()}${p.rate_unit ? ' / ' + p.rate_unit : ''}` : '-', editable: true, editType: 'number', editField: 'price', filterable: true, filterKey: 'price' },
              { header: 'Rate Unit', accessor: p => p.rate_unit || '-', editable: true, editType: 'select', editField: 'rate_unit', editOptions: RATE_UNIT_OPTIONS.map(v => ({ value: v, label: v || '— None —' })), filterable: true, filterKey: 'rate_unit' },
              { header: 'Extent Area', accessor: 'extension', editable: true, filterable: true, filterKey: 'extension' },
              { header: 'Extent Unit', accessor: p => p.area_size || '-', editable: true, editType: 'select', editField: 'area_size', editOptions: EXTENT_UNIT_OPTIONS.map(v => ({ value: v, label: v || '— None —' })), filterable: true, filterKey: 'area_size' },
              { header: 'Survey No.', accessor: 'survey_number', editable: true, filterable: true, filterKey: 'survey_number' },
              { header: 'Layout Name', accessor: 'layout_name', editable: true, filterable: true, filterKey: 'layout_name' },
              { header: 'Token Amt', accessor: p => p.token_amount ? `₹${Number(p.token_amount).toLocaleString()}` : '-', editable: true, editType: 'number', editField: 'token_amount', filterable: true, filterKey: 'token_amount' },
              { header: 'Token Paid To', accessor: 'token_paid_to', editable: true, editType: 'select', editOptions: TOKEN_PAID_TO_OPTIONS.map(v => ({ value: v, label: v || '— None —' })), filterable: true, filterKey: 'token_paid_to' },
              { header: 'Advance Amt', accessor: p => p.advance_amount ? `₹${Number(p.advance_amount).toLocaleString()}` : '-', editable: true, editType: 'number', editField: 'advance_amount', filterable: true, filterKey: 'advance_amount' },
              { header: 'Sold Rate', accessor: p => p.sold_rate ? `₹${Number(p.sold_rate).toLocaleString()}` : '-', editable: true, editType: 'number', editField: 'sold_rate', filterable: true, filterKey: 'sold_rate' },
              { header: 'Sold Date', accessor: p => p.sold_date ? String(p.sold_date).slice(0, 10) : '-', editable: true, editType: 'date', editField: 'sold_date', filterable: true, filterKey: 'sold_date' },
              { header: 'DTCP', accessor: 'dtcp', editable: true, filterable: true, filterKey: 'dtcp' },
              { header: 'Sub Reg. Office', accessor: 'sub_registrar_office', editable: true, filterable: true, filterKey: 'sub_registrar_office' },
              {
                header: 'Total', accessor: (p) => <span className="font-bold text-blue-700">{p.total_plots ?? 0}</span>,
                sortable: true, sortBy: p => Number(p.total_plots) || 0,
              },
              {
                header: 'Nil', sortable: true, sortBy: p => Number(p.nil_booking_count) || 0,
                accessor: (p) => <LabelCell labels={p.nil_booking} colorClass="text-gray-500" />,
                editable: true, editType: 'text', editField: 'nil_labels',
              },
              {
                header: 'On Bkg', sortable: true, sortBy: p => Number(p.on_booking_count) || 0,
                accessor: (p) => <LabelCell labels={p.on_booking} colorClass="text-yellow-700" />,
                editable: true, editType: 'text', editField: 'on_labels',
              },
              {
                header: 'Confirmed', sortable: true, sortBy: p => Number(p.confirmed_count) || 0,
                accessor: (p) => <LabelCell labels={p.confirmed} colorClass="text-red-600" />,
                editable: true, editType: 'text', editField: 'confirmed_labels',
              },
              {
                header: 'Unreg', sortable: true, sortBy: p => Number(p.unregistered_count) || 0,
                accessor: (p) => <LabelCell labels={p.unregistered} colorClass="text-red-700" />,
                editable: true, editType: 'text', editField: 'unreg_labels',
              },
              {
                header: 'Reg', sortable: true, sortBy: p => Number(p.registered_count) || 0,
                accessor: (p) => <LabelCell labels={p.registered} colorClass="text-red-800" />,
                editable: true, editType: 'text', editField: 'reg_labels',
              },
              {
                header: 'Sold', sortable: true, sortBy: p => Number(p.sold_count) || 0,
                accessor: (p) => <LabelCell labels={p.sold} colorClass="text-gray-800" />,
                editable: true, editType: 'text', editField: 'sold_labels',
              },
              { header: 'Address', accessor: 'address', editable: true, editType: 'textarea', filterable: true, filterKey: 'address' },
              { header: 'Latitude', accessor: 'latitude', filterable: true, filterKey: 'latitude' },
              { header: 'Longitude', accessor: 'longitude', filterable: true, filterKey: 'longitude' },
              { header: 'Created', accessor: (p) => p.created_at?.split('T')[0] || '-', sortable: true, sortBy: p => new Date(p.created_at).getTime(), className: 'text-xs text-gray-500' },
            ]}
            data={plots}
            emptyMessage="No plot properties found"
            editingRowId={propEditId}
            editDraft={propEditDraft}
            onEditDraftChange={handlePropDraftChange}
            onCellDoubleClick={handlePropInlineEdit}
            cellSaving={propSaving}
            actions={(p, isRowEditing) => (
              <div className="flex gap-1 items-center">
                {isRowEditing ? (
                  <>
                    <button onClick={handlePropInlineSave} disabled={propSaving} className="px-2 py-1 text-[10px] font-bold text-white bg-amber-500 rounded-lg hover:bg-amber-600 disabled:opacity-60 uppercase">
                      {propSaving ? '…' : 'Save'}
                    </button>
                    <button onClick={handlePropInlineCancel} className="px-2 py-1 text-[10px] font-bold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 uppercase">✕</button>
                  </>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleOpenEditor(p); }}
                    className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-lg border border-blue-100 hover:bg-blue-100 uppercase tracking-widest"
                  >
                    Editor
                  </button>
                )}
              </div>
            )}
          />
        )
      )}

      {activeTab === 'units' && (
        unitsLoading ? <Loader /> : (
          <DataTable
            columns={[
              { header: 'Unit ID', accessor: 'plot_unit_id', className: 'font-mono text-xs text-gray-500' },
              {
                header: 'Property',
                accessor: u => u.property_formatted_id
                  ? <Link href={getAdminPropertyHref(u.property_formatted_id)} target="_blank" className="font-mono text-xs text-blue-600 hover:underline">{formatPropertyId(u.property_formatted_id)}</Link>
                  : '-',
              },
              { header: 'Plot #', accessor: 'plot_number', className: 'font-bold' },
              {
                header: 'Status', sortable: true, sortBy: u => u.status || '',
                accessor: (u) => <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${STATUS_COLORS[u.status] || 'bg-gray-100 text-gray-600'}`}>{u.status || 'Nil Booking'}</span>,
                editable: true, editType: 'select', editField: 'status',
                editOptions: UNIT_STATUS_OPTIONS.map(v => ({ value: v, label: v })),
              },
              { header: 'Token Amt', accessor: u => u.token_amount ? `₹${Number(u.token_amount).toLocaleString()}` : '-', editable: true, editType: 'number', editField: 'token_amount', filterable: true, filterKey: 'token_amount' },
              { header: 'Token Paid To', accessor: 'token_paid_to', editable: true, editType: 'select', editOptions: TOKEN_PAID_TO_OPTIONS.map(v => ({ value: v, label: v || '— None —' })), filterable: true, filterKey: 'token_paid_to' },
              { header: 'Advance Amt', accessor: u => u.advance_amount ? `₹${Number(u.advance_amount).toLocaleString()}` : '-', editable: true, editType: 'number', editField: 'advance_amount', filterable: true, filterKey: 'advance_amount' },
              { header: 'Sold Rate', accessor: u => u.sold_rate ? `₹${Number(u.sold_rate).toLocaleString()}` : '-', editable: true, editType: 'number', editField: 'sold_rate', filterable: true, filterKey: 'sold_rate' },
              { header: 'Sold Date', accessor: u => u.sold_date ? String(u.sold_date).slice(0, 10) : '-', editable: true, editType: 'date', editField: 'sold_date', filterable: true, filterKey: 'sold_date' },
              { header: 'Doc Number', accessor: 'document_number', editable: true, filterable: true, filterKey: 'document_number' },
              { header: 'Buyer Phone', accessor: 'buyer_phone', className: 'font-mono text-xs', filterable: true, filterKey: 'buyer_phone' },
            ]}
            data={plotUnits}
            emptyMessage="No plot units found"
            editingRowId={unitEditId}
            editDraft={unitEditDraft}
            onEditDraftChange={handleUnitDraftChange}
            onCellDoubleClick={handleUnitInlineEdit}
            cellSaving={unitSaving}
            actions={(u, isRowEditing) => (
              <div className="flex gap-1 items-center">
                {isRowEditing ? (
                  <>
                    <button onClick={handleUnitInlineSave} disabled={unitSaving} className="px-2 py-1 text-[10px] font-bold text-white bg-amber-500 rounded-lg hover:bg-amber-600 disabled:opacity-60 uppercase">
                      {unitSaving ? '…' : 'Save'}
                    </button>
                    <button onClick={handleUnitInlineCancel} className="px-2 py-1 text-[10px] font-bold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 uppercase">✕</button>
                  </>
                ) : (
                  <button onClick={() => setDeleteConfirm(u)} className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-100" title="Delete">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                )}
              </div>
            )}
          />
        )
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full space-y-4">
            <h3 className="font-black text-gray-800">Delete Plot {deleteConfirm.plot_number}?</h3>
            <p className="text-sm text-gray-500">This will remove the unit record. The layout element remains in the editor.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold">Cancel</button>
              <button onClick={() => handleDeleteUnit(deleteConfirm)} disabled={deleting} className="flex-1 py-2 bg-red-500 text-white rounded-xl text-sm font-bold disabled:opacity-50">
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
