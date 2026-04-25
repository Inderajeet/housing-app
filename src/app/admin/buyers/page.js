'use client';
import { useState, useEffect, useCallback } from 'react';
import DataTable from '@/components/admin/DataTable';
import Loader from '@/components/admin/Loader';
import { getBuyers, updateBuyer, getBuyerEnquiries } from '@/lib/adminApi';

const EMPTY_FORM = { name: '', phone_number: '', email: '', address: '' };

export default function BuyersPage() {
  const [buyers, setBuyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // 'view' | 'edit'
  const [selectedBuyer, setSelectedBuyer] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [enquiries, setEnquiries] = useState([]);
  const [loadingEnquiries, setLoadingEnquiries] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await getBuyers(); setBuyers(res.data || []); } catch { setBuyers([]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = buyers.filter(b => {
    const q = search.toLowerCase();
    if (!q) return true;
    return `${b.name} ${b.phone_number} ${b.email}`.toLowerCase().includes(q);
  });

  const openModal = async (buyer, mode) => {
    setSelectedBuyer(buyer);
    setForm({ name: buyer.name || '', phone_number: buyer.phone_number || '', email: buyer.email || '', address: buyer.address || '' });
    setEnquiries([]);
    setError('');
    setModal(mode);
    setLoadingEnquiries(true);
    try { const res = await getBuyerEnquiries(buyer.id); setEnquiries(res.data || []); } catch { setEnquiries([]); }
    setLoadingEnquiries(false);
  };

  const handleSave = async () => {
    if (!selectedBuyer) return;
    setSaving(true); setError('');
    try { await updateBuyer(selectedBuyer.id, form); setModal(null); load(); }
    catch (e) { setError(e.response?.data?.message || 'Save failed'); }
    setSaving(false);
  };

  const columns = [
    { header: 'Name', accessor: 'name' },
    { header: 'Phone', accessor: r => <span className="text-blue-600 font-medium">{r.phone_number}</span> },
    { header: 'Email', accessor: 'email' },
    { header: 'Created At', accessor: r => r.created_at ? new Date(r.created_at).toLocaleDateString() : '-' },
    { header: 'Enquiry Count', accessor: r => <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">{r.enquiry_count || 0}</span> },
  ];

  const enquiryColumns = [
    { header: 'Property', accessor: 'formatted_id' },
    { header: 'Type', accessor: 'enquiry_type' },
    { header: 'Status', accessor: r => <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.booking_status === 'BOOKED' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{r.booking_status || '-'}</span> },
    { header: 'Date', accessor: r => r.created_at ? new Date(r.created_at).toLocaleDateString() : '-' },
  ];

  const isReadOnly = modal === 'view';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Buyers</h2>
          <p className="text-gray-500 text-xs uppercase tracking-widest font-bold">Manage Buyers</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div className="relative max-w-sm">
          <input className="pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-emerald-500/20 w-full" placeholder="Search by name / phone / email" value={search} onChange={e => setSearch(e.target.value)} />
          <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
      </div>

      {loading ? <Loader text="Loading buyers..." /> : (
        <DataTable columns={columns} data={filtered} onEdit={row => openModal(row, 'edit')} onView={row => openModal(row, 'view')} />
      )}

      {modal && selectedBuyer && (
        <div className="!m-0 fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-10">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-full flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-8 py-5 border-b bg-gray-50/50">
              <h2 className="text-xl font-bold uppercase tracking-tight text-gray-800">{isReadOnly ? 'Buyer Details' : 'Edit Buyer'}</h2>
              <button onClick={() => setModal(null)} className="text-2xl text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                {[['name','Name'],['phone_number','Phone'],['email','Email'],['address','Address']].map(([k,label]) => (
                  <div key={k} className={k === 'address' ? 'col-span-2' : ''}>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block mb-2">{label}</label>
                    {k === 'address' ? (
                      <textarea className="w-full px-4 py-2.5 rounded-xl border border-gray-200 font-semibold text-sm min-h-[70px]" rows={2} value={form[k] || ''} onChange={e => setForm(f => ({...f, [k]: e.target.value}))} disabled={isReadOnly} />
                    ) : (
                      <input className="w-full px-4 py-2.5 rounded-xl border border-gray-200 font-semibold text-sm" value={form[k] || ''} onChange={e => setForm(f => ({...f, [k]: e.target.value}))} disabled={isReadOnly} />
                    )}
                  </div>
                ))}
              </div>

              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3">Enquiries</h3>
                {loadingEnquiries ? <Loader text="Loading enquiries..." /> : enquiries.length === 0 ? (
                  <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">No enquiries found.</p>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-gray-200">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>{enquiryColumns.map(c => <th key={c.header} className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">{c.header}</th>)}</tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {enquiries.map((row, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            {enquiryColumns.map(c => <td key={c.header} className="px-4 py-2.5 text-sm">{typeof c.accessor === 'function' ? c.accessor(row) : row[c.accessor]}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
            {error && <p className="px-8 py-2 text-sm text-red-600 font-medium">{error}</p>}
            <div className="px-8 py-5 border-t bg-gray-50 flex justify-end gap-4">
              <button onClick={() => setModal(null)} className="px-6 py-2 rounded-xl border border-gray-300 font-bold text-xs uppercase text-gray-600 hover:bg-gray-100">Close</button>
              {!isReadOnly && (
                <button onClick={handleSave} disabled={saving} className="bg-emerald-600 text-white px-8 py-2 rounded-xl font-bold text-xs uppercase shadow-lg hover:bg-emerald-700 disabled:opacity-70">
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
