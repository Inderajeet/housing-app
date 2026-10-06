'use client';
import { useState, useEffect, useCallback } from 'react';
import Loader from '@/components/admin/Loader';
import {
  getContentHeadings, updateContentHeading,
  getFlowOptions, updateFlowOptionLabel,
  getAdminGalleryImages, uploadGalleryImage, updateGalleryImageById, deleteGalleryImageById,
} from '@/lib/adminApi';

const SALE_CHOICE_ORDER = [
  { key: 'A', hint: 'Row A' },
  { key: 'B', hint: 'Row B' },
  { key: 'C', hint: 'Row C' },
  { key: 'BACK', hint: 'Back button' },
];
const RENT_CHOICE_ORDER = [
  { key: 'CONTACT', hint: 'Row A — Contact' },
  { key: 'AGREEMENT', hint: 'Row B — Agreement' },
  { key: 'BACK', hint: 'Back button' },
];
const SALE_POSTFLOW_GROUPS = [
  { key: 'property_type', label: 'Property Type Options' },
  { key: 'area_unit', label: 'Area Unit Options' },
];
const RENT_POSTFLOW_GROUPS = [
  { key: 'room_type', label: 'Room Type Options' },
];
const SALE_HOME_BOX_ORDER = [
  { key: 'center', hint: 'Center Text' },
  { key: 'flat', hint: 'Item — Flat' },
  { key: 'house', hint: 'Item — House' },
  { key: 'plot', hint: 'Item — Plot' },
  { key: 'land', hint: 'Item — Land' },
];
const RENT_HOME_BOX_ORDER = [
  { key: 'center', hint: 'Center Text' },
  { key: '1', hint: 'Item — 1 BHK' },
  { key: '2', hint: 'Item — 2 BHK' },
  { key: '3', hint: 'Item — 3+ BHK' },
  { key: 'commercial', hint: 'Item — Commercial' },
];

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

function HeadingField({ contentKey, label, headings, onSave, multiline }) {
  const item = headings.find(h => h.content_key === contentKey);
  const [value, setValue] = useState(item?.content_value ?? '');
  const [saving, setSaving] = useState(false);
  const dirty = value !== (item?.content_value ?? '');

  if (!item) return null;

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(contentKey, value); } finally { setSaving(false); }
  };

  const Field = multiline ? 'textarea' : 'input';

  return (
    <div>
      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">{label}</label>
      <div className="flex gap-3">
        <Field
          value={value}
          onChange={e => setValue(e.target.value)}
          rows={multiline ? 2 : undefined}
          className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
        />
        <button
          onClick={handleSave}
          disabled={saving || !dirty}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-40 transition-all shrink-0 h-fit"
        >
          {saving ? 'Saving...' : dirty ? 'Save' : 'Saved'}
        </button>
      </div>
    </div>
  );
}

function FlowOptionField({ option, hint, onSave }) {
  const [value, setValue] = useState(option.label);
  const [saving, setSaving] = useState(false);
  const dirty = value !== option.label;

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(option.id, value); } finally { setSaving(false); }
  };

  return (
    <div>
      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
        {hint} <span className="text-gray-400 font-normal normal-case">({option.option_key})</span>
      </label>
      <div className="flex gap-3">
        <textarea
          value={value}
          onChange={e => setValue(e.target.value)}
          rows={2}
          className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
        />
        <button
          onClick={handleSave}
          disabled={saving || !dirty}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-40 transition-all shrink-0 h-fit"
        >
          {saving ? 'Saving...' : dirty ? 'Save' : 'Saved'}
        </button>
      </div>
    </div>
  );
}

function BookingTab({ flowType, locale, headings, onSaveHeading, choiceOrder, showToast }) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getFlowOptions(flowType, locale)
      .then(res => { if (!cancelled) setOptions(res.data); })
      .catch(() => { if (!cancelled) showToast('Failed to load flow options', 'error'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [flowType, locale]);

  const handleSaveOption = async (id, label) => {
    try {
      await updateFlowOptionLabel(id, label);
      setOptions(prev => prev.map(o => o.id === id ? { ...o, label } : o));
      showToast('Option saved', 'success');
    } catch { showToast('Failed to save option', 'error'); }
  };

  const byGroupAndKey = (groupKey, optionKey) =>
    options.find(o => o.group_key === groupKey && o.option_key === optionKey);

  if (loading) return <Loader />;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h3 className="text-sm font-bold text-gray-700">Booking Question</h3>
        <HeadingField
          contentKey={`${flowType}_choice_header`}
          label="Question Header"
          headings={headings}
          onSave={onSaveHeading}
          multiline
        />
        {flowType === 'sale' && (
          <>
            <HeadingField contentKey="sale_booking_contact_owner_btn" label="Contact Owner Button" headings={headings} onSave={onSaveHeading} />
            <HeadingField contentKey="sale_booking_free_visit_btn" label="Free Visit Button" headings={headings} onSave={onSaveHeading} />
          </>
        )}
        {choiceOrder.map(({ key, hint }) => {
          const option = byGroupAndKey('choice', key);
          if (!option) return null;
          return <FlowOptionField key={option.id} option={option} hint={hint} onSave={handleSaveOption} />;
        })}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h3 className="text-sm font-bold text-gray-700">Success Message</h3>
        <HeadingField
          contentKey={`${flowType}_booking_success_msg`}
          label="Popup text (after phone number entered)"
          headings={headings}
          onSave={onSaveHeading}
        />
      </div>
    </div>
  );
}

