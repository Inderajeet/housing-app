'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getFlatLayout, saveFlatLayout } from '@/lib/adminApi';
import SvgMapEditor from '@/components/admin/SvgMapEditor';

const getBookingStatusStyles = (status) => {
  const s = String(status || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (s === 'NIL_BOOKING') return { tile: 'bg-emerald-500 text-white shadow-inner', buttonActive: 'bg-emerald-500 text-white border-emerald-600', buttonInactive: 'bg-white text-emerald-600 border-emerald-100' };
  if (s === 'ON_BOOKING') return { tile: 'bg-yellow-400 text-slate-900 shadow-inner', buttonActive: 'bg-yellow-400 text-slate-900 border-yellow-500', buttonInactive: 'bg-white text-yellow-600 border-yellow-100' };
  return { tile: 'bg-red-500 text-white shadow-inner', buttonActive: 'bg-red-500 text-white border-red-600', buttonInactive: 'bg-white text-red-600 border-red-100' };
};

const parseNumberList = (str) => {
  const nums = new Set();
  if (!str) return nums;
  str.toString().split(',').map(p => p.trim()).forEach(part => {
    if (part.includes('-')) {
      const [a, b] = part.split('-').map(Number);
      if (!isNaN(a) && !isNaN(b)) for (let i = Math.min(a, b); i <= Math.max(a, b); i++) nums.add(String(i));
    } else if (part !== '') {
      nums.add(part);
    }
  });
  return nums;
};

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 2500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed top-6 right-6 z-[100] px-6 py-3 rounded-2xl shadow-xl text-sm font-bold ${type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
      {message}
    </div>
  );
}

function DrawingModal({ url, onClose }) {
  return (
    <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative max-w-5xl max-h-[90vh] w-full" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute -top-10 right-0 text-white text-3xl font-black hover:text-red-400">✕</button>
        <img src={url} alt="Drawing" className="w-full h-full object-contain rounded-2xl shadow-2xl" />
      </div>
    </div>
  );
}

