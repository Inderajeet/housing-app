'use client';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import DataTable from '@/components/admin/DataTable';
import Loader from '@/components/admin/Loader';
import SearchSelect from '@/components/admin/SearchSelect';
import { getEnquiries, createEnquiry, updateEnquiry, markEnquiryRead, getRentProperties, getContactNotes, createContactNote, deleteContactNote, adminApi } from '@/lib/adminApi';
import { formatPropertyId, getPropertyHref } from '@/utils/propertyRouting';

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

const EMPTY_FORM = { property_type: 'rent', property_id: '', buyer_name: '', buyer_phone: '', contacted: false };

const formatDate = (d) => {
  if (!d) return 'N/A';
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(d));
};

const dropdownClass = 'px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-blue-500/20 transition-all';

export default function RentEnquiriesPage() {
  const [enquiries, setEnquiries] = useState([]);
  const [filteredEnquiries, setFilteredEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [enquiryType, setEnquiryType] = useState('buyer');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({ dateRange: 'all', startDate: '', endDate: '' });
  const [form, setForm] = useState(EMPTY_FORM);
  const [contacted, setContacted] = useState(false);
  const [propModalOpen, setPropModalOpen] = useState(false);
  const [propData, setPropData] = useState(null);
  const [propLoading, setPropLoading] = useState(false);
  const [notesTarget, setNotesTarget] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getEnquiries('rent', enquiryType);
      const data = response.data || response;
      setEnquiries(Array.isArray(data) ? data : []);
      setFilteredEnquiries(Array.isArray(data) ? data : []);
    } catch {
      setEnquiries([]);
      setFilteredEnquiries([]);
    } finally {
      setLoading(false);
    }
  }, [enquiryType]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    let result = [...enquiries];
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (filters.dateRange !== 'all') {
      result = result.filter((e) => {
        if (!e.enquiry_date) return false;
        const eDate = new Date(e.enquiry_date);
        eDate.setHours(0, 0, 0, 0);
        if (filters.dateRange === 'week') { const w = new Date(todayStart); w.setDate(todayStart.getDate() - 7); return eDate >= w; }
        if (filters.dateRange === 'month') { const m = new Date(todayStart); m.setMonth(todayStart.getMonth() - 1); return eDate >= m; }
        if (filters.dateRange === 'custom' && filters.startDate && filters.endDate) {
          const s = new Date(filters.startDate); s.setHours(0, 0, 0, 0);
          const en = new Date(filters.endDate); en.setHours(23, 59, 59, 999);
          return eDate >= s && eDate <= en;
        }
        return true;
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((e) =>
        (e.buyer_phone || e.seller_phone || e.contact_phone || '').includes(q) ||
        (e.formatted_id || '').toLowerCase().includes(q) ||
        (e.buyer_name || e.seller_name || '').toLowerCase().includes(q)
      );
    }
    setFilteredEnquiries(result);
  }, [filters, enquiries, searchQuery]);

  const handleExport = () => {
    const data = filteredEnquiries.map((e) => ({
      Enquiry_ID: e.enquiry_id,
      Type: enquiryType.toUpperCase(),
      Name: e.buyer_name || e.seller_name || 'N/A',
      Phone: e.buyer_phone || e.seller_phone || 'N/A',
      Date: formatDate(e.enquiry_date),
      Property_ID: e.formatted_id || 'N/A',
      Contacted: e.contacted ? 'YES' : 'NO',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rent_Enquiries');
    XLSX.writeFile(wb, `Rent_Enquiries_${enquiryType}_Export.xlsx`);
  };

  const handleView = useCallback((row) => {
    setSelected(row);
    setContacted(row.contacted);
    setIsViewOpen(true);
    if (!row.is_read) {
      const markLocalRead = (list) => list.map((e) => (e.enquiry_id === row.enquiry_id ? { ...e, is_read: true } : e));
      setEnquiries((prev) => markLocalRead(prev));
      setFilteredEnquiries((prev) => markLocalRead(prev));
      markEnquiryRead(row.enquiry_id).catch(() => {});
    }
  }, []);

  const handleUpdate = async () => {
    if (!selected) return;
    try {
      await updateEnquiry(selected.enquiry_id, { contacted });
      setIsViewOpen(false);
      loadData();
    } catch {
      alert('Failed to update enquiry');
    }
  };

  const handleCreate = async () => {
    if (!form.buyer_phone || !form.property_id) return alert('Please fill required fields');
    try {
      await createEnquiry({ ...form, enquiry_type: 'buyer' });
      setForm(EMPTY_FORM);
      setIsCreateOpen(false);
      loadData();
    } catch {
      alert('Failed to create enquiry');
    }
  };

  const handleViewProperty = async (e, event) => {
    event.stopPropagation();
    setPropData(null);
    setPropModalOpen(true);
    setPropLoading(true);
    try {
      const res = await adminApi.get(`/rent/${e.property_id}`);
      setPropData(res.data);
    } catch {
      setPropData({ _error: 'Failed to load property details' });
    } finally {
      setPropLoading(false);
    }
  };

  const columns = useMemo(() => [
    {
      header: 'ID',
      accessor: (e) => e.formatted_id
        ? <Link href={getPropertyHref(e)} target="_blank" onClick={(ev) => ev.stopPropagation()} className="font-semibold text-blue-600 hover:underline">{formatPropertyId(e.formatted_id)}</Link>
        : 'N/A',
      className: 'font-semibold text-blue-600',
    },
    {
      header: 'Type',
      accessor: (e) => (
        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${e.enquiry_type === 'seller' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
          {e.enquiry_type === 'seller' ? 'SELLER' : 'BUYER'}
        </span>
      ),
    },
    { header: 'Phone', accessor: (e) => <div className="font-mono text-sm">{e.buyer_phone || e.seller_phone || e.contact_phone || 'N/A'}</div>, className: 'min-w-[140px]' },
    { header: 'Date', accessor: (e) => formatDate(e.enquiry_date), className: 'text-xs text-gray-600' },
    {
      header: 'Contacted',
      accessor: (e) => (
        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${e.contacted ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
          {e.contacted ? 'YES' : 'NO'}
        </span>
      ),
    },
    {
      header: 'Actions',
      accessor: (e) => (
        <div className="flex items-center gap-2">
          <button onClick={(ev) => { ev.stopPropagation(); handleView(e); }} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors" title="View">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
          <button onClick={(ev) => handleViewProperty(e, ev)} className="p-2 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors" title="View Property">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </button>
          <button
            onClick={(ev) => {
              ev.stopPropagation();
              const phone = e.buyer_phone || e.seller_phone || e.contact_phone;
              if (!phone) return;
              let p = phone.replace(/\D/g, '');
              if (p.length === 10) p = '91' + p;
              const name = e.buyer_name || e.seller_name || 'there';
              window.open(`https://wa.me/${p}?text=${encodeURIComponent(`Hi ${name}, regarding your rent enquiry...`)}`, '_blank');
            }}
            className="bg-emerald-500 text-white p-2 rounded-lg hover:bg-emerald-600 transition-colors"
            title="WhatsApp"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.119.554 4.107 1.523 5.836L0 24l6.335-1.499A11.946 11.946 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.006-1.369l-.36-.214-3.732.883.936-3.619-.235-.372A9.818 9.818 0 1112 21.818z" />
            </svg>
          </button>
          <button
            onClick={(ev) => {
              ev.stopPropagation();
              const name = e.buyer_name || e.seller_name || e.buyer_phone || e.seller_phone || 'Enquiry';
              setNotesTarget({
                title: `${name} · Enquiry #${e.formatted_id || e.enquiry_id}`,
                params: {
                  enquiry_id: e.enquiry_id,
                  ...(e.buyer_id ? { buyer_id: e.buyer_id } : {}),
                  ...(e.seller_id ? { seller_id: e.seller_id } : {}),
                  ...(e.property_id ? { property_id: e.property_id } : {}),
                },
              });
            }}
            className="p-2 hover:bg-indigo-50 rounded-lg text-indigo-500 transition-colors"
            title="Contact Notes"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h6m-6 4h10M5 4h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />
            </svg>
          </button>
        </div>
      ),
    },
  ], [handleView, setNotesTarget]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Rent Enquiries</h2>
          <p className="text-gray-500 text-xs uppercase tracking-widest font-bold mt-1">Lead Management</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleExport} className="bg-white border border-gray-300 text-gray-700 px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-50">Export Excel</button>
          <button onClick={() => setIsCreateOpen(true)} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold text-xs uppercase shadow-lg shadow-blue-200 hover:bg-blue-700">+ New Enquiry</button>
          <span id="admin-notification-slot" />
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex flex-col space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Search</label>
            <div className="relative">
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Phone, ID, name..." className="pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-blue-500/20 w-48" />
              <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
          </div>
          <div className="flex flex-col space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Enquiry Type</label>
            <div className="flex gap-2">
              {['buyer', 'seller'].map((t) => (
                <button key={t} onClick={() => setEnquiryType(t)} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${enquiryType === t ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-gray-100 text-gray-500'}`}>{t}</button>
              ))}
            </div>
          </div>
          <div className="flex flex-col space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Date Filter</label>
            <select value={filters.dateRange} onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })} className={dropdownClass}>
              <option value="all">All Time</option>
              <option value="week">Past Week</option>
              <option value="month">Past Month</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
          <button onClick={() => setFilters({ dateRange: 'all', startDate: '', endDate: '' })} className="text-[10px] font-bold text-red-500 uppercase pb-3 hover:underline">Reset</button>
        </div>
        {filters.dateRange === 'custom' && (
          <div className="flex gap-4 pt-2 border-t border-gray-50">
            <input type="date" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold" />
            <input type="date" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold" />
          </div>
        )}
      </div>

      {loading ? <Loader /> : <DataTable columns={columns} data={filteredEnquiries} emptyMessage={`No rent ${enquiryType} enquiries found`} onRowClick={handleView} rowClassName={(e) => !e.is_read ? 'bg-green-50 hover:bg-green-100' : 'hover:bg-blue-50/20'} />}

      {/* View Modal */}
      {isViewOpen && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-8 py-6 border-b flex justify-between items-center bg-gray-50/50">
              <h3 className="text-xl font-bold uppercase tracking-tight text-gray-800">Enquiry Details</h3>
              <button className="text-2xl text-gray-400 hover:text-gray-600" onClick={() => setIsViewOpen(false)}>✕</button>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div><p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Type</p><p className="font-bold text-blue-600">{selected.enquiry_type === 'seller' ? 'SELLER ENQUIRY' : 'BUYER ENQUIRY'}</p></div>
                <div><p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Date</p><p className="font-semibold">{formatDate(selected.enquiry_date)}</p></div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{selected.enquiry_type === 'seller' ? 'Seller' : 'Buyer'}</p>
                  <p className="font-semibold">{selected.buyer_name || selected.seller_name || 'N/A'}</p>
                  <p className="text-sm font-mono text-slate-500">{selected.buyer_phone || selected.seller_phone || 'N/A'}</p>
                </div>
                <div><p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Property ID</p><p className="font-semibold font-mono">{selected.formatted_id || 'N/A'}</p></div>
              </div>
              <div className="p-4 rounded-xl border bg-gray-50">
                <p className="font-bold text-gray-800">{selected.title || 'No Title'}</p>
                <p className="text-xs text-gray-500 mt-1">{selected.property_type?.toUpperCase() || 'RENT'} · {selected.amount ? `₹${Number(selected.amount).toLocaleString()}/mo` : 'Price N/A'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Contacted</p>
                <div className="flex gap-2">
                  {[true, false].map((v) => (
                    <button key={String(v)} onClick={() => setContacted(v)} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${contacted === v ? (v ? 'bg-emerald-600 text-white' : 'bg-red-500 text-white') : 'bg-gray-100 text-gray-500'}`}>
                      {v ? 'Yes' : 'No'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-8 py-6 border-t flex justify-end gap-3 bg-gray-50">
              <button onClick={() => setIsViewOpen(false)} className="px-6 py-2 rounded-xl border border-gray-300 font-bold text-xs uppercase text-gray-600 hover:bg-gray-100">Close</button>
              <button onClick={handleUpdate} className="bg-slate-900 text-white px-8 py-2 rounded-xl font-bold text-xs uppercase hover:bg-slate-800">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-8 py-6 border-b flex justify-between items-center bg-gray-50/50">
              <h3 className="text-xl font-bold uppercase tracking-tight text-gray-800">New Rent Enquiry</h3>
              <button className="text-2xl text-gray-400 hover:text-gray-600" onClick={() => setIsCreateOpen(false)}>✕</button>
            </div>
            <div className="p-8 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400">Buyer Name</label>
                  <input className="px-4 py-2.5 border border-gray-300 rounded-xl font-semibold focus:ring-2 focus:ring-blue-500 outline-none" value={form.buyer_name} onChange={(e) => setForm({ ...form, buyer_name: e.target.value })} />
                </div>
                <div className="flex flex-col space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400">Buyer Phone *</label>
                  <input className="px-4 py-2.5 border border-gray-300 rounded-xl font-mono focus:ring-2 focus:ring-blue-500 outline-none" value={form.buyer_phone} onChange={(e) => setForm({ ...form, buyer_phone: e.target.value })} />
                </div>
              </div>
              <SearchSelect
                label="Select Rent Property *"
                value={form.property_id}
                fetchOptions={(q) =>
                  getRentProperties().then((res) => {
                    const data = res.data || res;
                    return (Array.isArray(data) ? data : []).filter((p) => p.formatted_id?.includes(q) || p.title?.toLowerCase().includes((q || '').toLowerCase()));
                  })
                }
                getOptionValue={(o) => o.property_id}
                getOptionLabel={(o) => `${o.formatted_id} — ${o.title}`}
                onChange={(v) => setForm((p) => ({ ...p, property_id: v }))}
              />
            </div>
            <div className="px-8 py-6 border-t flex justify-end gap-3 bg-gray-50">
              <button onClick={() => setIsCreateOpen(false)} className="px-6 py-2 rounded-xl border border-gray-300 font-bold text-xs uppercase text-gray-600 hover:bg-gray-100">Cancel</button>
              <button onClick={handleCreate} className="bg-blue-600 text-white px-8 py-2 rounded-xl font-bold text-xs uppercase shadow-lg hover:bg-blue-700">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Property Preview Modal */}
      {propModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-8 py-5 border-b flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-bold uppercase tracking-tight text-gray-800">Property Details</h3>
              <button onClick={() => setPropModalOpen(false)} className="text-2xl text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-8">
              {propLoading ? (
                <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>
              ) : propData?._error ? (
                <p className="text-red-500 font-bold text-center py-8">{propData._error}</p>
              ) : propData ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Property ID</p><p className="font-bold font-mono text-blue-700">{propData.formatted_id}</p></div>
                    <div><p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Status</p><p className="font-semibold uppercase">{propData.rent_status || propData.status || '—'}</p></div>
                  </div>
                  <div><p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Title</p><p className="font-semibold">{propData.title || '—'}</p></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Rent/Month</p><p className="font-bold text-lg">₹{Number(propData.rent_amount || 0).toLocaleString()}</p></div>
                    <div><p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">BHK</p><p className="font-semibold">{propData.bhk || '—'}</p></div>
                  </div>
                  <div><p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Owner</p><p className="font-semibold">{propData.seller_name || '—'}</p><p className="text-sm font-mono text-slate-500">{propData.contact_phone || '—'}</p></div>
                </div>
              ) : null}
            </div>
            <div className="px-8 py-5 border-t bg-gray-50 flex justify-end">
              <button onClick={() => setPropModalOpen(false)} className="px-6 py-2 rounded-xl border border-gray-300 font-bold text-xs uppercase text-gray-600 hover:bg-gray-100">Close</button>
            </div>
          </div>
        </div>
      )}

      {notesTarget && <ContactNotesModal target={notesTarget} onClose={() => setNotesTarget(null)} />}
    </div>
  );
}
