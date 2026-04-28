'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import Loader from '@/components/admin/Loader';
import {
  getContentHeadings, updateContentHeading,
  getAdminBookingFlow, addAdminStage, updateAdminStage, deleteAdminStage,
  addAdminSubtitle, updateAdminSubtitle, deleteAdminSubtitle,
  addAdminPoint, updateAdminPoint, deleteAdminPoint,
  getContentServices, addContentService, updateContentService, deleteContentService,
} from '@/lib/adminApi';

const HEADING_LABELS = {
  booking_process_heading:      'Booking Process Heading',
  booking_process_subtitle_sale:'Sale Sub-heading (Buy it in X steps)',
  booking_process_subtitle_rent:'Rent Sub-heading (Rent in X steps)',
  our_services_heading:         'Our Services Heading',
  our_services_subtitle:        'Our Services Sub-heading',
  property_sold_label:          'Property Sold Label',
  property_rented_label:        'Property Rented Label',
  token_btn_mandi_label:        'Token Button — Pay via Mandi (left)',
  token_btn_owner_label:        'Token Button — Paid to Owner (right)',
  plot_confirm_msg:             'Plot Booking — Confirm within 2 weeks message',
  flat_confirm_msg:             'Flat Booking — Confirm within 2 weeks message',
};

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold transition-all ${toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
      {toast.message}
    </div>
  );
}

