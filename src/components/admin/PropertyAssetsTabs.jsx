'use client';

import React, { useMemo, useState, useRef, useEffect } from 'react';
import { adminApi } from '../../lib/adminApi.js';

export default function PropertyAssetsTabs({ propertyId, assets, setAssets, isReadOnly, propertyData, mode = 'edit', onDrawingImageUpload, onlyType = null }) {
  const propertyType = String(propertyData?.sale_type || propertyData?.property_type || '').trim().toUpperCase();
  const isPlotOrFlat = propertyType === 'FLAT' || propertyType === 'PLOT';
  const liveImageUrl = propertyData?.live_image || '';
  const [drawingUrl, setDrawingUrl] = useState(propertyData?.drawing_image || '');

  useEffect(() => { setDrawingUrl(propertyData?.drawing_image || ''); }, [propertyData?.drawing_image]);

  const hasLiveImage = Boolean(liveImageUrl) && mode !== 'add';
  const imageAssets = useMemo(() => assets.filter(a => a.asset_type === 'image'), [assets]);
  const documentAssets = useMemo(() => assets.filter(a => a.asset_type === 'document'), [assets]);
  const forcedTab = onlyType === 'image' ? 'images' : onlyType === 'document' ? 'documents' : null;
  const [activeTab, setActiveTab] = useState(forcedTab || (hasLiveImage ? 'live-image' : 'images'));
  const [uploadingDrawing, setUploadingDrawing] = useState(false);
  const drawingFileRef = useRef();

  const tabClass = (tab) => `py-3 text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === tab ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`;

  const uploadFiles = async (files, type) => {
    for (const file of files) {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('asset_type', type);
      try {
        await adminApi.post(`/property-assets/${propertyId}`, fd);
      } catch (err) {
        alert(`Failed to upload "${file.name}": ${err?.message || 'Unknown error'}`);
        break;
      }
    }
    const res = await adminApi.get(`/property-assets/${propertyId}`);
    setAssets(res.data || []);
  };

  const handleDrawingUpload = async (file) => {
    if (!file) return;
    setUploadingDrawing(true);
    try {
      if (onDrawingImageUpload) {
        const result = await onDrawingImageUpload(file);
        setDrawingUrl(result?.drawing_image || result?.url || '');
      }
    } finally {
      setUploadingDrawing(false);
    }
  };

  const deleteAssets = async (ids) => {
    for (const id of ids) {
      try { await adminApi.delete(`/property-assets/${id}`); } catch {}
    }
    const res = await adminApi.get(`/property-assets/${propertyId}`);
    setAssets(res.data || []);
  };

  if (!propertyId && mode === 'add') {
    return <div className="text-center py-12 text-sm text-gray-400 font-bold uppercase tracking-widest">Save property first to add media</div>;
  }

  const renderGrid = (items, type) => (
    <div>
      {!isReadOnly && (
        <div className="mb-4">
          <label className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-xs uppercase rounded-xl cursor-pointer border border-blue-100 w-fit">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
            Upload {type === 'image' ? 'Images' : 'Documents'}
            <input type="file" multiple accept={type === 'image' ? 'image/*' : '.pdf,.doc,.docx'} className="hidden" onChange={e => { if (e.target.files?.length) uploadFiles(Array.from(e.target.files), type); }} />
          </label>
        </div>
      )}
      {items.length === 0 ? (
        <div className="text-center py-12 text-gray-300 text-sm font-bold uppercase tracking-widest">No {type}s uploaded</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {items.map(a => (
            <div key={a.asset_id} className="relative group rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
              {type === 'image' ? (
                <img src={a.file_url || a.url} alt={a.asset_id} className="w-full h-32 object-cover" />
              ) : (
                <div className="h-32 flex items-center justify-center bg-gray-100">
                  <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                </div>
              )}
              {!isReadOnly && (
                <button onClick={() => deleteAssets([a.asset_id])} className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs">✕</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div>
      {!forcedTab && (
        <div className="flex gap-5 border-b mb-6 overflow-x-auto">
          {hasLiveImage && <button className={tabClass('live-image')} onClick={() => setActiveTab('live-image')}>Cover Image</button>}
          {isPlotOrFlat && <button className={tabClass('drawing')} onClick={() => setActiveTab('drawing')}>Drawing</button>}
          <button className={tabClass('images')} onClick={() => setActiveTab('images')}>Images</button>
          <button className={tabClass('documents')} onClick={() => setActiveTab('documents')}>Documents</button>
        </div>
      )}

      {activeTab === 'live-image' && (
        <div className="flex flex-col items-center gap-4">
          {liveImageUrl && <img src={liveImageUrl} alt="Cover" className="w-full max-w-md rounded-xl border" />}
          {!isReadOnly && (
            <label className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-xs uppercase rounded-xl cursor-pointer border border-blue-100">
              Replace Cover Image
              <input type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) uploadFiles([e.target.files[0]], 'image'); }} />
            </label>
          )}
        </div>
      )}

      {activeTab === 'drawing' && (
        <div className="flex flex-col items-center gap-4">
          {drawingUrl && <img src={drawingUrl} alt="Drawing" className="w-full max-w-md rounded-xl border" />}
          {!isReadOnly && (
            <label className="flex items-center gap-2 px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-600 font-bold text-xs uppercase rounded-xl cursor-pointer border border-amber-100">
              {uploadingDrawing ? 'Uploading...' : 'Upload Drawing'}
              <input ref={drawingFileRef} type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) handleDrawingUpload(e.target.files[0]); }} />
            </label>
          )}
        </div>
      )}

      {activeTab === 'images' && renderGrid(imageAssets, 'image')}
      {activeTab === 'documents' && renderGrid(documentAssets, 'document')}
    </div>
  );
}
