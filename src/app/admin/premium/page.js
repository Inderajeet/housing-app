'use client';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import DataTable from '@/components/admin/DataTable';
import Loader from '@/components/admin/Loader';
import {
  getPremiumProperties, addPremiumProperty, requestPremiumProperty,
  updatePremiumProperty, removePremiumProperty, getRentProperties, getSaleProperties,
} from '@/lib/adminApi';
import { formatPropertyId, getPropertyHref } from '@/utils/propertyRouting';

const lbl = 'text-[10px] font-bold uppercase tracking-widest text-gray-500';
const fw = 'flex flex-col space-y-2';
const inp = 'w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold text-sm';
const dropCls = 'px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-blue-500/20 transition-all';

const formatDate = (d) => {
  if (!d) return 'N/A';
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(d));
};

const getDaysRemaining = (endDate) => {
  if (!endDate) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const end = new Date(endDate); end.setHours(0, 0, 0, 0);
  return Math.ceil((end - today) / 86400000);
};

function PremiumPageInner() {
  const searchParams = useSearchParams();
  const type = searchParams.get('type') || 'rent';

  const [view, setView] = useState('requested');
  const [allRows, setAllRows] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(false);

  const [dateRange, setDateRange] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState({ property_id: '', formatted_id: '', start_date: '', end_date: '', priority_order: '', is_paid: false });
  const [submitting, setSubmitting] = useState(false);

  const [propertySearch, setPropertySearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [allProps, setAllProps] = useState([]);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPremiumProperties({ type, filter: view });
      setAllRows(Array.isArray(res.data) ? res.data : []);
    } finally { setLoading(false); }
  }, [type, view]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    Promise.all([getRentProperties(), getSaleProperties()]).then(([r, s]) => {
      const rent = (r.data || []).map(p => ({ ...p, property_type: 'rent' }));
      const sale = (s.data || []).map(p => ({ ...p, property_type: 'sale' }));
      setAllProps([...rent, ...sale].filter(p => p.property_type === type));
    }).catch(() => {});
  }, [type]);

  useEffect(() => {
    if (propertySearch.length < 2) { setSearchResults([]); return; }
    const q = propertySearch.toLowerCase();
    setSearchResults(
      allProps.filter(p =>
        (p.formatted_id || '').toLowerCase().includes(q) ||
        (p.contact_phone || '').includes(q)
      ).slice(0, 10)
    );
  }, [propertySearch, allProps]);

  // Date filtering
  useEffect(() => {
    let result = [...allRows];
    if (dateRange !== 'all') {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      result = result.filter(p => {
        const raw = view === 'paid' ? p.start_date : p.created_at;
        if (!raw) return false;
        const pDate = new Date(raw); pDate.setHours(0, 0, 0, 0);
        if (dateRange === 'week') {
          const ago = new Date(todayStart); ago.setDate(ago.getDate() - 7);
          return pDate >= ago;
        }
        if (dateRange === 'month') {
          const ago = new Date(todayStart); ago.setMonth(ago.getMonth() - 1);
          return pDate >= ago;
        }
        if (dateRange === 'custom' && startDate && endDate) {
          const s = new Date(startDate); s.setHours(0, 0, 0, 0);
          const e = new Date(endDate); e.setHours(23, 59, 59, 999);
          if (view === 'paid') {
            const pStart = new Date(p.start_date);
            const pEnd = new Date(p.end_date);
            return pStart <= e && pEnd >= s;
          }
          return pDate >= s && pDate <= e;
        }
        return true;
      });
    }
    setFiltered(result);
  }, [allRows, dateRange, startDate, endDate, view]);

  const openAddModal = () => {
    setEditTarget(null);
    setForm({ property_id: '', formatted_id: '', start_date: '', end_date: '', priority_order: '', is_paid: false });
    setPropertySearch('');
    setSearchResults([]);
    setIsModalOpen(true);
  };

  const openActivateModal = (row) => {
    setEditTarget(null);
    setForm({
      property_id: row.property_id,
      formatted_id: row.formatted_id,
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      priority_order: '',
      is_paid: true,
    });
    setPropertySearch(row.formatted_id || '');
    setSearchResults([]);
    setIsModalOpen(true);
  };

  const openEditModal = (row) => {
    setEditTarget(row);
    setForm({
      property_id: row.property_id,
      formatted_id: row.formatted_id,
      start_date: row.start_date ? String(row.start_date).slice(0, 10) : '',
      end_date: row.end_date ? String(row.end_date).slice(0, 10) : '',
      priority_order: row.priority_order ?? '',
      is_paid: true,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.property_id) { alert('Please select a property'); return; }
    setSubmitting(true);
    try {
      if (editTarget) {
        await updatePremiumProperty(editTarget.id, {
          start_date: form.start_date || null,
          end_date: form.end_date || null,
          priority_order: form.priority_order || null,
        });
      } else if (form.is_paid) {
        await addPremiumProperty({
          property_id: form.property_id,
          start_date: form.start_date || null,
          end_date: form.end_date || null,
          priority_order: form.priority_order || null,
        });
      } else {
        await requestPremiumProperty(form.property_id);
      }
      setIsModalOpen(false);
      await fetchData();
    } catch (err) {
      alert('Failed: ' + (err?.response?.data?.error || err.message));
    } finally { setSubmitting(false); }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await removePremiumProperty(deleteTarget.id);
      setDeleteTarget(null);
      await fetchData();
    } catch (err) { alert('Failed: ' + err.message); }
    finally { setDeleting(false); }
  };

  const typeLabel = type === 'rent' ? 'Rent' : 'Sale';

  const requestedColumns = [
    {
      header: 'Prop ID',
      accessor: p => p.formatted_id
        ? <Link href={getPropertyHref(p)} target="_blank" className="font-semibold text-emerald-700 hover:underline">{formatPropertyId(p.formatted_id)}</Link>
        : '-',
    },
    { header: 'Phone', accessor: 'contact_phone' },
    { header: 'Location', accessor: p => [p.district_name, p.taluk_name, p.village_name].filter(Boolean).join(', ') || '-' },
    { header: 'Requested On', accessor: p => p.created_at ? formatDate(p.created_at) : '-' },
    {
      header: 'Action',
      accessor: p => (
        <button
          onClick={() => openActivateModal(p)}
          className="text-amber-600 font-bold text-[10px] uppercase underline hover:text-amber-700"
        >
          Activate Now
        </button>
      ),
    },
  ];

  const paidColumns = [
    {
      header: 'ID',
      accessor: p => p.formatted_id
        ? <Link href={getPropertyHref(p)} target="_blank" className="font-semibold text-emerald-700 hover:underline">{formatPropertyId(p.formatted_id)}</Link>
        : '-',
    },
    { header: 'Priority', accessor: p => p.priority_order ?? '-', sortable: true, sortBy: p => p.priority_order ?? 0 },
    { header: 'Validity', accessor: p => `${formatDate(p.start_date)} – ${formatDate(p.end_date)}`, className: 'text-[11px]' },
    {
      header: 'Days Left',
      accessor: p => {
        const days = getDaysRemaining(p.end_date);
        if (days === null) return '-';
        return (
          <span className={`px-2 py-1 rounded-lg font-bold text-[10px] ${days < 0 ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
            {days < 0 ? 'EXPIRED' : `${days} DAYS`}
          </span>
        );
      },
    },
    { header: 'Contact', accessor: 'contact_phone' },
    { header: 'Location', accessor: p => [p.district_name, p.taluk_name, p.village_name].filter(Boolean).join(', ') || '-' },
    {
      header: 'Status',
      accessor: () => <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-[10px] font-bold uppercase">Active</span>,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Premium {typeLabel} Properties</h2>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => setView('requested')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${view === 'requested' ? 'bg-amber-600 text-white shadow-lg shadow-amber-200' : 'bg-gray-100 text-gray-500'}`}
            >
              Requests
            </button>
            <button
              onClick={() => setView('paid')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${view === 'paid' ? 'bg-green-600 text-white shadow-lg shadow-green-200' : 'bg-gray-100 text-gray-500'}`}
            >
              Paid / Active
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={openAddModal}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-blue-200 hover:bg-blue-700"
          >
            + Create Premium
          </button>
          <span id="admin-notification-slot" />
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex flex-wrap gap-6 items-end">
          <div className="flex flex-col space-y-2">
            <label className={lbl}>Date Filter</label>
            <select value={dateRange} onChange={e => { setDateRange(e.target.value); setStartDate(''); setEndDate(''); }} className={dropCls}>
              <option value="all">All Time</option>
              <option value="week">Past Week</option>
              <option value="month">Past Month</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
          {dateRange !== 'all' && (
            <button onClick={() => { setDateRange('all'); setStartDate(''); setEndDate(''); }} className="text-[10px] font-bold text-red-500 uppercase pb-3 hover:underline">
              Reset
            </button>
          )}
        </div>
        {dateRange === 'custom' && (
          <div className="flex gap-4 pt-2 border-t border-gray-50">
            <div className={fw}>
              <label className={lbl}>From</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold" />
            </div>
            <div className={fw}>
              <label className={lbl}>To</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold" />
            </div>
          </div>
        )}
      </div>

      {loading ? <Loader /> : (
        <DataTable
          columns={view === 'requested' ? requestedColumns : paidColumns}
          data={filtered}
          onEdit={view === 'paid' ? openEditModal : undefined}
          actions={view === 'paid' ? (p => (
            <button
              onClick={() => setDeleteTarget(p)}
              className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-100"
              title="Remove Premium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          )) : undefined}
        />
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="!m-0 fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-8 py-5 border-b flex justify-between items-center bg-gray-50/50">
              <h3 className="text-xl font-bold uppercase tracking-tight text-gray-800">
                {editTarget ? 'Edit Premium' : 'Create Premium'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-2xl text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="p-8 space-y-6">
              {/* Property search */}
              {!editTarget ? (
                <div className={fw}>
                  <label className={lbl}>Search {typeLabel} Property (ID or Phone)</label>
                  <input
                    value={propertySearch}
                    onChange={e => setPropertySearch(e.target.value)}
                    placeholder="Type formatted ID or phone number…"
                    className={inp}
                  />
                  {searchResults.length > 0 && (
                    <div className="border border-gray-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                      {searchResults.map(p => (
                        <button
                          key={p.property_id}
                          onClick={() => {
                            setForm(prev => ({ ...prev, property_id: p.property_id, formatted_id: p.formatted_id }));
                            setSearchResults([]);
                            setPropertySearch(p.formatted_id || p.contact_phone);
                          }}
                          className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0"
                        >
                          <span className="font-bold text-blue-600">{p.formatted_id}</span>
                          <span className="ml-2 text-gray-500">{p.contact_phone}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {form.property_id && (
                    <p className="text-xs font-bold text-emerald-600">Selected: {form.formatted_id} (ID: {form.property_id})</p>
                  )}
                </div>
              ) : (
                <div className={fw}>
                  <label className={lbl}>Property</label>
                  <div className="px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm font-bold text-gray-600">{form.formatted_id}</div>
                </div>
              )}

              {/* Payment toggle (only when creating, not editing) */}
              {!editTarget && (
                <div className={fw}>
                  <label className={lbl}>Payment Status</label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, is_paid: false }))}
                      className={`flex-1 py-2.5 rounded-xl font-bold text-xs uppercase border transition-all ${!form.is_paid ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-gray-50 border-gray-200 text-gray-400'}`}
                    >
                      Request Only
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, is_paid: true }))}
                      className={`flex-1 py-2.5 rounded-xl font-bold text-xs uppercase border transition-all ${form.is_paid ? 'bg-green-50 border-green-300 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-400'}`}
                    >
                      Paid / Activate
                    </button>
                  </div>
                </div>
              )}

              {/* Date & priority — shown when paid or editing */}
              {(form.is_paid || editTarget) && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className={fw}>
                      <label className={lbl}>Start Date</label>
                      <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className={inp} />
                    </div>
                    <div className={fw}>
                      <label className={lbl}>End Date</label>
                      <input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} className={inp} />
                    </div>
                  </div>
                  <div className={fw}>
                    <label className={lbl}>Priority Order (higher = shown first)</label>
                    <input type="number" value={form.priority_order} onChange={e => setForm(f => ({ ...f, priority_order: e.target.value }))} className={inp} placeholder="e.g. 10" />
                  </div>
                </div>
              )}
            </div>

            <div className="px-8 py-5 border-t flex justify-end gap-4 bg-gray-50">
              <button onClick={() => setIsModalOpen(false)} className="px-6 py-2 rounded-xl border border-gray-300 font-bold text-xs uppercase text-gray-600 hover:bg-gray-100">Cancel</button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className={`px-8 py-2 rounded-xl font-bold text-xs uppercase shadow-lg text-white disabled:opacity-70 ${form.is_paid || editTarget ? 'bg-green-600 shadow-green-100 hover:bg-green-700' : 'bg-amber-600 shadow-amber-100 hover:bg-amber-700'}`}
              >
                {submitting ? 'Saving…' : editTarget ? 'Update' : form.is_paid ? 'Activate Premium' : 'Save Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl">
            <div className="flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mx-auto mb-4">
              <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h3 className="text-lg font-bold text-center text-gray-900 mb-1">Remove from Premium?</h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              <span className="font-bold text-gray-800">{deleteTarget.formatted_id}</span> will no longer be a sponsored listing.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 font-bold text-xs uppercase text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleDeleteConfirm} disabled={deleting} className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white font-bold text-xs uppercase hover:bg-red-700 disabled:opacity-70">
                {deleting ? 'Removing…' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PremiumPage() {
  return (
    <Suspense fallback={<Loader />}>
      <PremiumPageInner />
    </Suspense>
  );
}