function HomeBoxSection({ flowType, locale, title, boxOrder, showToast }) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getFlowOptions(flowType, locale)
      .then(res => { if (!cancelled) setOptions(res.data.filter(o => o.group_key === 'home_box')); })
      .catch(() => { if (!cancelled) showToast('Failed to load home page options', 'error'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [flowType, locale]);

  const handleSaveOption = async (id, label) => {
    try {
      await updateFlowOptionLabel(id, label);
      setOptions(prev => prev.map(o => o.id === id ? { ...o, label } : o));
      showToast('Option saved', 'success');
    } catch { showToast('Failed to save option', 'error'); }
  };

  const byKey = (optionKey) => options.find(o => o.option_key === optionKey);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
      <h3 className="text-sm font-bold text-gray-700">{title}</h3>
      {loading ? <Loader /> : boxOrder.map(({ key, hint }) => {
        const option = byKey(key);
        if (!option) return null;
        return <FlowOptionField key={option.id} option={option} hint={hint} onSave={handleSaveOption} />;
      })}
    </div>
  );
}

function HomePageTab({ locale, headings, onSaveHeading, showToast }) {
  const heading = (contentKey, label) => (
    <HeadingField contentKey={contentKey} label={label} headings={headings} onSave={onSaveHeading} />
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h3 className="text-sm font-bold text-gray-700">Menu Bar</h3>
        {heading('home_salemap_label', 'Sale Map Label')}
        {heading('home_rentmap_label', 'Rent Map Label')}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h3 className="text-sm font-bold text-gray-700">Property Details &amp; Phone Submit</h3>
        {heading('property_more_details_label', 'More Details Tab Label')}
        {heading('property_booking_status_label', 'Booking Status Tab Label')}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h3 className="text-sm font-bold text-gray-700">WhatsApp Button — Sales &amp; Rental</h3>
        {heading('home_whatsapp_sales_line1', 'Line 1')}
        {heading('home_whatsapp_sales_line2', 'Line 2')}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h3 className="text-sm font-bold text-gray-700">WhatsApp Button — Document ATM</h3>
        {heading('home_whatsapp_docs_line1', 'Line 1')}
        {heading('home_whatsapp_docs_line2', 'Line 2')}
      </div>

      <HomeBoxSection flowType="sale" locale={locale} title="Sale Side (Buy Box)" boxOrder={SALE_HOME_BOX_ORDER} showToast={showToast} />
      <HomeBoxSection flowType="rent" locale={locale} title="Rent Side (Rent Box)" boxOrder={RENT_HOME_BOX_ORDER} showToast={showToast} />
    </div>
  );
}

function PropertyCardTab({ headings, onSaveHeading }) {
  const heading = (contentKey, label) => (
    <HeadingField contentKey={contentKey} label={label} headings={headings} onSave={onSaveHeading} />
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h3 className="text-sm font-bold text-gray-700">Legal (Sale properties only)</h3>
        {heading('property_card_legal_label', 'Label')}
        {heading('property_card_legal_sublabel', 'Sub-label')}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h3 className="text-sm font-bold text-gray-700">Area Sales Speed (Sale properties only)</h3>
        {heading('property_card_areasales_label', 'Label')}
        {heading('property_card_areasales_sublabel', 'Sub-label')}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h3 className="text-sm font-bold text-gray-700">Amenities Rating</h3>
        {heading('property_card_amenities_label', 'Label')}
        {heading('property_card_amenities_sublabel', 'Sub-label')}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h3 className="text-sm font-bold text-gray-700">Location (Utilities) Rating</h3>
        {heading('property_card_location_label', 'Label')}
        {heading('property_card_location_sublabel', 'Sub-label')}
      </div>
    </div>
  );
}

