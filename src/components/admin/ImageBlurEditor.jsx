'use client';
import { useState, useRef, useCallback } from 'react';
import { blurImageRegions } from '../../lib/adminApi.js';

export default function ImageBlurEditor({ asset, onSaved, onClose }) {
  const [regions, setRegions] = useState([]);
  const [drawing, setDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState(null);
  const [drawCurrent, setDrawCurrent] = useState(null);
  const [saving, setSaving] = useState(false);
  const containerRef = useRef(null);

  const getRelPos = (e) => {
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: Math.max(0, Math.min(100, (clientX - rect.left) / rect.width * 100)),
      y: Math.max(0, Math.min(100, (clientY - rect.top) / rect.height * 100)),
    };
  };

  const onStart = (e) => {
    e.preventDefault();
    const pos = getRelPos(e);
    setDrawing(true);
    setDrawStart(pos);
    setDrawCurrent(pos);
  };

  const onMove = (e) => {
    e.preventDefault();
    if (!drawing) return;
    setDrawCurrent(getRelPos(e));
  };

  const onEnd = (e) => {
    e.preventDefault();
    if (!drawing || !drawStart || !drawCurrent) { setDrawing(false); return; }
    const x = Math.min(drawStart.x, drawCurrent.x);
    const y = Math.min(drawStart.y, drawCurrent.y);
    const w = Math.abs(drawCurrent.x - drawStart.x);
    const h = Math.abs(drawCurrent.y - drawStart.y);
    if (w > 1 && h > 1) {
      setRegions(prev => [...prev, { x, y, w, h }]);
    }
    setDrawing(false);
    setDrawStart(null);
    setDrawCurrent(null);
  };

  const removeRegion = (idx) => setRegions(prev => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (!regions.length) { onClose(); return; }
    setSaving(true);
    try {
      const res = await blurImageRegions(asset.asset_id, regions);
      onSaved?.(res.data?.new_url);
      onClose();
    } catch (err) {
      alert('Failed to apply blur: ' + (err?.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  const previewRect = drawing && drawStart && drawCurrent ? {
    left: `${Math.min(drawStart.x, drawCurrent.x)}%`,
    top: `${Math.min(drawStart.y, drawCurrent.y)}%`,
    width: `${Math.abs(drawCurrent.x - drawStart.x)}%`,
    height: `${Math.abs(drawCurrent.y - drawStart.y)}%`,
  } : null;

  return (
    <div className="fixed inset-0 z-[300] bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div>
            <h2 className="font-black text-gray-800 text-sm uppercase tracking-widest">Blur Editor</h2>
            <p className="text-xs text-gray-400 mt-0.5">Drag on the image to mark areas to blur · click a region to remove it</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 text-xl font-black">✕</button>
        </div>

        {/* Canvas area */}
        <div className="flex-1 overflow-auto p-4 bg-gray-50 flex justify-center items-start">
          <div
            ref={containerRef}
            className="relative select-none"
            style={{ cursor: 'crosshair', display: 'inline-block' }}
            onMouseDown={onStart}
            onMouseMove={onMove}
            onMouseUp={onEnd}
            onMouseLeave={onEnd}
            onTouchStart={onStart}
            onTouchMove={onMove}
            onTouchEnd={onEnd}
          >
            <img
              src={asset.file_url || asset.url}
              alt="Edit"
              draggable={false}
              style={{ display: 'block', maxWidth: '100%', maxHeight: '55vh', objectFit: 'contain', userSelect: 'none' }}
            />
            {/* Committed regions */}
            {regions.map((r, i) => (
              <div
                key={i}
                onClick={e => { e.stopPropagation(); removeRegion(i); }}
                style={{
                  position: 'absolute',
                  left: `${r.x}%`, top: `${r.y}%`,
                  width: `${r.w}%`, height: `${r.h}%`,
                  background: 'rgba(59,130,246,0.35)',
                  border: '2px solid #3b82f6',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backdropFilter: 'blur(6px)',
                  WebkitBackdropFilter: 'blur(6px)',
                  borderRadius: 4,
                }}
                title="Click to remove"
              >
                <span style={{ fontSize: 10, fontWeight: 900, color: '#fff', background: 'rgba(0,0,0,0.5)', padding: '1px 4px', borderRadius: 3 }}>BLUR ✕</span>
              </div>
            ))}
            {/* Active draw preview */}
            {previewRect && (
              <div style={{
                position: 'absolute', pointerEvents: 'none',
                ...previewRect,
                background: 'rgba(59,130,246,0.2)',
                border: '2px dashed #3b82f6',
                borderRadius: 4,
              }} />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t shrink-0">
          <div className="text-xs text-gray-500">
            {regions.length === 0 ? 'Draw on the image to add blur regions' : `${regions.length} blur region${regions.length > 1 ? 's' : ''} marked`}
          </div>
          <div className="flex gap-3">
            {regions.length > 0 && (
              <button onClick={() => setRegions([])} className="px-4 py-2 text-xs font-bold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 uppercase">
                Clear All
              </button>
            )}
            <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 uppercase">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || regions.length === 0}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 uppercase"
            >
              {saving ? 'Saving…' : 'Apply Blur & Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