export default function FlatLayoutEditorPage() {
  const router = useRouter();
  const { id } = useParams();
  const [dims, setDims] = useState({ rows: 40, cols: 60 });
  const [zoom, setZoom] = useState(1);
  const [gridData, setGridData] = useState({});
  const [history, setHistory] = useState([]);
  const [selection, setSelection] = useState({ start: null, end: null });
  const [selectionMode, setSelectionMode] = useState('rect'); // 'rect' | 'freeform'
  const [freeformKeys, setFreeformKeys] = useState({});
  const isSelectingRef = useRef(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedCellKey, setSelectedCellKey] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [drawingImage, setDrawingImage] = useState(null);
  const [showDrawing, setShowDrawing] = useState(false);
  const [showDrawingRef, setShowDrawingRef] = useState(false);
  const [showBulkStatus, setShowBulkStatus] = useState(false);
  const [bulkInputs, setBulkInputs] = useState({ nil: '', on: '', confirmed: '' });
  const [bulkBhk, setBulkBhk] = useState('');
  const [svgBulkBhkLabels, setSvgBulkBhkLabels] = useState('');
  const [svgBulkBhkValue, setSvgBulkBhkValue] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [svgShapes, setSvgShapes] = useState([]);

  const showToast = (message, type = 'success') => setToast({ message, type });
  const recordHistory = (data) => setHistory((prev) => [...prev, JSON.stringify(data)].slice(-20));

  useEffect(() => {
    const handleMouseUp = () => { isSelectingRef.current = false; setIsSelecting(false); };
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const handleUndo = () => {
    if (history.length === 0) return;
    setGridData(JSON.parse(history[history.length - 1]));
    setHistory((prev) => prev.slice(0, -1));
    showToast('Undo successful');
  };

  const refreshFlatNumbers = useCallback((currentGrid) => {
    const newGrid = { ...currentGrid };
    const flatKeys = Object.keys(newGrid).filter((k) => newGrid[k].type === 'FLAT' && !newGrid[k].merged);
    flatKeys.sort((a, b) => {
      const [rA, cA] = a.split('-').map(Number);
      const [rB, cB] = b.split('-').map(Number);
      return rA !== rB ? rA - rB : cA - cB;
    });
    let idx = 1;
    flatKeys.forEach((k) => {
      if (!(newGrid[k].isManual && newGrid[k].display_name !== '')) {
        newGrid[k].display_name = String(idx++);
        newGrid[k].isManual = false;
      }
    });
    return newGrid;
  }, []);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        const res = await getFlatLayout(id);
        const rawItems = Array.isArray(res.data) ? res.data : (res.data?.items || []);
        const propData = res.data;
        if (propData?.drawing_image) setDrawingImage(propData.drawing_image);

        // Load SVG shapes
        const svgItems = rawItems.filter(item => item.points && Array.isArray(item.points) && item.points.length > 0);
        if (svgItems.length > 0) {
          setSvgShapes(svgItems.map(item => {
            const rawName = item.name || '';
            const [parsedLabel, parsedBhk] = rawName.includes('|') ? rawName.split('|') : [rawName, ''];
            return {
              id: item.element_id ? String(item.element_id) : String(Math.random()),
              type: (item.type || 'FLAT').toUpperCase() === 'FLAT' ? 'plot' : 'road',
              points: item.points,
              label: parsedLabel,
              bhk: parsedBhk,
              status: item.status || 'Nil Booking',
              color: item.color || '#22c55e',
            };
          }));
          setViewMode('svg');
        }

        if (propData?.booked_units || propData?.open_units) {
          setBulkInputs(prev => ({
            ...prev,
            on: propData.booked_units || '',
            nil: propData.open_units || '',
          }));
        }
        const unitStatusByKey = new Map();
        const mapped = {};
        let maxR = 40, maxC = 60;

        rawItems.forEach((item) => {
          if (item.type !== 'FLAT') return;
          const candidates = [
            item.flat_unit_id != null ? `id:${item.flat_unit_id}` : null,
            item.flat_number ? `name:${String(item.flat_number).trim()}` : null,
            item.name ? `name:${String(item.name).trim()}` : null,
          ].filter(Boolean);
          const hasCoords = !isNaN(parseInt(item.x, 10)) && !isNaN(parseInt(item.y, 10));
          if (!hasCoords && item.status) candidates.forEach((k) => unitStatusByKey.set(k, item.status));
        });

        rawItems.forEach((item) => {
          const x = parseInt(item.x, 10), y = parseInt(item.y, 10);
          const w = parseInt(item.width, 10) || 1, h = parseInt(item.height, 10) || 1;
          if (isNaN(x) || isNaN(y)) return;
          if (y + h > maxR) maxR = y + h + 5;
          if (x + w > maxC) maxC = x + w + 5;

          const resolvedStatus = item.type === 'FLAT'
            ? (unitStatusByKey.get(`id:${item.flat_unit_id}`) || unitStatusByKey.get(`name:${String(item.name || item.flat_number || '').trim()}`) || item.status || 'Nil Booking')
            : item.status;

          const rawName = item.name || item.label || '';
          const [parsedName, parsedBhk] = rawName.includes('|') ? rawName.split('|') : [rawName, ''];
          const key = `${y}-${x}`;
          mapped[key] = {
            ...item, row: y, col: x, colSpan: w, rowSpan: h,
            display_name: parsedName,
            bhk: parsedBhk,
            isManual: isNaN(parsedName) && item.type === 'FLAT',
            type: item.type || 'FLAT', status: resolvedStatus,
            token_paid_to: item.token_paid_to || '',
            rotation: item.rotation || 0,
            color: item.color || (item.type === 'TEXT' ? '#2563eb' : '#ffffff'),
            font_size: item.font_size || 10, font_weight: item.font_weight || '900',
          };
          if (w > 1 || h > 1) {
            for (let r = 0; r < h; r++)
              for (let c = 0; c < w; c++) {
                if (r === 0 && c === 0) continue;
                mapped[`${y + r}-${x + c}`] = { merged: true, anchorKey: key };
              }
          }
        });
        setDims({ rows: maxR, cols: maxC });
        setGridData(refreshFlatNumbers(mapped));
      } catch { }
    };
    load();
  }, [id, refreshFlatNumbers]);

  const applyBulkStatus = (statusValue, numbersStr) => {
    const nums = parseNumberList(numbersStr);
    if (!nums.size) return;
    recordHistory(gridData);
    setGridData(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => {
        if (!next[k].merged && next[k].type === 'FLAT' && nums.has(String(next[k].display_name).trim())) {
          next[k] = { ...next[k], status: statusValue };
        }
      });
      return next;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let elements;
      if (viewMode === 'svg') {
        elements = svgShapes.map(shape => ({
          property_id: id,
          type: shape.type === 'plot' ? 'FLAT' : 'ROAD',
          name: shape.bhk ? `${shape.label}|${shape.bhk}` : shape.label,
          status: shape.status,
          color: shape.color,
          points: shape.points,
          x: 0, y: 0, width: 1, height: 1, rotation: 0,
          font_size: 10, font_weight: '900', visible: true,
        }));
      } else {
        elements = Object.keys(gridData)
          .filter((k) => !gridData[k].merged && gridData[k].type)
          .map((k) => {
            const cell = gridData[k];
            return {
              property_id: id, type: cell.type,
              x: cell.col, y: cell.row,
              width: cell.colSpan || 1, height: cell.rowSpan || 1,
              name: cell.bhk ? `${cell.display_name}|${cell.bhk}` : cell.display_name,
              status: cell.status,
              token_paid_to: cell.token_paid_to || null,
              rotation: parseInt(cell.rotation || 0), color: cell.color,
              font_size: parseInt(cell.font_size || 10), font_weight: cell.font_weight || '900',
              visible: true,
            };
          });
      }
      await saveFlatLayout(id, elements);
      showToast('Layout saved successfully!');
    } catch { showToast('Save failed', 'error'); }
    finally { setIsSaving(false); }
  };

  const applyAction = (type) => {
    let newGrid = { ...gridData };

    if (selectionMode === 'freeform') {
      const keys = Object.keys(freeformKeys);
      if (!keys.length) return;
      recordHistory(gridData);
      if (type === 'CLEAR') {
        keys.forEach(k => { delete newGrid[k]; });
      } else {
        keys.forEach(k => {
          const [r, c] = k.split('-').map(Number);
          newGrid[k] = {
            type, row: r, col: c, merged: false, anchorKey: null,
            colSpan: 1, rowSpan: 1,
            display_name: type === 'TEXT' ? 'LABEL' : '',
            bhk: '', status: 'Nil Booking', rotation: 0,
            color: type === 'TEXT' ? '#2563eb' : '#ffffff',
            font_size: type === 'TEXT' ? 14 : 10, font_weight: '900',
          };
        });
      }
      setGridData(refreshFlatNumbers(newGrid));
      setFreeformKeys({});
      return;
    }

    const { start, end } = selection;
    if (!start || !end) return;
    recordHistory(gridData);
    const rMin = Math.min(start.r, end.r), rMax = Math.max(start.r, end.r);
    const cMin = Math.min(start.c, end.c), cMax = Math.max(start.c, end.c);

    if (type === 'CLEAR') {
      for (let r = rMin; r <= rMax; r++)
        for (let c = cMin; c <= cMax; c++) delete newGrid[`${r}-${c}`];
    } else {
      const isText = type === 'TEXT';
      const shouldMerge = type !== 'FLAT';
      for (let r = rMin; r <= rMax; r++) {
        for (let c = cMin; c <= cMax; c++) {
          const key = `${r}-${c}`;
          const isAnchor = r === rMin && c === cMin;
          newGrid[key] = {
            type, row: r, col: c,
            merged: shouldMerge ? (isText ? false : !isAnchor) : false,
            anchorKey: shouldMerge && !isAnchor ? `${rMin}-${cMin}` : null,
            colSpan: shouldMerge && isAnchor ? cMax - cMin + 1 : 1,
            rowSpan: shouldMerge && isAnchor ? rMax - rMin + 1 : 1,
            display_name: isAnchor ? (isText ? 'LABEL' : '') : '',
            bhk: '', status: 'Nil Booking', rotation: 0,
            color: isText ? '#2563eb' : '#ffffff',
            font_size: isText ? 14 : 10, font_weight: '900',
          };
        }
      }
    }
    setGridData(refreshFlatNumbers(newGrid));
    setSelection({ start: null, end: null });
  };

  const applyBulkBhk = (bhkValue) => {
    if (!bhkValue.trim()) return;
    if (viewMode === 'svg') {
      setSvgShapes(prev => prev.map(s =>
        s.type === 'plot' ? { ...s, bhk: bhkValue.trim() } : s
      ));
      return;
    }
    const selectedKeys = selectionMode === 'freeform'
      ? Object.keys(freeformKeys)
      : (() => {
          const { start, end } = selection;
          if (!start || !end) return [];
          const keys = [];
          for (let r = Math.min(start.r, end.r); r <= Math.max(start.r, end.r); r++)
            for (let c = Math.min(start.c, end.c); c <= Math.max(start.c, end.c); c++)
              keys.push(`${r}-${c}`);
          return keys;
        })();
    if (!selectedKeys.length) { alert('Select flats first, then apply BHK.'); return; }
    recordHistory(gridData);
    setGridData(prev => {
      const next = { ...prev };
      selectedKeys.forEach(k => {
        if (next[k] && !next[k].merged && next[k].type === 'FLAT')
          next[k] = { ...next[k], bhk: bhkValue.trim() };
      });
      return next;
    });
  };

  const applyBulkBhkByLabel = (bhkValue, numbersStr) => {
    if (!bhkValue.trim() || !numbersStr.trim()) return;
    const nums = parseNumberList(numbersStr);
    if (!nums.size) return;
    setSvgShapes(prev => prev.map(s =>
      s.type === 'plot' && nums.has(String(s.label).trim())
        ? { ...s, bhk: bhkValue.trim() }
        : s
    ));
  };

  const activeCell = selectedCellKey ? gridData[selectedCellKey] : null;
  const statusButtons = [
    { label: 'Nil Booking', value: 'Nil Booking', color: 'Green' },
    { label: 'On Booking', value: 'ON_BOOKING', color: 'Yellow' },
    { label: 'Confirmed', value: 'CONFIRMED', color: 'Red' },
  ];
  const TOKEN_PAID_TO_OPTIONS = ['', 'Paid Us', 'Paid to Owner', 'Owner returned', 'Returned to buyer'];

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden font-sans">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {showDrawing && drawingImage && <DrawingModal url={drawingImage} onClose={() => setShowDrawing(false)} />}
      <div className="flex-1 flex flex-col min-w-0 relative">
        <div className="h-20 bg-white border-b flex items-center justify-between px-10 z-50 shrink-0">
          <div className="flex items-center gap-8">
            <button onClick={() => router.push('/admin/flats')} className="text-[11px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-all">← Back</button>
            <h1 className="font-black text-slate-800 uppercase text-lg tracking-tighter">Flat: <span className="text-blue-600">{id}</span></h1>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-1">
              <button onClick={() => setViewMode('grid')} className={`px-4 py-2 rounded-lg text-[11px] font-black uppercase transition-all ${viewMode === 'grid' ? 'bg-white text-blue-600 shadow' : 'text-slate-400 hover:text-slate-600'}`}>Grid</button>
              <button onClick={() => setViewMode('svg')} className={`px-4 py-2 rounded-lg text-[11px] font-black uppercase transition-all ${viewMode === 'svg' ? 'bg-white text-violet-600 shadow' : 'text-slate-400 hover:text-slate-600'}`}>SVG Map</button>
            </div>
            {drawingImage && (
              <button onClick={() => setShowDrawing(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-600 rounded-xl text-[11px] font-black uppercase transition-all">
                <span>🗺</span> View Drawing
              </button>
            )}
            <button onClick={handleUndo} disabled={history.length === 0} className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-blue-600 disabled:opacity-30 transition-all">
              <span className="text-lg">↩</span>
              <span className="text-[11px] font-black uppercase">Undo</span>
            </button>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-1 px-3">
              <button onClick={() => setZoom(z => Math.max(0.4, z - 0.1))} className="w-8 h-8 font-black text-slate-500 hover:bg-white rounded-xl transition-all">-</button>
              <span className="text-[12px] font-black w-12 text-center text-slate-700">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(z => Math.min(1.5, z + 0.1))} className="w-8 h-8 font-black text-slate-500 hover:bg-white rounded-xl transition-all">+</button>
            </div>
            <button onClick={handleSave} disabled={isSaving} className="px-10 py-3.5 bg-blue-600 text-white rounded-2xl text-[12px] font-black uppercase shadow-[0_15px_30px_-5px_rgba(37,99,235,0.4)] hover:shadow-[0_20px_40px_-5px_rgba(37,99,235,0.5)] active:scale-95 transition-all disabled:opacity-50">
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        <div className="bg-white border-b shrink-0">
          <button className="w-full px-10 py-2.5 flex items-center justify-between hover:bg-slate-50 transition-all" onClick={() => setShowBulkStatus(p => !p)}>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bulk Status</span>
            <span className="text-slate-400 text-xs">{showBulkStatus ? '▲ Hide' : '▼ Show'}</span>
          </button>
          {showBulkStatus && (
            <div className="px-10 pb-3 space-y-3">
              <div className="flex items-center gap-6 flex-wrap">
                {[
                  { key: 'nil', label: 'Nil Booking', value: 'Nil Booking', bg: 'bg-emerald-50 border-emerald-200 focus:border-emerald-500', pill: 'bg-emerald-500' },
                  { key: 'on', label: 'On Booking', value: 'ON_BOOKING', bg: 'bg-yellow-50 border-yellow-200 focus:border-yellow-500', pill: 'bg-yellow-400' },
                  { key: 'confirmed', label: 'Confirmed', value: 'CONFIRMED', bg: 'bg-red-50 border-red-200 focus:border-red-500', pill: 'bg-red-500' },
                ].map(({ key, label, value, bg, pill }) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${pill}`} />
                    <span className="text-[10px] font-black text-slate-500 uppercase">{label}</span>
                    <input
                      value={bulkInputs[key]}
                      onChange={e => setBulkInputs(prev => ({ ...prev, [key]: e.target.value }))}
                      onBlur={e => { if (e.target.value.trim()) applyBulkStatus(value, e.target.value); }}
                      placeholder="e.g. 1,3,5-8"
                      className={`w-32 px-3 py-1.5 rounded-lg border text-[11px] font-semibold outline-none ${bg}`}
                    />
                    <button
                      onClick={() => { if (bulkInputs[key].trim()) applyBulkStatus(value, bulkInputs[key]); }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-[10px] font-black uppercase text-slate-600 transition-all"
                    >Apply</button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3 pt-1 border-t border-slate-100">
                <span className="text-[10px] font-black text-slate-500 uppercase">Bulk BHK</span>
                {viewMode === 'grid' && <span className="text-[9px] text-slate-400">(select flats first)</span>}
                {[1,2,3,4].map(n => (
                  <button key={n} onClick={() => applyBulkBhk(String(n))}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-black uppercase border border-indigo-100 transition-all"
                  >{n} BHK</button>
                ))}
                <input
                  value={bulkBhk}
                  onChange={e => setBulkBhk(e.target.value.replace(/\D/g, '').slice(0, 2))}
                  placeholder="Custom"
                  className="w-20 px-3 py-1.5 rounded-lg border text-[11px] font-semibold outline-none bg-indigo-50 border-indigo-200 focus:border-indigo-500"
                />
                <button onClick={() => applyBulkBhk(bulkBhk)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-[10px] font-black uppercase text-slate-600 transition-all"
                >Apply</button>
              </div>
              {viewMode === 'svg' && (
                <div className="flex items-center gap-3 pt-1 border-t border-slate-100">
                  <span className="text-[10px] font-black text-slate-500 uppercase">BHK by Label</span>
                  <span className="text-[9px] text-slate-400">(SVG mode)</span>
                  <input
                    value={svgBulkBhkLabels}
                    onChange={e => setSvgBulkBhkLabels(e.target.value)}
                    placeholder="e.g. 1,3,5-8"
                    className="w-32 px-3 py-1.5 rounded-lg border text-[11px] font-semibold outline-none bg-indigo-50 border-indigo-200 focus:border-indigo-500"
                  />
                  {[1,2,3,4].map(n => (
                    <button key={n} onClick={() => applyBulkBhkByLabel(String(n), svgBulkBhkLabels)}
                      className="px-3 py-1.5 bg-violet-50 hover:bg-violet-100 text-violet-700 rounded-lg text-[10px] font-black uppercase border border-violet-100 transition-all"
                    >{n}BHK</button>
                  ))}
                  <input
                    value={svgBulkBhkValue}
                    onChange={e => setSvgBulkBhkValue(e.target.value.replace(/\D/g, '').slice(0, 2))}
                    placeholder="Custom"
                    className="w-20 px-3 py-1.5 rounded-lg border text-[11px] font-semibold outline-none bg-violet-50 border-violet-200 focus:border-violet-500"
                  />
                  <button onClick={() => applyBulkBhkByLabel(svgBulkBhkValue, svgBulkBhkLabels)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-[10px] font-black uppercase text-slate-600 transition-all"
                  >Apply</button>
                </div>
              )}
            </div>
          )}
        </div>

        {drawingImage && (
          <div className="bg-amber-50 border-b border-amber-100 shrink-0">
            <button className="w-full px-10 py-2 flex items-center justify-between hover:bg-amber-100 transition-all" onClick={() => setShowDrawingRef(p => !p)}>
              <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Drawing Reference {!showDrawingRef && '(click to expand)'}</span>
              <span className="text-amber-500 text-xs">{showDrawingRef ? '▲ Hide' : '▼ Show'}</span>
            </button>
            {showDrawingRef && (
              <div className="px-10 pb-4 flex justify-center">
                <img src={drawingImage} alt="Drawing" className="max-h-64 rounded-xl border border-amber-200 object-contain shadow-sm" />
              </div>
            )}
          </div>
        )}

        {viewMode === 'svg' ? (
          <div className="flex-1 overflow-hidden">
            <SvgMapEditor
              shapes={svgShapes}
              backgroundImage={drawingImage}
              unitType="FLAT"
              onChange={setSvgShapes}
            />
          </div>
        ) : null}

        <div className={`flex-1 overflow-auto p-20 bg-[#f0f4f8] ${viewMode === 'svg' ? 'hidden' : ''}`}>
          <div
            className="inline-grid bg-white shadow-2xl origin-top-left border-[0.5px] border-slate-200"
            style={{ gridTemplateColumns: `repeat(${dims.cols}, 32px)`, gridAutoRows: '32px', transform: `scale(${zoom})`, userSelect: 'none' }}
          >
            {Array.from({ length: dims.rows }, (_, r) =>
              Array.from({ length: dims.cols }, (_, c) => {
                const key = `${r}-${c}`;
                const cell = gridData[key];
                if (cell?.merged) return null;

                const inSel = selectionMode === 'freeform'
                  ? freeformKeys[key] === true
                  : (selection.start &&
                      r >= Math.min(selection.start.r, selection.end.r) && r <= Math.max(selection.start.r, selection.end.r) &&
                      c >= Math.min(selection.start.c, selection.end.c) && c <= Math.max(selection.start.c, selection.end.c));

                let cellClass = 'w-full h-full border-[0.1px] border-slate-100 flex items-center justify-center relative overflow-hidden ';
                let cellStyle = {};

                if (cell?.type === 'FLAT') {
                  cellClass += getBookingStatusStyles(cell.status).tile;
                  cellStyle = { fontSize: `${cell.font_size}px`, fontWeight: cell.font_weight, color: cell.color || '#fff' };
                } else if (cell?.type === 'ROAD') {
                  cellClass += 'bg-slate-700 text-white';
                } else if (cell?.type === 'TEXT') {
                  cellClass += 'bg-transparent';
                  cellStyle = { fontSize: `${cell.font_size || 14}px`, fontWeight: cell.font_weight || '900', color: cell.color || '#2563eb' };
                } else {
                  cellClass += 'bg-white hover:bg-slate-50 cursor-crosshair';
                }

                if (selectedCellKey === key) cellClass += ' outline outline-2 outline-blue-600 outline-offset-[-2px] z-30 shadow-lg';
                if (inSel) cellClass += ' !bg-blue-500/20';

                return (
                  <div
                    key={key}
                    style={{ gridColumnStart: c + 1, gridColumnEnd: `span ${cell?.colSpan || 1}`, gridRowStart: r + 1, gridRowEnd: `span ${cell?.rowSpan || 1}` }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setSelectedCellKey(key);
                      if (selectionMode === 'freeform') {
                        setFreeformKeys({ [key]: true });
                        setSelection({ start: null, end: null });
                      } else {
                        setSelection({ start: { r, c }, end: { r, c } });
                        setFreeformKeys({});
                      }
                      isSelectingRef.current = true;
                      setIsSelecting(true);
                    }}
                    onMouseEnter={() => {
                      if (!isSelectingRef.current) return;
                      if (selectionMode === 'freeform') {
                        setFreeformKeys(prev => ({ ...prev, [key]: true }));
                      } else {
                        setSelection(prev => ({ ...prev, end: { r, c } }));
                      }
                    }}
                    className={cellClass}
                  >
                    <span style={cellStyle} className="whitespace-nowrap pointer-events-none leading-none">{cell?.display_name || ''}</span>
                    {cell?.type === 'FLAT' && cell?.bhk && (
                      <span className="absolute bottom-0 left-0 right-0 flex justify-center gap-[2px] pb-[2px] pointer-events-none">
                        {Array.from({ length: parseInt(cell.bhk) || 0 }, (_, i) => (
                          <span key={i} style={{ width: 3, height: 3, borderRadius: '50%', backgroundColor: 'white', display: 'inline-block', flexShrink: 0 }} />
                        ))}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {viewMode === 'grid' && <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-xl border border-slate-200 shadow-2xl p-2 rounded-[28px] flex items-center gap-2 z-[60]">
          <button onClick={() => applyAction('FLAT')} className="px-7 py-3.5 bg-emerald-500 text-white text-[11px] font-black rounded-2xl uppercase hover:scale-105 active:scale-95 transition-all">Add Flats</button>
          <button onClick={() => applyAction('ROAD')} className="px-7 py-3.5 bg-slate-900 text-white text-[11px] font-black rounded-2xl uppercase hover:scale-105 active:scale-95 transition-all">Road</button>
          <button onClick={() => applyAction('TEXT')} className="px-7 py-3.5 bg-blue-600 text-white text-[11px] font-black rounded-2xl uppercase hover:scale-105 active:scale-95 transition-all">Text</button>
          <div className="w-px h-8 bg-slate-200 mx-2" />
          <button onClick={() => applyAction('CLEAR')} className="px-7 py-3.5 bg-slate-50 text-slate-400 text-[11px] font-black rounded-2xl uppercase hover:text-red-500 hover:bg-red-50 transition-all">Clear</button>
          <div className="w-px h-8 bg-slate-200 mx-2" />
          <button
            onClick={() => { setSelectionMode(m => m === 'rect' ? 'freeform' : 'rect'); setSelection({ start: null, end: null }); setFreeformKeys({}); }}
            className={`px-7 py-3.5 text-[11px] font-black rounded-2xl uppercase hover:scale-105 active:scale-95 transition-all ${selectionMode === 'freeform' ? 'bg-violet-600 text-white shadow-[0_8px_20px_-4px_rgba(124,58,237,0.4)]' : 'bg-slate-100 text-slate-500 hover:bg-violet-50 hover:text-violet-600'}`}
          >Free Select</button>
        </div>}
      </div>

      {selectedCellKey && activeCell && !activeCell.merged && (
        <div className="w-80 bg-white border-l border-slate-200 overflow-y-auto shrink-0 z-10">
          <div className="p-8 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Properties</h2>
              <button onClick={() => setSelectedCellKey(null)} className="text-slate-300 hover:text-red-500 text-xl">✕</button>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Type</p>
              <p className="font-black text-slate-800 text-sm">{activeCell.type}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                {activeCell.type === 'FLAT' ? 'Flat Number' : 'Label'}
              </p>
              <input
                value={activeCell.display_name || ''}
                onChange={(e) => setGridData(prev => ({ ...prev, [selectedCellKey]: { ...prev[selectedCellKey], display_name: e.target.value, isManual: activeCell.type === 'FLAT' } }))}
                className="w-full mt-2 p-3 bg-slate-50 border rounded-xl font-bold text-sm outline-none focus:border-blue-500"
              />
            </div>
            {activeCell.type === 'FLAT' && (
              <>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Status</p>
                  <div className="space-y-2">
                    {statusButtons.map(({ label, value, color }) => {
                      const styles = getBookingStatusStyles(value);
                      const currentNorm = String(activeCell.status || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
                      const isActive = currentNorm === value.trim().toUpperCase().replace(/[\s-]+/g, '_');
                      return (
                        <button key={value}
                          onClick={() => setGridData(prev => ({ ...prev, [selectedCellKey]: { ...prev[selectedCellKey], status: value } }))}
                          className={`w-full p-3 rounded-xl text-[11px] font-bold uppercase transition-all border ${isActive ? styles.buttonActive : styles.buttonInactive}`}
                        >{label} ({color})</button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">BHK</p>
                  <div className="flex gap-2 flex-wrap">
                    {['', '1', '2', '3', '4'].map(v => (
                      <button key={v} onClick={() => setGridData(prev => ({ ...prev, [selectedCellKey]: { ...prev[selectedCellKey], bhk: v } }))}
                        className={`px-3 py-2 rounded-xl text-[11px] font-bold border transition-all ${activeCell.bhk === v ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-indigo-50'}`}
                      >{v || 'None'}{v ? ' BHK' : ''}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Token Paid To</p>
                  <select
                    value={activeCell.token_paid_to || ''}
                    onChange={e => setGridData(prev => ({ ...prev, [selectedCellKey]: { ...prev[selectedCellKey], token_paid_to: e.target.value } }))}
                    className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-[11px] font-bold outline-none focus:border-blue-500"
                  >
                    {TOKEN_PAID_TO_OPTIONS.map(o => <option key={o} value={o}>{o || '— None —'}</option>)}
                  </select>
                </div>
              </>
            )}
            <div className="pt-8">
              <button
                onClick={() => {
                  recordHistory(gridData);
                  const newGrid = { ...gridData };
                  delete newGrid[selectedCellKey];
                  setGridData(refreshFlatNumbers(newGrid));
                  setSelectedCellKey(null);
                }}
                className="w-full py-4 bg-red-50 text-red-500 text-[10px] font-black rounded-xl uppercase hover:bg-red-500 hover:text-white transition-all"
              >Delete Element</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