function PostFlowTab({ flowType, locale, headings, onSaveHeading, postflowGroups, showToast }) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getFlowOptions(flowType, locale)
      .then(res => { if (!cancelled) setOptions(res.data); })
      .catch(() => { if (!cancelled) showToast('Failed to load flow options', 'error'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [flowType, locale]);

  const handleSaveOption = async (id, label) => {
    try {
      await updateFlowOptionLabel(id, label);
      setOptions(prev => prev.map(o => o.id === id ? { ...o, label } : o));
      showToast('Option saved', 'success');
    } catch { showToast('Failed to save option', 'error'); }
  };

  const byGroup = (groupKey) =>
    options.filter(o => o.group_key === groupKey).sort((a, b) => a.sort_order - b.sort_order);

  const heading = (contentKey, label, opts = {}) => (
    <HeadingField contentKey={contentKey} label={label} headings={headings} onSave={onSaveHeading} {...opts} />
  );

  if (loading) return <Loader />;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h3 className="text-sm font-bold text-gray-700">Landing Page Button</h3>
        {heading(`${flowType}_postflow_cta_button`, 'Button Text (e.g. "SALE YOUR PROPERTY")')}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h3 className="text-sm font-bold text-gray-700">Step 1 — Contact Number</h3>
        {heading(`${flowType}_postflow_contact_intro`, 'Intro Text', { multiline: true })}
        {heading(`${flowType}_postflow_contact_label`, 'Field Label')}
        {heading(`${flowType}_postflow_contact_placeholder`, 'Field Placeholder')}
        {heading(`${flowType}_postflow_contact_button`, 'Button Text')}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h3 className="text-sm font-bold text-gray-700">Step 2 — Location Proof</h3>
        {heading(`${flowType}_postflow_location_header`, 'Header')}
        {heading(`${flowType}_postflow_location_intro`, 'Intro Text', { multiline: true })}
        {heading(`${flowType}_postflow_location_capture_label`, 'Capture Button Text (idle)')}
        {heading(`${flowType}_postflow_location_capture_label2`, 'Capture Button Text (camera open)')}
        {heading(`${flowType}_postflow_location_button`, 'Continue Button Text')}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h3 className="text-sm font-bold text-gray-700">Step 3 — Property Details</h3>
        {heading(`${flowType}_postflow_header`, 'Form Header')}
        {heading(`${flowType}_postflow_button`, 'Submit Button Text')}
        {heading(`${flowType}_postflow_type_label`, 'Type Field Label')}
        {heading(`${flowType}_postflow_area_label`, 'Area Field Label')}
        {heading(`${flowType}_postflow_area_placeholder`, 'Area Field Placeholder')}
        {flowType === 'sale' ? (
          <>
            {heading('sale_postflow_floor_label', 'Floor No. Field Label (shown only when Flat is selected)')}
            {heading('sale_postflow_floor_placeholder', 'Floor No. Field Placeholder')}
            {heading('sale_postflow_rate_label', 'Rate Field Label')}
            {heading('sale_postflow_rate_placeholder', 'Rate Field Placeholder')}
          </>
        ) : (
          <>
            {heading('rent_postflow_floor_label', 'Floor No. Field Label')}
            {heading('rent_postflow_floor_placeholder', 'Floor No. Field Placeholder')}
            {heading('rent_postflow_rent_label', 'Rent Field Label')}
            {heading('rent_postflow_rent_placeholder', 'Rent Field Placeholder')}
            {heading('rent_postflow_advance_label', 'Advance Field Label')}
            {heading('rent_postflow_advance_placeholder', 'Advance Field Placeholder')}
          </>
        )}
        {postflowGroups.map(group => (
          <div key={group.key} className="pt-2 border-t border-gray-100">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">{group.label}</h4>
            <div className="space-y-3">
              {byGroup(group.key).map(option => (
                <FlowOptionField key={option.id} option={option} hint={option.option_key} onSave={handleSaveOption} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h3 className="text-sm font-bold text-gray-700">Success Message</h3>
        {heading(`${flowType}_postflow_success_msg`, 'Popup text (after property is posted)')}
      </div>
    </div>
  );
}

function GalleryImageCard({ img, index, total, onDelete, onMoveUp, onMoveDown, onCaptionSave, deletingId }) {
  const [caption, setCaption] = useState(img.caption || '');
  const [savingCaption, setSavingCaption] = useState(false);
  const dirty = caption !== (img.caption || '');

  const handleSaveCaption = async () => {
    setSavingCaption(true);
    try { await onCaptionSave(img.id, caption); } finally { setSavingCaption(false); }
  };

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
      <div className="relative group aspect-video bg-gray-100">
        <img src={img.image_url} alt="Gallery" className="w-full h-full object-cover" />
        <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onDelete(img.id)}
            disabled={deletingId === img.id}
            className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold hover:bg-red-600 disabled:opacity-50"
          >
            {deletingId === img.id ? '…' : '✕'}
          </button>
        </div>
        <div className="absolute bottom-1.5 left-1.5 flex gap-1">
          <button
            onClick={() => onMoveUp(index)}
            disabled={index === 0}
            className="bg-white/90 text-gray-600 rounded w-5 h-5 flex items-center justify-center text-xs font-bold hover:bg-white disabled:opacity-30 shadow"
            title="Move up"
          >↑</button>
          <button
            onClick={() => onMoveDown(index)}
            disabled={index === total - 1}
            className="bg-white/90 text-gray-600 rounded w-5 h-5 flex items-center justify-center text-xs font-bold hover:bg-white disabled:opacity-30 shadow"
            title="Move down"
          >↓</button>
        </div>
        <span className="absolute top-1.5 left-1.5 bg-black/50 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
          #{index + 1}
        </span>
      </div>
      <div className="p-2 flex gap-1.5">
        <input
          value={caption}
          onChange={e => setCaption(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSaveCaption(); }}
          placeholder="Caption text (shown below image)"
          className="flex-1 px-2 py-1 border border-gray-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-400"
        />
        <button
          onClick={handleSaveCaption}
          disabled={savingCaption || !dirty}
          className="px-2 py-1 bg-blue-600 text-white text-[10px] rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-40 shrink-0"
        >
          {savingCaption ? '…' : 'Save'}
        </button>
      </div>
    </div>
  );
}

function GalleryTab({ headings, setHeadings, onSaveHeading, showToast }) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadCaption, setUploadCaption] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [savingHeading, setSavingHeading] = useState(false);

  const headingItem = headings.find(h => h.content_key === 'gallery_heading');
  const headingValue = headingItem?.content_value ?? 'We Provide';

  useEffect(() => {
    getAdminGalleryImages()
      .then(res => setImages(res.data))
      .catch(() => showToast('Failed to load gallery images', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const handleHeadingChange = (val) => {
    setHeadings(prev => prev.map(h => h.content_key === 'gallery_heading' ? { ...h, content_value: val } : h));
  };

  const handleHeadingSave = async () => {
    if (!headingItem) return;
    setSavingHeading(true);
    try {
      await onSaveHeading('gallery_heading', headingItem.content_value);
    } catch { showToast('Failed to save heading', 'error'); }
    finally { setSavingHeading(false); }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (images.length >= 6) { showToast('Maximum 6 images allowed', 'error'); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('caption', uploadCaption.trim());
      const { data } = await uploadGalleryImage(fd);
      setImages(prev => [...prev, data]);
      setUploadCaption('');
      showToast('Image uploaded', 'success');
    } catch (err) {
      showToast(err?.response?.data?.error || 'Upload failed', 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await deleteGalleryImageById(id);
      setImages(prev => prev.filter(img => img.id !== id));
      showToast('Image deleted', 'success');
    } catch { showToast('Failed to delete image', 'error'); }
    finally { setDeletingId(null); }
  };

  const handleCaptionSave = async (id, caption) => {
    try {
      await updateGalleryImageById(id, { caption });
      setImages(prev => prev.map(img => img.id === id ? { ...img, caption } : img));
      showToast('Caption saved', 'success');
    } catch { showToast('Failed to save caption', 'error'); }
  };

  const handleMove = async (index, direction) => {
    const newImages = [...images];
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= newImages.length) return;
    [newImages[index], newImages[swapIndex]] = [newImages[swapIndex], newImages[index]];
    const updated = newImages.map((img, i) => ({ ...img, sort_order: i }));
    setImages(updated);
    try {
      await Promise.all([
        updateGalleryImageById(updated[index].id, { sort_order: index }),
        updateGalleryImageById(updated[swapIndex].id, { sort_order: swapIndex }),
      ]);
    } catch { showToast('Failed to reorder', 'error'); }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
          Gallery Heading (shown above thumbnails on booking page)
        </label>
        <div className="flex gap-3">
          <input
            value={headingValue}
            onChange={e => handleHeadingChange(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleHeadingSave(); }}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
            placeholder="e.g. We Provide"
          />
          <button
            onClick={handleHeadingSave}
            disabled={savingHeading}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition-all"
          >
            {savingHeading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-700">
            Gallery Images <span className="text-gray-400 font-normal">({images.length}/6)</span>
          </h3>
        </div>

        {images.length < 6 && (
          <div className="flex gap-2 items-center p-3 bg-green-50 rounded-xl border border-green-100">
            <input
              value={uploadCaption}
              onChange={e => setUploadCaption(e.target.value)}
              placeholder="Caption for this image (optional)"
              className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-green-400 bg-white"
            />
            <label className={`px-4 py-1.5 bg-green-600 text-white text-xs rounded-xl font-semibold cursor-pointer hover:bg-green-700 transition-all shrink-0 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
              {uploading ? 'Uploading...' : '+ Add Image'}
              <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
            </label>
          </div>
        )}

        {loading ? (
          <Loader />
        ) : images.length === 0 ? (
          <p className="text-sm text-gray-400 italic text-center py-6">No images yet. Upload up to 6 images.</p>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {images.map((img, index) => (
              <GalleryImageCard
                key={img.id}
                img={img}
                index={index}
                total={images.length}
                onDelete={handleDelete}
                onMoveUp={(i) => handleMove(i, -1)}
                onMoveDown={(i) => handleMove(i, 1)}
                onCaptionSave={handleCaptionSave}
                deletingId={deletingId}
              />
            ))}
          </div>
        )}

        <p className="text-xs text-gray-400">Captions appear below each image on the booking page. Use ↑↓ to reorder.</p>
      </div>
    </div>
  );
}

export default function SiteContentPage() {
  const [tab, setTab] = useState('sale-booking');
  const [locale, setLocale] = useState('ta');
  const [headings, setHeadings] = useState([]);
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
        const h = await getContentHeadings(locale);
        setHeadings(h.data);
      } catch {
        showToast('Failed to load content', 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [locale]);

  const handleSaveHeading = async (key, value) => {
    await updateContentHeading(key, value, locale);
    setHeadings(prev => prev.map(h => h.content_key === key ? { ...h, content_value: value } : h));
    showToast('Saved', 'success');
  };

  const tabs = [
    { key: 'home',           label: 'Home Page' },
    { key: 'sale-postflow',  label: 'Sale Post Flow' },
    { key: 'rent-postflow',  label: 'Rent Post Flow' },
    { key: 'sale-booking',   label: 'Sale Booking' },
    { key: 'rent-booking',   label: 'Rent Booking' },
    { key: 'property-card',  label: 'Property Card' },
    { key: 'gallery',        label: 'Gallery' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <Toast toast={toast} />
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Site Content</h1>
          <p className="text-sm text-gray-500 mt-1">Manage booking flow texts and the property-posting flow shown to users.</p>
        </div>
        <div className="flex gap-2 bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100 w-fit">
          <TabBtn label="தமிழ்" active={locale === 'ta'} onClick={() => setLocale('ta')} />
          <TabBtn label="English" active={locale === 'en'} onClick={() => setLocale('en')} />
        </div>
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
          {tab === 'home' && (
            <HomePageTab locale={locale} headings={headings} onSaveHeading={handleSaveHeading} showToast={showToast} />
          )}
          {tab === 'sale-booking' && (
            <BookingTab
              flowType="sale"
              locale={locale}
              headings={headings}
              onSaveHeading={handleSaveHeading}
              choiceOrder={SALE_CHOICE_ORDER}
              showToast={showToast}
            />
          )}
          {tab === 'rent-booking' && (
            <BookingTab
              flowType="rent"
              locale={locale}
              headings={headings}
              onSaveHeading={handleSaveHeading}
              choiceOrder={RENT_CHOICE_ORDER}
              showToast={showToast}
            />
          )}
          {tab === 'sale-postflow' && (
            <PostFlowTab
              flowType="sale"
              locale={locale}
              headings={headings}
              onSaveHeading={handleSaveHeading}
              postflowGroups={SALE_POSTFLOW_GROUPS}
              showToast={showToast}
            />
          )}
          {tab === 'rent-postflow' && (
            <PostFlowTab
              flowType="rent"
              locale={locale}
              headings={headings}
              onSaveHeading={handleSaveHeading}
              postflowGroups={RENT_POSTFLOW_GROUPS}
              showToast={showToast}
            />
          )}
          {tab === 'property-card' && (
            <PropertyCardTab headings={headings} onSaveHeading={handleSaveHeading} />
          )}
          {tab === 'gallery' && (
            <GalleryTab headings={headings} setHeadings={setHeadings} onSaveHeading={handleSaveHeading} showToast={showToast} />
          )}
        </div>
      )}
    </div>
  );
}
