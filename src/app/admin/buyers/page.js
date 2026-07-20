'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import DataTable from '@/components/admin/DataTable';
import Loader from '@/components/admin/Loader';
import { getBuyers, updateBuyer, getBuyerEnquiries, getContactNotes, createContactNote, deleteContactNote } from '@/lib/adminApi';
import { formatPropertyId, getAdminPropertyHref } from '@/utils/propertyRouting';

const EMPTY_FORM = { name: '', phone_number: '', email: '', address: '' };

function ContactNotesModal({ title, params, onClose }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [noteText, setNoteText] = useState('');
  const [noteDate, setNoteDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const bottomRef = useRef(null);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    try { const res = await getContactNotes(params); setNotes(res.data || []); }
    catch { setNotes([]); }
    setLoading(false);
  }, [JSON.stringify(params)]);

  useEffect(() => { loadNotes(); }, [loadNotes]);

  const handleAdd = async () => {
    if (!noteText.trim()) return;
    setSaving(true);
    try {
      await createContactNote({ note_text: noteText.trim(), note_date: noteDate, ...params });
      setNoteText('');
      setNoteDate(new Date().toISOString().slice(0, 10));
      await loadNotes();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this note?')) return;
    await deleteContactNote(id);
    loadNotes();
  };

  return (
    <div className="!m-0 fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50/50">
          <div>
            <h3 className="text-base font-bold text-gray-800">Contact Notes</h3>
            <p className="text-[10px] font-bold uppercase text-gray-400 tracking-widest">{title}</p>
          </div>
          <button onClick={onClose} className="text-xl text-gray-400 hover:text-gray-600">✕</button>
        </div>

        {/* Notes list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {loading ? <Loader text="Loading notes..." /> : notes.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8 font-medium">No notes yet. Add the first note below.</p>
          ) : (
            notes.map(note => (
              <div key={note.id} className="bg-gray-50 border border-gray-200 rounded-2xl p-4 relative group">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">
                        {new Date(note.note_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                      {note.properties?.formatted_id && (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">
                          {note.properties.formatted_id}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 font-medium whitespace-pre-wrap">{note.note_text}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 text-xs font-black transition-opacity shrink-0"
                    title="Delete note"
                  >✕</button>
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Add note bar */}
        <div className="border-t bg-gray-50 px-4 py-3 space-y-2">
          <div className="flex gap-2">
            <input
              type="date"
              value={noteDate}
              onChange={e => setNoteDate(e.target.value)}
              className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-400 w-36"
            />
          </div>
          <div className="flex gap-2">
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAdd(); }}
              placeholder="Write a note… (Ctrl+Enter to submit)"
              rows={2}
              className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-400 resize-none"
            />
            <button
              onClick={handleAdd}
              disabled={saving || !noteText.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase shadow hover:bg-indigo-700 disabled:opacity-50 self-end"
            >
              {saving ? '…' : 'Add'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

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
  const [notesTarget, setNotesTarget] = useState(null); // { buyer, params, title }

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
    try { const res = await getBuyerEnquiries(buyer.id || buyer.buyer_id); setEnquiries(res.data || []); } catch { setEnquiries([]); }
    setLoadingEnquiries(false);
  };

  const openNotes = (buyer) => {
    setNotesTarget({
      title: `${buyer.name || ''} — ${buyer.phone_number}`,
      params: { buyer_id: buyer.buyer_id || buyer.id },
    });
  };

  const handleSave = async () => {
    if (!selectedBuyer) return;
    setSaving(true); setError('');
    try { await updateBuyer(selectedBuyer.buyer_id || selectedBuyer.id, form); setModal(null); load(); }
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
    {
      header: 'Property',
      accessor: r => r.formatted_id
        ? <Link href={getAdminPropertyHref(r.formatted_id)} target="_blank" className="font-semibold text-emerald-700 hover:underline">{formatPropertyId(r.formatted_id)}</Link>
        : '-',
    },
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
        <DataTable
          columns={columns}
          data={filtered}
          onEdit={row => openModal(row, 'edit')}
          onView={row => openModal(row, 'view')}
          actions={(row) => (
            <div className="flex items-center gap-1">
              {row.phone_number && (
                <a
                  href={`https://wa.me/91${row.phone_number.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 border border-emerald-100"
                  title="WhatsApp"
                  onClick={e => e.stopPropagation()}
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                </a>
              )}
              <button
                onClick={e => { e.stopPropagation(); openNotes(row); }}
                className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 border border-indigo-100"
                title="Contact Notes"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
              </button>
            </div>
          )}
        />
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
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Enquiries</h3>
                </div>
                {loadingEnquiries ? <Loader text="Loading enquiries..." /> : enquiries.length === 0 ? (
                  <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">No enquiries found.</p>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-gray-200">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>{enquiryColumns.map(c => <th key={c.header} className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">{c.header}</th>)}
                        <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Notes</th></tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {enquiries.map((row, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            {enquiryColumns.map(c => <td key={c.header} className="px-4 py-2.5 text-sm">{typeof c.accessor === 'function' ? c.accessor(row) : row[c.accessor]}</td>)}
                            <td className="px-4 py-2.5">
                              <button
                                onClick={() => setNotesTarget({
                                  title: `Enquiry — ${row.formatted_id || row.enquiry_id}`,
                                  params: { enquiry_id: row.enquiry_id, buyer_id: selectedBuyer.buyer_id || selectedBuyer.id },
                                })}
                                className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-bold uppercase hover:bg-indigo-100 border border-indigo-100"
                              >Notes</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
            {error && <p className="px-8 py-2 text-sm text-red-600 font-medium">{error}</p>}
            <div className="px-8 py-5 border-t bg-gray-50 flex justify-between items-center gap-4">
              <button
                onClick={() => openNotes(selectedBuyer)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold uppercase border border-indigo-100 hover:bg-indigo-100"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                All Notes
              </button>
              <div className="flex gap-4">
                <button onClick={() => setModal(null)} className="px-6 py-2 rounded-xl border border-gray-300 font-bold text-xs uppercase text-gray-600 hover:bg-gray-100">Close</button>
                {!isReadOnly && (
                  <button onClick={handleSave} disabled={saving} className="bg-emerald-600 text-white px-8 py-2 rounded-xl font-bold text-xs uppercase shadow-lg hover:bg-emerald-700 disabled:opacity-70">
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {notesTarget && (
        <ContactNotesModal
          title={notesTarget.title}
          params={notesTarget.params}
          onClose={() => setNotesTarget(null)}
        />
      )}
    </div>
  );
}
