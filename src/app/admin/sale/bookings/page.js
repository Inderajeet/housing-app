'use client';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import DataTable from '@/components/admin/DataTable';
import Loader from '@/components/admin/Loader';
import { getBookings, markBookingRead, getContactNotes, createContactNote, deleteContactNote } from '@/lib/adminApi';
import { formatPropertyId, getAdminPropertyHref } from '@/utils/propertyRouting';

function ContactNotesModal({ target, onClose }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    try { const res = await getContactNotes(target.params); setNotes(res.data || []); } catch { setNotes([]); }
    setLoading(false);
  }, [target.params]);

  useEffect(() => { loadNotes(); }, [loadNotes]);
  useEffect(() => { if (!loading) bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [notes, loading]);

  const handleAdd = async () => {
    if (!text.trim()) return;
    setSending(true);
    try { await createContactNote({ note_text: text.trim(), ...target.params }); setText(''); await loadNotes(); } catch {}
    setSending(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this note?')) return;
    try { await deleteContactNote(id); await loadNotes(); } catch {}
  };

  return (
    <div className="!m-0 fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 md:p-10">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg flex flex-col" style={{ maxHeight: '80vh' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50/50 rounded-t-3xl">
          <div>
            <h3 className="text-base font-bold text-gray-800">Contact Notes</h3>
            <p className="text-xs text-gray-500 font-medium mt-0.5">{target.title}</p>
          </div>
          <button onClick={onClose} className="text-xl text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {loading ? <Loader text="Loading notes..." /> : notes.length === 0 ? (
            <p className="text-center text-gray-400 text-sm font-medium py-8">No notes yet.</p>
          ) : notes.map(n => (
            <div key={n.id} className="bg-gray-50 rounded-2xl px-4 py-3 flex gap-3">
              <div className="flex-1">
                <p className="text-sm text-gray-800">{n.note_text}</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                  {new Date(n.note_date).toLocaleString()}
                  {n.properties && <span className="ml-2 text-emerald-600">#{n.properties.formatted_id}</span>}
                </p>
              </div>
              <button onClick={() => handleDelete(n.id)} className="text-gray-300 hover:text-red-500 text-lg leading-none self-start mt-0.5">✕</button>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <div className="px-6 py-4 border-t bg-gray-50/50 rounded-b-3xl flex gap-3">
          <input
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/20"
            placeholder="Add a note…"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleAdd()}
          />
          <button onClick={handleAdd} disabled={sending || !text.trim()} className="bg-emerald-600 text-white px-5 py-2 rounded-xl font-bold text-xs uppercase shadow-md hover:bg-emerald-700 disabled:opacity-50">
            {sending ? '…' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
}

const BOOKING_STATUSES = [
  { value: 'booked', label: 'Booked', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { value: 'token_paid', label: 'Token Paid', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { value: 'advance_paid', label: 'Advance Paid', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { value: 'closed', label: 'Closed', color: 'bg-red-100 text-red-800 border-red-200' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800 border-red-200' },
  { value: 'expired', label: 'Expired', color: 'bg-gray-100 text-gray-800 border-gray-200' },
];

const SALE_PROPERTY_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'plot', label: 'Plot' },
  { value: 'flat', label: 'Flat' },
  { value: 'house', label: 'House' },
  { value: 'land', label: 'Land' },
];

const getPropertyTypeStyle = (saleType) => {
  if (saleType === 'plot') return 'bg-purple-100 text-purple-700';
  if (saleType === 'flat') return 'bg-indigo-100 text-indigo-700';
  if (saleType === 'house') return 'bg-blue-100 text-blue-700';
  if (saleType === 'land') return 'bg-green-100 text-green-700';
  return 'bg-gray-100 text-gray-700';
};

const getPropertyTypeLabel = (saleType) => {
  if (!saleType) return 'Sale';
  return saleType.charAt(0).toUpperCase() + saleType.slice(1);
};

const formatDateShort = (d) => {
  if (!d) return '-';
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(new Date(d));
};

const formatDate = (d) => {
  if (!d) return '-';
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }).format(new Date(d));
};

const formatCurrency = (amount) => {
  if (!amount || amount === '0' || amount === 0) return '-';
  const n = Number(amount);
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  return `₹${n.toLocaleString('en-IN')}`;
};

const dropdownClass = 'px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-blue-500/20 transition-all';

export default function SaleBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expiryRunning, setExpiryRunning] = useState(false);
  const [expiryResult, setExpiryResult] = useState(null);
  const [notesTarget, setNotesTarget] = useState(null);
  const [filters, setFilters] = useState({ dateRange: 'all', startDate: '', endDate: '', status: 'all', property_type: 'all' });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const statusFilter = filters.status !== 'all' ? filters.status : null;
      const response = await getBookings(null, statusFilter);
      let data = response.data || response;
      if (!Array.isArray(data)) data = [];
      // Keep only sale, plot, flat unit types (all sale-category bookings)
      data = data.filter(b => b.unit_type === 'sale' || b.unit_type === 'plot' || b.unit_type === 'flat');
      setBookings(data);
      setFilteredBookings(data);
    } catch {
      setBookings([]);
      setFilteredBookings([]);
    } finally {
      setLoading(false);
    }
  }, [filters.status]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    let result = [...bookings];
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (filters.property_type !== 'all') {
      result = result.filter(b => (b.sale_type || '').toLowerCase() === filters.property_type);
    }
    if (filters.dateRange !== 'all') {
      result = result.filter((b) => {
        if (!b.locked_at) return false;
        const bDate = new Date(b.locked_at);
        bDate.setHours(0, 0, 0, 0);
        if (filters.dateRange === 'week') { const w = new Date(todayStart); w.setDate(todayStart.getDate() - 7); return bDate >= w; }
        if (filters.dateRange === 'month') { const m = new Date(todayStart); m.setMonth(todayStart.getMonth() - 1); return bDate >= m; }
        if (filters.dateRange === 'custom' && filters.startDate && filters.endDate) {
          const s = new Date(filters.startDate); s.setHours(0, 0, 0, 0);
          const e = new Date(filters.endDate); e.setHours(23, 59, 59, 999);
          return bDate >= s && bDate <= e;
        }
        return true;
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((b) =>
        (b.buyer_name || '').toLowerCase().includes(q) ||
        (b.buyer_phone || '').includes(q) ||
        (b.formatted_id || b.property_id || '').toLowerCase().includes(q) ||
        (b.plot_number ? String(b.plot_number).includes(q) : false)
      );
    }
    setFilteredBookings(result);
  }, [filters, bookings, searchQuery]);

  const handleExport = () => {
    const data = filteredBookings.map((b) => ({
      'Booking ID': `BK-${b.booking_id}`,
      'Property ID': b.formatted_id || b.property_id,
      'Type': getUnitTypeLabel(b.unit_type),
      'Plot #': b.plot_number || '-',
      'Buyer': b.buyer_name || b.buyer_phone || '-',
      'Phone': b.buyer_phone || '-',
      'Status': b.status?.toUpperCase() || '-',
      'Token Amount': formatCurrency(b.token_amount),
      'Booking Date': formatDateShort(b.locked_at),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sale_Bookings');
    XLSX.writeFile(wb, `Sale_Bookings_${new Date().toLocaleDateString()}.xlsx`);
  };

  const handleView = useCallback((row) => {
    setSelected(row);
    setIsViewOpen(true);
    if (!row.is_read) {
      const markLocalRead = (list) => list.map((b) => (b.booking_id === row.booking_id ? { ...b, is_read: true } : b));
      setBookings((prev) => markLocalRead(prev));
      setFilteredBookings((prev) => markLocalRead(prev));
      markBookingRead(row.booking_id).catch(() => {});
    }
  }, []);

  const handleRunExpiryCheck = useCallback(async () => {
    setExpiryRunning(true);
    setExpiryResult(null);
    try {
      const res = await fetch('/api/cron/expire-bookings', { method: 'POST' });
      const data = await res.json();
      setExpiryResult(data);
      if (data.expired > 0) loadData();
    } catch {
      setExpiryResult({ error: 'Failed to run expiry check' });
    } finally {
      setExpiryRunning(false);
    }
  }, [loadData]);

  const columns = useMemo(() => [
    { header: 'Booking ID', accessor: (b) => `BK-${b.booking_id}`, className: 'font-semibold text-blue-600 font-mono text-xs' },
    {
      header: 'Property ID',
      accessor: (b) => b.formatted_id
        ? <Link href={getAdminPropertyHref(b.formatted_id)} target="_blank" onClick={(ev) => ev.stopPropagation()} className="hover:underline">{formatPropertyId(b.formatted_id)}</Link>
        : b.property_id,
      className: 'font-mono text-sm font-semibold',
    },
    {
      header: 'Type',
      accessor: (b) => (
        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${getPropertyTypeStyle(b.sale_type)}`}>
          {getPropertyTypeLabel(b.sale_type)}
        </span>
      ),
    },
    {
      header: 'Plot #',
      accessor: (b) => b.plot_number ? (
        <span className="font-bold text-gray-800">{b.plot_number}</span>
      ) : <span className="text-gray-300 text-xs">—</span>,
    },
    {
      header: 'Buyer',
      accessor: (b) => (
        <div className="font-medium text-sm">
          {b.buyer_name || b.buyer_phone || '-'}
          {b.buyer_name && b.buyer_phone && <span className="text-xs font-mono text-gray-500 ml-1">({b.buyer_phone})</span>}
        </div>
      ),
      className: 'min-w-[200px]',
    },
    {
      header: 'Status',
      accessor: (b) => {
        const s = BOOKING_STATUSES.find((x) => x.value === b.status) || { label: b.status?.toUpperCase() || '-', color: 'bg-gray-100 text-gray-800' };
        return <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${s.color}`}>{s.label}</span>;
      },
    },
    { header: 'Token Amount', accessor: (b) => formatCurrency(b.token_amount), className: 'font-semibold' },
    { header: 'Booking Date', accessor: (b) => formatDateShort(b.locked_at), className: 'text-xs text-gray-600' },
  ], []);

  const renderRowActions = useCallback((b) => (
    <>
      {(b.buyer_phone) && (
        <a
          href={`https://wa.me/${(b.buyer_phone || '').replace(/\D/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded-lg text-green-500 hover:bg-green-50 transition-colors"
          title="WhatsApp"
          onClick={e => e.stopPropagation()}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.534 5.858L.057 23.215a.75.75 0 00.928.928l5.357-1.477A11.953 11.953 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.9 0-3.676-.523-5.193-1.432l-.372-.22-3.863 1.065 1.065-3.863-.22-.372A9.959 9.959 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
          </svg>
        </a>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          const buyer = b.buyer_name || b.buyer_phone || `Booking BK-${b.booking_id}`;
          setNotesTarget({
            title: `${buyer} · BK-${b.booking_id}`,
            params: {
              booking_id: b.booking_id,
              ...(b.buyer_id ? { buyer_id: b.buyer_id } : {}),
              ...(b.property_id ? { property_id: b.property_id } : {}),
            },
          });
        }}
        className="p-1.5 hover:bg-indigo-50 rounded-lg text-indigo-500 transition-colors"
        title="Contact Notes"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h6m-6 4h10M5 4h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />
        </svg>
      </button>
    </>
  ), [setNotesTarget]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Sale Bookings</h2>
          <p className="text-gray-500 text-xs uppercase tracking-widest font-bold mt-1">Manage sale property bookings</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex flex-col items-end gap-1">
            <button
              onClick={handleRunExpiryCheck}
              disabled={expiryRunning}
              className="bg-orange-50 border border-orange-200 text-orange-700 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-orange-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {expiryRunning ? 'Checking…' : 'Run Expiry Check'}
            </button>
            {expiryResult && (
              <p className={`text-[10px] font-bold ${expiryResult.error ? 'text-red-500' : 'text-gray-500'}`}>
                {expiryResult.error
                  ? expiryResult.error
                  : `${expiryResult.expired} booking(s) expired, ${expiryResult.reset?.length ?? 0} unit(s) reset`}
              </p>
            )}
          </div>
          <button onClick={handleExport} disabled={filteredBookings.length === 0} className="bg-white border border-gray-300 text-gray-700 px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
            Export Excel ({filteredBookings.length})
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex flex-col space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Search</label>
            <div className="relative">
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buyer, phone, property ID, plot #..." className="pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-blue-500/20 w-60" />
              <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
          </div>
          <div className="flex flex-col space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Property Type</label>
            <select value={filters.property_type} onChange={(e) => setFilters({ ...filters, property_type: e.target.value })} className={dropdownClass}>
              {SALE_PROPERTY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="flex flex-col space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Status</label>
            <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className={dropdownClass}>
              <option value="all">All Status</option>
              {BOOKING_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="flex flex-col space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Date Range</label>
            <select value={filters.dateRange} onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })} className={dropdownClass}>
              <option value="all">All Time</option>
              <option value="week">Past Week</option>
              <option value="month">Past Month</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
          <button onClick={() => setFilters({ dateRange: 'all', startDate: '', endDate: '', status: 'all', property_type: 'all' })} className="text-[10px] font-bold text-red-500 uppercase pb-3 hover:underline">Reset</button>
        </div>
        {filters.dateRange === 'custom' && (
          <div className="flex gap-4 pt-2 border-t border-gray-50 mt-4">
            <input type="date" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold" />
            <input type="date" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold" />
          </div>
        )}
      </div>

      {loading ? <Loader /> : (
        <div className="overflow-x-auto">
          <DataTable
            columns={columns}
            data={filteredBookings}
            emptyMessage="No sale bookings found"
            onRowClick={handleView}
            onView={handleView}
            actions={renderRowActions}
            rowClassName={(b) => !b.is_read ? 'bg-green-50 hover:bg-green-100' : 'hover:bg-blue-50/20'}
          />
        </div>
      )}

      {isViewOpen && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-full">
            <div className="px-8 py-6 border-b flex justify-between items-center bg-gray-50/50 shrink-0">
              <h3 className="text-xl font-bold uppercase tracking-tight text-gray-800">Booking Details</h3>
              <button className="text-2xl text-gray-400 hover:text-gray-600" onClick={() => setIsViewOpen(false)}>✕</button>
            </div>
            <div className="p-8 overflow-y-auto flex-1 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div><p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Booking ID</p><p className="font-bold font-mono text-lg text-blue-700">BK-{selected.booking_id}</p></div>
                <div><p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Property ID</p><p className="font-semibold font-mono">{selected.formatted_id || selected.property_id}</p></div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Property Type</p>
                  <span className={`inline-block px-3 py-1.5 rounded-lg text-xs font-bold uppercase w-fit ${getPropertyTypeStyle(selected.sale_type)}`}>
                    {getPropertyTypeLabel(selected.sale_type)}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    {selected.unit_type === 'plot' ? 'Plot Number' : 'Unit ID'}
                  </p>
                  <p className="font-semibold font-mono text-gray-800">
                    {selected.unit_type === 'plot'
                      ? (selected.plot_number || selected.unit_id || '-')
                      : (selected.unit_id || '-')}
                  </p>
                </div>
              </div>
              <div className="p-5 bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-200 space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Buyer Information</p>
                <p className="font-bold text-gray-800 text-lg">{selected.buyer_name || selected.buyer_phone || '-'}</p>
                {selected.buyer_name && selected.buyer_phone && <p className="text-sm font-mono text-gray-600">{selected.buyer_phone}</p>}
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Status</p>
                  <span className={`inline-block px-4 py-2 rounded-xl text-xs font-bold uppercase w-fit ${BOOKING_STATUSES.find((s) => s.value === selected.status)?.color || 'bg-gray-100 text-gray-800'}`}>
                    {BOOKING_STATUSES.find((s) => s.value === selected.status)?.label || selected.status || '-'}
                  </span>
                </div>
                <div><p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Token Amount</p><p className="text-xl font-bold">{formatCurrency(selected.token_amount)}</p></div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div><p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Booking Date</p><p className="font-semibold">{formatDate(selected.locked_at)}</p></div>
                <div><p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Expiry Date</p><p className="font-semibold">{formatDate(selected.expires_at) || '-'}</p></div>
              </div>
            </div>
            <div className="px-8 py-6 border-t flex justify-between items-center bg-gray-50 shrink-0">
              <button
                onClick={() => {
                  const buyer = selected.buyer_name || selected.buyer_phone || `BK-${selected.booking_id}`;
                  setNotesTarget({
                    title: `${buyer} · BK-${selected.booking_id}`,
                    params: {
                      booking_id: selected.booking_id,
                      ...(selected.buyer_id ? { buyer_id: selected.buyer_id } : {}),
                      ...(selected.property_id ? { property_id: selected.property_id } : {}),
                    },
                  });
                }}
                className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-indigo-600 hover:text-indigo-800"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h6m-6 4h10M5 4h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />
                </svg>
                Notes
              </button>
              <button onClick={() => setIsViewOpen(false)} className="px-6 py-2 rounded-xl border border-gray-300 font-bold text-xs uppercase text-gray-600 hover:bg-gray-100">Close</button>
            </div>
          </div>
        </div>
      )}

      {notesTarget && <ContactNotesModal target={notesTarget} onClose={() => setNotesTarget(null)} />}
    </div>
  );
}
