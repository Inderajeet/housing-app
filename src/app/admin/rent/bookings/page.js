'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import DataTable from '@/components/admin/DataTable';
import Loader from '@/components/admin/Loader';
import { getBookings } from '@/lib/adminApi';

const BOOKING_STATUSES = [
  { value: 'booked', label: 'Booked', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { value: 'token_paid', label: 'Token Paid', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'advance_paid', label: 'Advance Paid', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  { value: 'closed', label: 'Closed', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800 border-red-200' },
  { value: 'expired', label: 'Expired', color: 'bg-gray-100 text-gray-800 border-gray-200' },
];

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

export default function RentBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({ dateRange: 'all', startDate: '', endDate: '', status: 'all' });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const statusFilter = filters.status !== 'all' ? filters.status : null;
      const response = await getBookings('rent', statusFilter);
      const data = response.data || response;
      setBookings(Array.isArray(data) ? data : []);
      setFilteredBookings(Array.isArray(data) ? data : []);
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
        (b.formatted_id || b.property_id || '').toLowerCase().includes(q)
      );
    }
    setFilteredBookings(result);
  }, [filters, bookings, searchQuery]);

  const handleExport = () => {
    const data = filteredBookings.map((b) => ({
      'Booking ID': `BK-${b.booking_id}`,
      'Property ID': b.formatted_id || b.property_id,
      'Buyer': b.buyer_name || b.buyer_phone || '-',
      'Phone': b.buyer_phone || '-',
      'Status': b.status?.toUpperCase() || '-',
      'Token Amount': formatCurrency(b.token_amount),
      'Booking Date': formatDateShort(b.locked_at),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rent_Bookings');
    XLSX.writeFile(wb, `Rent_Bookings_${new Date().toLocaleDateString()}.xlsx`);
  };

  const handleView = useCallback((row) => { setSelected(row); setIsViewOpen(true); }, []);

  const columns = useMemo(() => [
    { header: 'Booking ID', accessor: (b) => `BK-${b.booking_id}`, className: 'font-semibold text-blue-600 font-mono text-xs' },
    { header: 'Property ID', accessor: (b) => b.formatted_id || b.property_id, className: 'font-mono text-sm font-semibold' },
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
    {
      header: 'Actions',
      accessor: (b) => (
        <button onClick={(e) => { e.stopPropagation(); handleView(b); }} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors" title="View">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </button>
      ),
    },
  ], [handleView]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Rent Bookings</h2>
          <p className="text-gray-500 text-xs uppercase tracking-widest font-bold mt-1">Manage rental property bookings</p>
        </div>
        <button onClick={handleExport} disabled={filteredBookings.length === 0} className="bg-white border border-gray-300 text-gray-700 px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
          Export Excel ({filteredBookings.length})
        </button>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex flex-col space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Search</label>
            <div className="relative">
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buyer, phone, property ID..." className="pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-blue-500/20 w-52" />
              <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
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
          <button onClick={() => setFilters({ dateRange: 'all', startDate: '', endDate: '', status: 'all' })} className="text-[10px] font-bold text-red-500 uppercase pb-3 hover:underline">Reset</button>
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
          <DataTable columns={columns} data={filteredBookings} emptyMessage="No rent bookings found" onRowClick={handleView} />
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
            <div className="px-8 py-6 border-t flex justify-end bg-gray-50 shrink-0">
              <button onClick={() => setIsViewOpen(false)} className="px-6 py-2 rounded-xl border border-gray-300 font-bold text-xs uppercase text-gray-600 hover:bg-gray-100">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
