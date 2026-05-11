'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import DataTable from '@/components/admin/DataTable';
import Loader from '@/components/admin/Loader';
import { getSellers, createSeller, updateSeller, getSellerProperties, getContactNotes, createContactNote, deleteContactNote } from '@/lib/adminApi';

const EMPTY_FORM = { name: '', phone_number: '', alternate_phone: '', email: '', address: '' };

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
    try {
      await createContactNote({ note_text: text.trim(), ...target.params });
      setText('');
      await loadNotes();
    } catch {}
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
          <button
            onClick={handleAdd}
            disabled={sending || !text.trim()}
            className="bg-emerald-600 text-white px-5 py-2 rounded-xl font-bold text-xs uppercase shadow-md hover:bg-emerald-700 disabled:opacity-50"
          >
            {sending ? '…' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SellersPage({ title = 'Sellers Directory', typeFilter = null }) {
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // 'add' | 'edit' | 'view'
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [properties, setProperties] = useState([]);
  const [loadingProps, setLoadingProps] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notesTarget, setNotesTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await getSellers(typeFilter); setSellers(res.data || []); } catch { setSellers([]); }
    setLoading(false);
  }, [typeFilter]);

  useEffect(() => { load(); }, [load]);

  const filtered = sellers.filter(s => {
    const q = search.toLowerCase();
    if (!q) return true;
    return `${s.name} ${s.phone_number}`.toLowerCase().includes(q);
  });

  const openAdd = () => { setForm(EMPTY_FORM); setSelectedSeller(null); setProperties([]); setError(''); setModal('add'); };

  const openModal = async (seller, mode) => {
    setSelectedSeller(seller);
    setForm({ name: seller.name || '', phone_number: seller.phone_number || '', alternate_phone: seller.alternate_phone || '', email: seller.email || '', address: seller.address || '' });
    setProperties([]);
    setError('');
    setModal(mode);
    if (mode !== 'add') {
      setLoadingProps(true);
      try { const res = await getSellerProperties(seller.seller_id); setProperties(res.data || []); } catch { setProperties([]); }
      setLoadingProps(false);
    }
  };

  const openNotes = (seller, extraParams = {}) => {
    setNotesTarget({
      title: `${seller.name}${seller.phone_number ? ' · ' + seller.phone_number : ''}`,
      params: { seller_id: seller.seller_id, ...extraParams },
    });
  };

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      if (modal === 'add') { await createSeller(form); }
      else { await updateSeller(selectedSeller.seller_id, form); }
      setModal(null); load();
    } catch (e) { setError(e.response?.data?.message || 'Save failed'); }
    setSaving(false);
  };

  const columns = [
    { header: 'Name', accessor: 'name' },
    { header: 'Phone', accessor: r => <span className="text-blue-600 font-medium">{r.phone_number}</span> },
    { header: 'Property Count', accessor: r => <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">{r.property_count || 0}</span> },
    { header: 'Created At', accessor: r => r.created_at ? new Date(r.created_at).toLocaleDateString() : '-' },
  ];

  const tableActions = (row) => (
    <div className="flex items-center gap-2">
      {row.phone_number && (
        <a
          href={`https://wa.me/${row.phone_number.replace(/\D/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded-lg text-green-500 hover:bg-green-50"
          title="WhatsApp"
          onClick={e => e.stopPropagation()}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.534 5.858L.057 23.215a.75.75 0 00.928.928l5.357-1.477A11.953 11.953 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.9 0-3.676-.523-5.193-1.432l-.372-.22-3.863 1.065 1.065-3.863-.22-.372A9.959 9.959 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
          </svg>
        </a>
      )}
      <button
        onClick={e => { e.stopPropagation(); openNotes(row); }}
        className="p-1.5 rounded-lg text-indigo-500 hover:bg-indigo-50"
        title="Contact Notes"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h6m-6 4h10M5 4h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />
        </svg>
      </button>
    </div>
  );

  const isReadOnly = modal === 'view';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
          <p className="text-gray-500 text-xs uppercase tracking-widest font-bold">Manage Sellers</p>
        </div>
        <button onClick={openAdd} className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-emerald-200 hover:bg-emerald-700">+ Add Seller</button>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div className="relative max-w-sm">
          <input className="pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-emerald-500/20 w-full" placeholder="Search by name / phone" value={search} onChange={e => setSearch(e.target.value)} />
          <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
      </div>

      {loading ? <Loader text="Loading sellers..." /> : (
        <DataTable columns={columns} data={filtered} onEdit={row => openModal(row, 'edit')} onView={row => openModal(row, 'view')} actions={tableActions} />
      )}

      {modal && (
        <div className="!m-0 fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-10">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-full flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-8 py-5 border-b bg-gray-50/50">
              <h2 className="text-xl font-bold uppercase tracking-tight text-gray-800">{modal === 'add' ? 'Add Seller' : isReadOnly ? 'Seller Details' : 'Edit Seller'}</h2>
              <button onClick={() => setModal(null)} className="text-2xl text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                {[['name','Name'],['phone_number','Phone'],['alternate_phone','Alternate Phone'],['email','Email'],['address','Address']].map(([k,label]) => (
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

              {modal !== 'add' && (
                <div>
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3">Properties</h3>
                  {loadingProps ? <Loader text="Loading properties..." /> : properties.length === 0 ? (
                    <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">No properties found.</p>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-gray-200">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">ID</th>
                            <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Type</th>
                            <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Status</th>
                            <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Created</th>
                            <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {properties.map((p, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="px-4 py-2.5 text-sm font-bold text-emerald-600">{p.formatted_id}</td>
                              <td className="px-4 py-2.5 text-sm">{p.property_type || p.sale_type || '-'}</td>
                              <td className="px-4 py-2.5 text-sm">{p.status || '-'}</td>
                              <td className="px-4 py-2.5 text-sm">{p.created_at ? new Date(p.created_at).toLocaleDateString() : '-'}</td>
                              <td className="px-4 py-2.5">
                                <button
                                  onClick={() => openNotes(selectedSeller, { property_id: p.property_id })}
                                  className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg"
                                >
                                  Notes
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
            {error && <p className="px-8 py-2 text-sm text-red-600 font-medium">{error}</p>}
            <div className="px-8 py-5 border-t bg-gray-50 flex justify-between items-center">
              <div>
                {modal !== 'add' && selectedSeller && (
                  <button
                    onClick={() => openNotes(selectedSeller)}
                    className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-indigo-600 hover:text-indigo-800"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h6m-6 4h10M5 4h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />
                    </svg>
                    All Notes
                  </button>
                )}
              </div>
              <div className="flex gap-4">
                <button onClick={() => setModal(null)} className="px-6 py-2 rounded-xl border border-gray-300 font-bold text-xs uppercase text-gray-600 hover:bg-gray-100">Close</button>
                {!isReadOnly && (
                  <button onClick={handleSave} disabled={saving} className="bg-emerald-600 text-white px-8 py-2 rounded-xl font-bold text-xs uppercase shadow-lg hover:bg-emerald-700 disabled:opacity-70">
                    {saving ? 'Saving…' : modal === 'add' ? 'Create' : 'Save Changes'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {notesTarget && <ContactNotesModal target={notesTarget} onClose={() => setNotesTarget(null)} />}
    </div>
  );
}
