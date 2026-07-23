'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DataTable from '@/components/admin/DataTable';
import Loader from '@/components/admin/Loader';
import { getFlatProperties, getFlatLayout, getAllFlatUnits, updateFlatUnit, deleteFlatUnit } from '@/lib/adminApi';
import { formatPropertyId, getAdminPropertyHref, getPropertyHref } from '@/utils/propertyRouting';

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
const RATE_UNIT_OPTIONS = ['', 'sqft', 'cent'];
const EXTENT_UNIT_OPTIONS = ['', 'sqft', 'cent', 'sq.m', 'acre', 'ground', 'guntha', 'kanal', 'marla'];

const getApprovalClasses = (status) => {
  const s = String(status || '').toLowerCase();
  if (s === 'approved') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (s === 'pending') return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  if (s === 'rejected') return 'bg-red-100 text-red-800 border-red-200';
  return 'bg-gray-100 text-gray-600 border-gray-200';
};

function UnitEditModal({ unit, onClose, onSave }) {
  const [form, setForm] = useState({
    status: unit.status || 'Nil Booking',
    token_amount: unit.token_amount || '',
    token_paid_to: unit.token_paid_to || '',
    advance_amount: unit.advance_amount || '',
    sold_rate: unit.sold_rate || '',
    sold_date: unit.sold_date ? String(unit.sold_date).slice(0, 10) : '',
    document_number: unit.document_number || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(form); onClose(); }
    finally { setSaving(false); }
  };

  const inp = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-400';
  const lbl = 'text-[10px] font-bold uppercase text-gray-400 mb-1 block';

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-black text-gray-800">Edit Flat Unit — {unit.flat_number}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 text-xl">✕</button>
        </div>
        <div>
          <label className={lbl}>Status</label>
          <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className={inp}>
            {UNIT_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={lbl}>Token Amount (₹)</label><input type="number" className={inp} value={form.token_amount} onChange={e => setForm(p => ({ ...p, token_amount: e.target.value }))} /></div>
          <div>
            <label className={lbl}>Token Paid To</label>
            <select className={inp} value={form.token_paid_to} onChange={e => setForm(p => ({ ...p, token_paid_to: e.target.value }))}>
              {TOKEN_PAID_TO_OPTIONS.map(o => <option key={o} value={o}>{o || '— None —'}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={lbl}>Advance Amount (₹)</label><input type="number" className={inp} value={form.advance_amount} onChange={e => setForm(p => ({ ...p, advance_amount: e.target.value }))} /></div>
          <div><label className={lbl}>Sold Rate (₹)</label><input type="number" className={inp} value={form.sold_rate} onChange={e => setForm(p => ({ ...p, sold_rate: e.target.value }))} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={lbl}>Sold Date</label><input type="date" className={inp} value={form.sold_date} onChange={e => setForm(p => ({ ...p, sold_date: e.target.value }))} /></div>
          <div><label className={lbl}>Document Number</label><input type="text" className={inp} value={form.document_number} onChange={e => setForm(p => ({ ...p, document_number: e.target.value }))} /></div>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

export default function FlatsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('properties');
  const [flats, setFlats] = useState([]);
  const [flatUnits, setFlatUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unitsLoading, setUnitsLoading] = useState(true);
  const [editUnit, setEditUnit] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getFlatProperties()
      .then(res => { const d = res.data || res; setFlats(Array.isArray(d) ? d : []); })
      .catch(() => setFlats([]))
      .finally(() => setLoading(false));

    getAllFlatUnits()
      .then(res => { const d = res.data || res; setFlatUnits(Array.isArray(d) ? d : []); })
      .catch(() => setFlatUnits([]))
      .finally(() => setUnitsLoading(false));
  }, []);

  const handleOpenEditor = async (p) => {
    try { await getFlatLayout(p.property_id); } catch {}
    router.push(`/admin/flats/editor/${p.property_id}`);
  };

  const handleSaveUnit = async (unit, formData) => {
    await updateFlatUnit(unit.flat_unit_id, formData);
    setFlatUnits(prev => prev.map(u => u.flat_unit_id === unit.flat_unit_id ? { ...u, ...formData } : u));
  };

  const handleDeleteUnit = async (unit) => {
    setDeleting(true);
    try {
      await deleteFlatUnit(unit.flat_unit_id);
      setFlatUnits(prev => prev.filter(u => u.flat_unit_id !== unit.flat_unit_id));
      setDeleteConfirm(null);
    } finally { setDeleting(false); }
  };

  const propertyColumns = [
    {
      header: 'Property ID',
      accessor: p => p.formatted_id
        ? <Link href={getPropertyHref(p)} target="_blank" className="font-mono font-semibold text-blue-600 hover:underline">{formatPropertyId(p.formatted_id)}</Link>
        : '-',
    },
    { header: 'Layout Name', accessor: 'layout_name', className: 'font-semibold text-gray-700' },
    { header: 'Seller Phone', accessor: 'seller_phone', className: 'font-mono text-sm' },
    { header: 'Rate (₹)', accessor: p => p.price ? `₹${Number(p.price).toLocaleString()}${p.rate_unit ? ' / ' + p.rate_unit : ''}` : '-' },
    { header: 'Rate Unit', accessor: p => p.rate_unit || '-' },
    { header: 'Extent Area', accessor: p => p.extension || '-' },
    { header: 'Extent Unit', accessor: p => p.area_size || '-' },
    {
      header: 'Approval', sortable: true, sortBy: p => p.status || '',
      accessor: (p) => (
        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${getApprovalClasses(p.status)}`}>
          {p.status || 'pending'}
        </span>
      ),
    },
    {
      header: 'Booking Status', sortable: true, sortBy: p => p.booking_status || '',
      accessor: (p) => (
        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${STATUS_COLORS[p.booking_status] || 'bg-gray-100 text-gray-600'}`}>
          {p.booking_status || 'Nil Booking'}
        </span>
      ),
    },
    {
      header: 'Total',
      accessor: (p) => <span className="font-bold text-blue-700">{p.unit_count ?? 0}</span>,
      sortable: true, sortBy: p => Number(p.unit_count) || 0,
    },
    {
      header: 'Nil', sortable: true, sortBy: p => Number(p.nil_booking) || 0,
      accessor: (p) => <span className="font-bold text-gray-500">{p.nil_booking ?? 0}</span>,
    },
    {
      header: 'On Bkg', sortable: true, sortBy: p => Number(p.on_booking) || 0,
      accessor: (p) => <span className="font-bold text-yellow-700">{p.on_booking ?? 0}</span>,
    },
    {
      header: 'Confirmed', sortable: true, sortBy: p => Number(p.confirmed) || 0,
      accessor: (p) => <span className="font-bold text-red-600">{p.confirmed ?? 0}</span>,
    },
    {
      header: 'Unreg', sortable: true, sortBy: p => Number(p.unregistered) || 0,
      accessor: (p) => <span className="font-bold text-red-700">{p.unregistered ?? 0}</span>,
    },
    {
      header: 'Reg', sortable: true, sortBy: p => Number(p.registered) || 0,
      accessor: (p) => <span className="font-bold text-red-800">{p.registered ?? 0}</span>,
    },
    {
      header: 'Sold', sortable: true, sortBy: p => Number(p.sold) || 0,
      accessor: (p) => <span className="font-bold text-gray-800">{p.sold ?? 0}</span>,
    },
    {
      header: 'Created',
      accessor: (p) => p.created_at?.split('T')[0] || '-',
      sortable: true, sortBy: p => new Date(p.created_at).getTime(),
      className: 'text-xs text-gray-500',
    },
  ];

  const unitColumns = [
    { header: 'Unit ID', accessor: 'flat_unit_id', className: 'font-mono text-xs text-gray-500' },
    {
      header: 'Property',
      accessor: u => u.property_formatted_id
        ? <Link href={getAdminPropertyHref(u.property_formatted_id)} target="_blank" className="font-mono text-xs text-blue-600 hover:underline">{formatPropertyId(u.property_formatted_id)}</Link>
        : '-',
    },
    { header: 'Flat #', accessor: 'flat_number', className: 'font-bold' },
    {
      header: 'Status', sortable: true, sortBy: u => u.status || '',
      accessor: (u) => (
        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${STATUS_COLORS[u.status] || 'bg-gray-100 text-gray-600'}`}>
          {u.status || 'Nil Booking'}
        </span>
      ),
    },
    { header: 'Token Amt', accessor: u => u.token_amount ? `₹${Number(u.token_amount).toLocaleString()}` : '-', className: 'text-sm' },
    { header: 'Token Paid To', accessor: 'token_paid_to', className: 'text-xs' },
    { header: 'Advance Amt', accessor: u => u.advance_amount ? `₹${Number(u.advance_amount).toLocaleString()}` : '-', className: 'text-sm' },
    { header: 'Sold Rate', accessor: u => u.sold_rate ? `₹${Number(u.sold_rate).toLocaleString()}` : '-', className: 'text-sm' },
    { header: 'Sold Date', accessor: u => u.sold_date ? String(u.sold_date).slice(0, 10) : '-', className: 'text-xs text-gray-500' },
    { header: 'Doc Number', accessor: 'document_number', className: 'text-xs' },
    { header: 'Buyer Phone', accessor: 'buyer_phone', className: 'font-mono text-xs' },
  ];

  const tabClass = (tab) =>
    `px-5 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Flat Properties</h2>
        <p className="text-gray-500 text-xs uppercase tracking-widest font-bold mt-1">Manage flat layouts and individual units</p>
      </div>

      <div className="flex border-b border-gray-200">
        <button className={tabClass('properties')} onClick={() => setActiveTab('properties')}>Flat Properties</button>
        <button className={tabClass('units')} onClick={() => setActiveTab('units')}>Individual Flats</button>
      </div>

      {activeTab === 'properties' && (
        loading ? <Loader /> : (
          <DataTable
            columns={propertyColumns}
            data={flats}
            emptyMessage="No flat properties found"
            actions={(p) => (
              <button
                onClick={(e) => { e.stopPropagation(); handleOpenEditor(p); }}
                className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-lg border border-blue-100 hover:bg-blue-100 uppercase tracking-widest"
              >
                Open Editor
              </button>
            )}
          />
        )
      )}

      {activeTab === 'units' && (
        unitsLoading ? <Loader /> : (
          <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {unitColumns.map(col => (
                    <th key={col.header} className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-gray-500 whitespace-nowrap">
                      {col.header}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {flatUnits.length === 0 ? (
                  <tr><td colSpan={unitColumns.length + 1} className="px-4 py-8 text-center text-gray-400">No flat units found</td></tr>
                ) : flatUnits.map(u => (
                  <tr key={u.flat_unit_id} className="hover:bg-gray-50 transition-colors">
                    {unitColumns.map(col => (
                      <td key={col.header} className={`px-4 py-3 whitespace-nowrap ${col.className || ''}`}>
                        {typeof col.accessor === 'function' ? col.accessor(u) : u[col.accessor] ?? '-'}
                      </td>
                    ))}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button onClick={() => setEditUnit(u)} className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-lg border border-blue-100 hover:bg-blue-100 uppercase">Edit</button>
                        <button onClick={() => setDeleteConfirm(u)} className="px-3 py-1 bg-red-50 text-red-600 text-[10px] font-bold rounded-lg border border-red-100 hover:bg-red-100 uppercase">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {editUnit && (
        <UnitEditModal
          unit={editUnit}
          onClose={() => setEditUnit(null)}
          onSave={(form) => handleSaveUnit(editUnit, form)}
        />
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full space-y-4">
            <h3 className="font-black text-gray-800">Delete Flat {deleteConfirm.flat_number}?</h3>
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