function TabBtn({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${active ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
    >
      {label}
    </button>
  );
}

function InlineList({ items, itemKey, itemLabel, onUpdate, onDelete, onAdd, addPlaceholder }) {
  const [editing, setEditing] = useState(null);
  const [editVal, setEditVal] = useState('');
  const [newVal, setNewVal] = useState('');
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const startEdit = (item) => {
    setEditing(item[itemKey]);
    setEditVal(item[itemLabel]);
  };

  const saveEdit = async () => {
    if (!editVal.trim()) return;
    await onUpdate(editing, editVal.trim());
    setEditing(null);
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    try { await onDelete(id); } finally { setDeleting(null); }
  };

  const handleAdd = async () => {
    if (!newVal.trim()) return;
    setAdding(true);
    try { await onAdd(newVal.trim()); setNewVal(''); } finally { setAdding(false); }
  };

  return (
    <div className="space-y-2">
      {items.map(item => (
        <div key={item[itemKey]} className="flex items-center gap-2">
          {editing === item[itemKey] ? (
            <>
              <input
                value={editVal}
                onChange={e => setEditVal(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditing(null); }}
                autoFocus
                className="flex-1 px-3 py-1.5 border border-blue-400 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <button onClick={saveEdit} className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg font-semibold hover:bg-blue-700">Save</button>
              <button onClick={() => setEditing(null)} className="px-3 py-1.5 text-gray-400 text-xs rounded-lg hover:bg-gray-100">Cancel</button>
            </>
          ) : (
            <>
              <span
                className="flex-1 text-sm text-gray-700 bg-gray-50 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-blue-50 hover:text-blue-700 transition-colors"
                onClick={() => startEdit(item)}
              >
                {item[itemLabel]}
              </span>
              <button onClick={() => startEdit(item)} className="text-xs text-blue-500 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50">Edit</button>
              <button
                onClick={() => handleDelete(item[itemKey])}
                disabled={deleting === item[itemKey]}
                className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 disabled:opacity-50"
              >
                {deleting === item[itemKey] ? '...' : 'Del'}
              </button>
            </>
          )}
        </div>
      ))}
      <div className="flex gap-2 mt-1">
        <input
          value={newVal}
          onChange={e => setNewVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
          placeholder={addPlaceholder}
          className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
        />
        <button
          onClick={handleAdd}
          disabled={adding || !newVal.trim()}
          className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
        >
          {adding ? '...' : '+ Add'}
        </button>
      </div>
    </div>
  );
}

function StageCard({ stage, onSaveStage, onDeleteStage, onAddSubtitle, onUpdateSubtitle, onDeleteSubtitle, onAddPoint, onUpdatePoint, onDeletePoint }) {
  const [form, setForm] = useState({ title: stage.title, timeframe: stage.timeframe || '', next_label: stage.next_label });
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setForm({ title: stage.title, timeframe: stage.timeframe || '', next_label: stage.next_label });
    setDirty(false);
  }, [stage.id]);

  const setField = (k, v) => { setForm(f => ({ ...f, [k]: v })); setDirty(true); };

  const save = async () => {
    setSaving(true);
    try { await onSaveStage(stage.id, form); setDirty(false); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { await onDeleteStage(stage.id); } finally { setDeleting(false); setConfirmDelete(false); }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3 bg-slate-50 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2.5 py-1 rounded-lg tracking-wide">{stage.stage_key}</span>
          <span className="text-xs text-gray-400 font-medium">Stage {stage.sort_order + 1}</span>
        </div>
        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-red-500 font-medium">Remove this stage?</span>
            <button onClick={handleDelete} disabled={deleting} className="px-2.5 py-1 bg-red-500 text-white text-xs rounded-lg font-semibold hover:bg-red-600 disabled:opacity-50">
              {deleting ? '...' : 'Yes, delete'}
            </button>
            <button onClick={() => setConfirmDelete(false)} className="px-2.5 py-1 text-gray-500 text-xs rounded-lg hover:bg-gray-100">Cancel</button>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)} className="text-xs text-red-400 hover:text-red-600 px-2.5 py-1 rounded-lg hover:bg-red-50 transition-colors">
            Remove Stage
          </button>
        )}
      </div>
      <div className="p-5 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Title</label>
            <input value={form.title} onChange={e => setField('title', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Timeframe</label>
            <input value={form.timeframe} onChange={e => setField('timeframe', e.target.value)} placeholder="e.g. &lt; 2 weeks" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Button Label</label>
            <input value={form.next_label} onChange={e => setField('next_label', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none" />
          </div>
        </div>
        <button
          onClick={save}
          disabled={saving || !dirty}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-40 transition-all"
        >
          {saving ? 'Saving...' : dirty ? 'Save Changes' : 'Saved'}
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-gray-100">
          <div>
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Subtitles</h4>
            <InlineList
              items={stage.subtitles}
              itemKey="id"
              itemLabel="subtitle_text"
              onAdd={(text) => onAddSubtitle(stage.id, text)}
              onUpdate={onUpdateSubtitle}
              onDelete={onDeleteSubtitle}
              addPlaceholder="Add subtitle line..."
            />
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Bullet Points</h4>
            <InlineList
              items={stage.points}
              itemKey="id"
              itemLabel="point_text"
              onAdd={(text) => onAddPoint(stage.id, text)}
              onUpdate={onUpdatePoint}
              onDelete={onDeletePoint}
              addPlaceholder="Add point..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

const EMPTY_ADD_FORM = { title: '', timeframe: '', next_label: '', stage_key: '' };

function FlowTab({ flow, setFlow, flowType, showToast }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_ADD_FORM);
  const [adding, setAdding] = useState(false);

  const handleAddStage = async () => {
    if (!addForm.title.trim() || !addForm.next_label.trim()) return;
    const stageKey = addForm.stage_key.trim()
      ? addForm.stage_key.trim().toUpperCase().replace(/\s+/g, '_')
      : addForm.title.trim().toUpperCase().replace(/\s+/g, '_');
    setAdding(true);
    try {
      const { data } = await addAdminStage(flowType, {
        stageKey,
        title: addForm.title.trim(),
        timeframe: addForm.timeframe.trim(),
        nextLabel: addForm.next_label.trim(),
      });
      setFlow(prev => [...prev, data]);
      setAddForm(EMPTY_ADD_FORM);
      setShowAddForm(false);
      showToast('Stage added', 'success');
    } catch { showToast('Failed to add stage', 'error'); }
    finally { setAdding(false); }
  };

  const handleDeleteStage = async (id) => {
    try {
      await deleteAdminStage(id);
      setFlow(prev => prev.filter(s => s.id !== id));
      showToast('Stage removed', 'success');
    } catch { showToast('Failed to remove stage', 'error'); }
  };

  const handleSaveStage = async (id, form) => {
    try {
      await updateAdminStage(id, form);
      setFlow(prev => prev.map(s => s.id === id ? { ...s, ...form } : s));
      showToast('Stage updated', 'success');
    } catch { showToast('Failed to save stage', 'error'); }
  };

  const handleAddSubtitle = async (stageId, text) => {
    try {
      const { data: newSub } = await addAdminSubtitle(stageId, text);
      setFlow(prev => prev.map(s => s.id === stageId ? { ...s, subtitles: [...s.subtitles, newSub] } : s));
      showToast('Subtitle added', 'success');
    } catch { showToast('Failed to add subtitle', 'error'); }
  };

  const handleUpdateSubtitle = async (id, text) => {
    try {
      await updateAdminSubtitle(id, text);
      setFlow(prev => prev.map(s => ({ ...s, subtitles: s.subtitles.map(sub => sub.id === id ? { ...sub, subtitle_text: text } : sub) })));
      showToast('Subtitle updated', 'success');
    } catch { showToast('Failed to update subtitle', 'error'); }
  };

  const handleDeleteSubtitle = async (id) => {
    try {
      await deleteAdminSubtitle(id);
      setFlow(prev => prev.map(s => ({ ...s, subtitles: s.subtitles.filter(sub => sub.id !== id) })));
      showToast('Subtitle deleted', 'success');
    } catch { showToast('Failed to delete subtitle', 'error'); }
  };

  const handleAddPoint = async (stageId, text) => {
    try {
      const { data: newPt } = await addAdminPoint(stageId, text);
      setFlow(prev => prev.map(s => s.id === stageId ? { ...s, points: [...s.points, newPt] } : s));
      showToast('Point added', 'success');
    } catch { showToast('Failed to add point', 'error'); }
  };

  const handleUpdatePoint = async (id, text) => {
    try {
      await updateAdminPoint(id, text);
      setFlow(prev => prev.map(s => ({ ...s, points: s.points.map(pt => pt.id === id ? { ...pt, point_text: text } : pt) })));
      showToast('Point updated', 'success');
    } catch { showToast('Failed to update point', 'error'); }
  };

  const handleDeletePoint = async (id) => {
    try {
      await deleteAdminPoint(id);
      setFlow(prev => prev.map(s => ({ ...s, points: s.points.filter(pt => pt.id !== id) })));
      showToast('Point deleted', 'success');
    } catch { showToast('Failed to delete point', 'error'); }
  };

  return (
    <div className="space-y-6">
      {flow.length === 0 && !showAddForm && (
        <p className="text-sm text-gray-400 italic">No stages yet — add one below.</p>
      )}
      {flow.map(stage => (
        <StageCard
          key={stage.id}
          stage={stage}
          onSaveStage={handleSaveStage}
          onDeleteStage={handleDeleteStage}
          onAddSubtitle={handleAddSubtitle}
          onUpdateSubtitle={handleUpdateSubtitle}
          onDeleteSubtitle={handleDeleteSubtitle}
          onAddPoint={handleAddPoint}
          onUpdatePoint={handleUpdatePoint}
          onDeletePoint={handleDeletePoint}
        />
      ))}

      {showAddForm ? (
        <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-5 space-y-4">
          <h3 className="text-sm font-bold text-gray-700">Add New Stage</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Title <span className="text-red-400">*</span></label>
              <input
                value={addForm.title}
                onChange={e => setAddForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Do Registered Document"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Button Label <span className="text-red-400">*</span></label>
              <input
                value={addForm.next_label}
                onChange={e => setAddForm(f => ({ ...f, next_label: e.target.value }))}
                placeholder="e.g. Finalize Property"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Timeframe</label>
              <input
                value={addForm.timeframe}
                onChange={e => setAddForm(f => ({ ...f, timeframe: e.target.value }))}
                placeholder="e.g. &lt; 2 weeks"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Stage Key <span className="text-gray-400 font-normal">(optional, auto from title)</span></label>
              <input
                value={addForm.stage_key}
                onChange={e => setAddForm(f => ({ ...f, stage_key: e.target.value }))}
                placeholder="e.g. FINAL_STEP"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleAddStage}
              disabled={adding || !addForm.title.trim() || !addForm.next_label.trim()}
              className="px-4 py-2 bg-green-600 text-white text-sm rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 transition-all"
            >
              {adding ? 'Adding...' : 'Add Stage'}
            </button>
            <button onClick={() => { setShowAddForm(false); setAddForm(EMPTY_ADD_FORM); }} className="px-4 py-2 text-gray-500 text-sm rounded-xl hover:bg-gray-100 transition-all">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-sm text-gray-400 font-semibold hover:border-blue-300 hover:text-blue-500 transition-all"
        >
          + Add Stage
        </button>
      )}
    </div>
  );
}

function ServicesTab({ services, setServices, stageOptions, showToast }) {
  const defaultStageKey = stageOptions[0]?.key ?? '';
  const [addForm, setAddForm] = useState({ stageKey: defaultStageKey, flowType: 'all', text: '' });
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editVal, setEditVal] = useState('');
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    if (!addForm.stageKey && stageOptions.length) {
      setAddForm(f => ({ ...f, stageKey: stageOptions[0].key }));
    }
  }, [stageOptions]);

  const servicesByStage = stageOptions.reduce((acc, opt) => {
    acc[opt.key] = services.filter(s => s.stage_key === opt.key);
    return acc;
  }, {});

  const handleAdd = async () => {
    if (!addForm.text.trim()) return;
    setAdding(true);
    try {
      const { data } = await addContentService(addForm.stageKey, addForm.flowType, addForm.text.trim());
      setServices(prev => [...prev, data]);
      setAddForm(f => ({ ...f, text: '' }));
      showToast('Service item added', 'success');
    } catch { showToast('Failed to add service', 'error'); }
    finally { setAdding(false); }
  };

  const handleUpdate = async (id) => {
    if (!editVal.trim()) return;
    try {
      await updateContentService(id, editVal.trim());
      setServices(prev => prev.map(s => s.id === id ? { ...s, service_text: editVal.trim() } : s));
      setEditing(null);
      showToast('Service updated', 'success');
    } catch { showToast('Failed to update service', 'error'); }
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      await deleteContentService(id);
      setServices(prev => prev.filter(s => s.id !== id));
      showToast('Service deleted', 'success');
    } catch { showToast('Failed to delete service', 'error'); }
    finally { setDeleting(null); }
  };

  const flowTypeBadge = (type) => {
    const map = {
      all: 'bg-blue-50 text-blue-600',
      sale: 'bg-amber-50 text-amber-600',
      rent: 'bg-green-50 text-green-700',
      offer: 'bg-purple-50 text-purple-600',
    };
    return map[type] || 'bg-gray-100 text-gray-500';
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-bold text-gray-700 mb-4">Add New Service / Offer Point</h3>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Stage</label>
            <select
              value={addForm.stageKey}
              onChange={e => setAddForm(f => ({ ...f, stageKey: e.target.value }))}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none bg-white"
            >
              {stageOptions.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Type</label>
            <select
              value={addForm.flowType}
              onChange={e => setAddForm(f => ({ ...f, flowType: e.target.value }))}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none bg-white"
            >
              <option value="all">All (Sale + Rent)</option>
              <option value="sale">Sale only</option>
              <option value="rent">Rent only</option>
              <option value="offer">Offer Points (Stage 1 slide)</option>
            </select>
          </div>
          <div className="flex-1 min-w-[220px]">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Text</label>
            <input
              value={addForm.text}
              onChange={e => setAddForm(f => ({ ...f, text: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
              placeholder="Enter service or offer text..."
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={adding || !addForm.text.trim()}
            className="px-4 py-2 bg-green-600 text-white text-sm rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 transition-all"
          >
            {adding ? 'Adding...' : '+ Add'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          <strong>All</strong> = shown for both Sale &amp; Rent &nbsp;|&nbsp;
          <strong>Offer Points</strong> = shown in the booking slide under Stage 1
        </p>
      </div>

      {stageOptions.map(opt => (
        <div key={opt.key} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-slate-50 border-b border-gray-100 flex items-center gap-3">
            <h3 className="text-sm font-bold text-gray-700">{opt.label}</h3>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md font-mono">{opt.key}</span>
          </div>
          <div className="p-5 space-y-2">
            {(servicesByStage[opt.key] ?? []).length === 0 && (
              <p className="text-sm text-gray-400 italic">No items — use the form above to add.</p>
            )}
            {(servicesByStage[opt.key] ?? []).map(svc => (
              <div key={svc.id} className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${flowTypeBadge(svc.flow_type)}`}>
                  {svc.flow_type.toUpperCase()}
                </span>
                {editing === svc.id ? (
                  <>
                    <input
                      value={editVal}
                      onChange={e => setEditVal(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleUpdate(svc.id); if (e.key === 'Escape') setEditing(null); }}
                      autoFocus
                      className="flex-1 px-3 py-1.5 border border-blue-400 rounded-lg text-sm outline-none"
                    />
                    <button onClick={() => handleUpdate(svc.id)} className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg font-semibold">Save</button>
                    <button onClick={() => setEditing(null)} className="px-2 py-1.5 text-gray-400 text-xs rounded-lg hover:bg-gray-100">Cancel</button>
                  </>
                ) : (
                  <>
                    <span
                      className="flex-1 text-sm text-gray-700 bg-gray-50 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-blue-50 hover:text-blue-700 transition-colors"
                      onClick={() => { setEditing(svc.id); setEditVal(svc.service_text); }}
                    >
                      {svc.service_text}
                    </span>
                    <button onClick={() => { setEditing(svc.id); setEditVal(svc.service_text); }} className="text-xs text-blue-500 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50">Edit</button>
                    <button
                      onClick={() => handleDelete(svc.id)}
                      disabled={deleting === svc.id}
                      className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 disabled:opacity-50"
                    >
                      {deleting === svc.id ? '...' : 'Del'}
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function HeadingsTab({ headings, setHeadings, showToast }) {
  const [saving, setSaving] = useState({});

  const handleChange = (key, value) => {
    setHeadings(prev => prev.map(h => h.content_key === key ? { ...h, content_value: value } : h));
  };

  const handleSave = async (key) => {
    const item = headings.find(h => h.content_key === key);
    if (!item) return;
    setSaving(s => ({ ...s, [key]: true }));
    try {
      await updateContentHeading(key, item.content_value);
      showToast('Heading saved', 'success');
    } catch { showToast('Failed to save heading', 'error'); }
    finally { setSaving(s => ({ ...s, [key]: false })); }
  };

  if (!headings.length) return <Loader />;

  return (
    <div className="space-y-4 max-w-2xl">
      {headings.map(h => (
        <div key={h.content_key} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
            {HEADING_LABELS[h.content_key] || h.content_key}
          </label>
          <div className="flex gap-3">
            <input
              value={h.content_value}
              onChange={e => handleChange(h.content_key, e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave(h.content_key); }}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
            />
            <button
              onClick={() => handleSave(h.content_key)}
              disabled={saving[h.content_key]}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition-all"
            >
              {saving[h.content_key] ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function AdvantageTab({ services, setServices, showToast }) {
  const getItems = (flowType) => services.filter(s => s.stage_key === 'ADVANTAGE' && s.flow_type === flowType);
  const [editing, setEditing] = useState(null);
  const [editVal, setEditVal] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [adding, setAdding] = useState(null);
  const [addVals, setAddVals] = useState({ sale_tick: '', sale_cross: '', rent_tick: '', rent_cross: '' });

  const handleAdd = async (flowType) => {
    const text = addVals[flowType];
    if (!text.trim()) return;
    setAdding(flowType);
    try {
      const { data } = await addContentService('ADVANTAGE', flowType, text.trim());
      setServices(prev => [...prev, data]);
      setAddVals(v => ({ ...v, [flowType]: '' }));
      showToast('Added', 'success');
    } catch { showToast('Failed to add', 'error'); }
    finally { setAdding(null); }
  };

  const handleUpdate = async (id) => {
    if (!editVal.trim()) return;
    try {
      await updateContentService(id, editVal.trim());
      setServices(prev => prev.map(s => s.id === id ? { ...s, service_text: editVal.trim() } : s));
      setEditing(null);
      showToast('Updated', 'success');
    } catch { showToast('Failed to update', 'error'); }
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      await deleteContentService(id);
      setServices(prev => prev.filter(s => s.id !== id));
      showToast('Deleted', 'success');
    } catch { showToast('Failed to delete', 'error'); }
    finally { setDeleting(null); }
  };

  const sections = [
    { flowType: 'sale_tick', label: 'Sale — ✓ Tick Points', iconClass: 'text-green-600', icon: '✓' },
    { flowType: 'sale_cross', label: 'Sale — ✗ Cross Points', iconClass: 'text-red-500', icon: '✗' },
    { flowType: 'rent_tick', label: 'Rent — ✓ Tick Points', iconClass: 'text-green-600', icon: '✓' },
    { flowType: 'rent_cross', label: 'Rent — ✗ Cross Points', iconClass: 'text-red-500', icon: '✗' },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <p className="text-sm text-gray-500">
        These points appear beside the phone/Book Contact section on the booking page, showing Mandi's commission advantage vs regular brokers.
        Sale tick items show with a green ✓, sale cross items show with a red ✗ (competitors), rent tick shows ✓.
      </p>
      {sections.map(sec => (
        <div key={sec.flowType} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <span className={`text-base font-black ${sec.iconClass}`}>{sec.icon}</span>
            {sec.label}
          </h3>
          {getItems(sec.flowType).length === 0 && (
            <p className="text-sm text-gray-400 italic">No items yet.</p>
          )}
          {getItems(sec.flowType).map(svc => (
            <div key={svc.id} className="flex items-center gap-2">
              <span className={`text-sm font-bold ${sec.iconClass}`}>{sec.icon}</span>
              {editing === svc.id ? (
                <>
                  <input
                    value={editVal}
                    onChange={e => setEditVal(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleUpdate(svc.id); if (e.key === 'Escape') setEditing(null); }}
                    autoFocus
                    className="flex-1 px-3 py-1.5 border border-blue-400 rounded-lg text-sm outline-none"
                  />
                  <button onClick={() => handleUpdate(svc.id)} className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg font-semibold hover:bg-blue-700">Save</button>
                  <button onClick={() => setEditing(null)} className="px-2 py-1.5 text-gray-400 text-xs rounded-lg hover:bg-gray-100">Cancel</button>
                </>
              ) : (
                <>
                  <span
                    className="flex-1 text-sm text-gray-700 bg-gray-50 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-blue-50 hover:text-blue-700 transition-colors"
                    onClick={() => { setEditing(svc.id); setEditVal(svc.service_text); }}
                  >
                    {svc.service_text}
                  </span>
                  <button onClick={() => { setEditing(svc.id); setEditVal(svc.service_text); }} className="text-xs text-blue-500 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50">Edit</button>
                  <button
                    onClick={() => handleDelete(svc.id)}
                    disabled={deleting === svc.id}
                    className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 disabled:opacity-50"
                  >
                    {deleting === svc.id ? '...' : 'Del'}
                  </button>
                </>
              )}
            </div>
          ))}
          <div className="flex gap-2 mt-2">
            <input
              value={addVals[sec.flowType]}
              onChange={e => setAddVals(v => ({ ...v, [sec.flowType]: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd(sec.flowType); }}
              placeholder="Add text..."
              className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
            />
            <button
              onClick={() => handleAdd(sec.flowType)}
              disabled={adding === sec.flowType || !addVals[sec.flowType].trim()}
              className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
            >
              {adding === sec.flowType ? '...' : '+ Add'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SiteContentPage() {
  const [tab, setTab] = useState('headings');
  const [headings, setHeadings] = useState([]);
  const [saleFlow, setSaleFlow] = useState([]);
  const [rentFlow, setRentFlow] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [h, sf, rf, sv] = await Promise.all([
          getContentHeadings(),
          getAdminBookingFlow('sale'),
          getAdminBookingFlow('rent'),
          getContentServices(),
        ]);
        setHeadings(h.data);
        setSaleFlow(sf.data);
        setRentFlow(rf.data);
        setServices(sv.data);
      } catch {
        showToast('Failed to load content', 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Derive unique stage options (key + label) from both flows, sorted by sort_order
  const stageOptions = useMemo(() => {
    const map = {};
    [...saleFlow, ...rentFlow].forEach(s => {
      if (!map[s.stage_key]) map[s.stage_key] = { key: s.stage_key, label: s.title, sort_order: s.sort_order };
    });
    return Object.values(map).sort((a, b) => a.sort_order - b.sort_order);
  }, [saleFlow, rentFlow]);

  const tabs = [
    { key: 'headings',   label: 'Headings' },
    { key: 'sale',       label: 'Sale Flow' },
    { key: 'rent',       label: 'Rent Flow' },
    { key: 'services',   label: 'Our Services' },
    { key: 'advantage',  label: 'Commission Box' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <Toast toast={toast} />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Site Content</h1>
        <p className="text-sm text-gray-500 mt-1">Manage booking flow texts, headings, and service items shown to users.</p>
      </div>

      <div className="flex gap-2 mb-6 bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100 w-fit">
        {tabs.map(t => (
          <TabBtn key={t.key} label={t.label} active={tab === t.key} onClick={() => setTab(t.key)} />
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64"><Loader /></div>
      ) : (
        <div className="max-w-5xl">
          {tab === 'headings' && (
            <HeadingsTab headings={headings} setHeadings={setHeadings} showToast={showToast} />
          )}
          {tab === 'sale' && (
            <FlowTab flow={saleFlow} setFlow={setSaleFlow} flowType="sale" showToast={showToast} />
          )}
          {tab === 'rent' && (
            <FlowTab flow={rentFlow} setFlow={setRentFlow} flowType="rent" showToast={showToast} />
          )}
          {tab === 'services' && (
            <ServicesTab services={services} setServices={setServices} stageOptions={stageOptions} showToast={showToast} />
          )}
          {tab === 'advantage' && (
            <AdvantageTab services={services} setServices={setServices} showToast={showToast} />
          )}
        </div>
      )}
    </div>
  );
}
