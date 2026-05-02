'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getPlotLayout, savePlotLayout } from '@/lib/adminApi';
import SvgMapEditor from '@/components/admin/SvgMapEditor';

const STATUS_COLORS_SVG = {
  'Nil Booking': '#22c55e',
  'ON_BOOKING':  '#f59e0b',
  'CONFIRMED':   '#ef4444',
  'UNREGISTERED':'#ef4444',
  'REGISTERED':  '#dc2626',
  'SOLD':        '#b91c1c',
};

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

export default function PlotLayoutEditorPage() {
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
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'svg'
  const [svgShapes, setSvgShapes] = useState([]);
  const [direction, setDirection] = useState('horizontal'); // 'horizontal' | 'vertical'

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

  const refreshPlotNumbers = useCallback((currentGrid) => {
    const newGrid = { ...currentGrid };
    const keys = Object.keys(newGrid).filter((k) => newGrid[k].type === 'PLOT' && !newGrid[k].merged);
    keys.sort((a, b) => {
      const [rA, cA] = a.split('-').map(Number);
      const [rB, cB] = b.split('-').map(Number);
      return rA !== rB ? rA - rB : cA - cB;
    });
    let idx = 1;
    keys.forEach((k) => {
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
        const res = await getPlotLayout(id);
        const rawItems = Array.isArray(res.data) ? res.data : (res.data?.items || []);
        const propData = res.data;
        if (propData?.drawing_image) setDrawingImage(propData.drawing_image);
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

        // Load SVG shapes (elements with polygon points)
        const svgItems = rawItems.filter(item => item.points && Array.isArray(item.points) && item.points.length > 0);
        if (svgItems.length > 0) {
          setSvgShapes(svgItems.map((item, idx) => ({
            id: item.element_id ? `${item.element_id}_${idx}` : Math.random().toString(36).slice(2, 9),
            type: (item.type || 'PLOT').toUpperCase() === 'PLOT' ? 'plot' : 'road',
            points: item.points,
            label: item.name || '',
            status: item.status || 'Nil Booking',
            color: STATUS_COLORS_SVG[item.status] || item.color || '#22c55e',
            closed: item.closed ?? false,
            fontSize: item.font_size || 12,
          })));
          setViewMode('svg');
        }

        rawItems.forEach((item) => {
          if (item.type !== 'PLOT') return;
          const candidates = [
            item.plot_unit_id != null ? `id:${item.plot_unit_id}` : null,
            item.plot_number ? `name:${String(item.plot_number).trim()}` : null,
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

          const resolvedStatus = item.type === 'PLOT'
            ? (unitStatusByKey.get(`id:${item.plot_unit_id}`) || unitStatusByKey.get(`name:${String(item.name || item.plot_number || '').trim()}`) || item.status || 'Nil Booking')
            : item.status;

          const key = `${y}-${x}`;
          mapped[key] = {
            ...item, row: y, col: x, colSpan: w, rowSpan: h,
            display_name: item.name || item.label || '',
            isManual: isNaN(item.name) && item.type === 'PLOT',
            type: item.type || 'PLOT', status: resolvedStatus,
            token_paid_to: item.token_paid_to || '',
            rotation: item.rotation || 0,
            color: item.color || (item.type === 'TEXT' ? '#1e293b' : '#ffffff'),
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
        setGridData(refreshPlotNumbers(mapped));
      } catch { }
    };
    load();
  }, [id, refreshPlotNumbers]);

  const applyBulkStatus = (statusValue, numbersStr) => {
    const nums = parseNumberList(numbersStr);
    if (!nums.size) return;
    if (viewMode === 'svg') {
      setSvgShapes(prev => prev.map(s =>
        s.type === 'plot' && nums.has(String(s.label).trim())
          ? { ...s, status: statusValue, color: STATUS_COLORS_SVG[statusValue] || s.color }
          : s
      ));
    } else {
      recordHistory(gridData);
      setGridData(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(k => {
          if (!next[k].merged && next[k].type === 'PLOT' && nums.has(String(next[k].display_name).trim())) {
            next[k] = { ...next[k], status: statusValue };
          }
        });
        return next;
      });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let elements;
      if (viewMode === 'svg') {
        elements = svgShapes.map(shape => ({
          property_id: id,
          type: shape.type === 'plot' ? 'PLOT' : 'ROAD',
          name: shape.label,
          status: shape.status,
          color: shape.color,
          points: shape.points,
          closed: shape.closed ?? false,
          x: 0, y: 0, width: 1, height: 1, rotation: 0,
          font_size: shape.fontSize || 12,
          font_weight: '900', visible: true,
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
              name: cell.display_name, status: cell.status,
              token_paid_to: cell.token_paid_to || null,
              rotation: parseInt(cell.rotation || 0), color: cell.color,
              font_size: parseInt(cell.font_size || 10), font_weight: cell.font_weight || '900',
              visible: true,
            };
          });
      }
      await savePlotLayout(id, elements);
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
            status: 'Nil Booking', rotation: 0,
            color: type === 'TEXT' ? '#2563eb' : '#ffffff',
            font_size: type === 'TEXT' ? 14 : 10, font_weight: '900',
          };
        });
      }
      setGridData(refreshPlotNumbers(newGrid));
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
    } else if (type === 'PLOT') {
      if (direction === 'horizontal') {
        for (let r = rMin; r <= rMax; r++) {
          let c = cMin;
          while (c <= cMax) {
            const key = `${r}-${c}`;
            const span = c + 1 <= cMax ? 2 : 1;
            newGrid[key] = {
              type: 'PLOT', row: r, col: c, merged: false, anchorKey: null,
              colSpan: span, rowSpan: 1, display_name: '', isManual: false,
              status: 'Nil Booking', rotation: 0, color: '#ffffff', font_size: 10, font_weight: '900',
            };
            if (span === 2) newGrid[`${r}-${c + 1}`] = { merged: true, anchorKey: key };
            c += span;
          }
        }
      } else {
        for (let c = cMin; c <= cMax; c++) {
          let r = rMin;
          while (r <= rMax) {
            const key = `${r}-${c}`;
            const span = r + 1 <= rMax ? 2 : 1;
            newGrid[key] = {
              type: 'PLOT', row: r, col: c, merged: false, anchorKey: null,
              colSpan: 1, rowSpan: span, display_name: '', isManual: false,
              status: 'Nil Booking', rotation: 0, color: '#ffffff', font_size: 10, font_weight: '900',
            };
            if (span === 2) newGrid[`${r + 1}-${c}`] = { merged: true, anchorKey: key };
            r += span;
          }
        }
      }
    } else {
      const isRoad = type === 'ROAD';
      for (let r = rMin; r <= rMax; r++) {
        for (let c = cMin; c <= cMax; c++) {
          const key = `${r}-${c}`;
          const isAnchor = r === rMin && c === cMin;
          newGrid[key] = {
            type, row: r, col: c,
            merged: isRoad ? !isAnchor : false,
            anchorKey: isRoad && !isAnchor ? `${rMin}-${cMin}` : null,
            colSpan: isRoad && isAnchor ? cMax - cMin + 1 : 1,
            rowSpan: isRoad && isAnchor ? rMax - rMin + 1 : 1,
            display_name: isAnchor ? (type === 'TEXT' ? 'LABEL' : '') : '',
            status: 'Nil Booking', rotation: 0,
            color: type === 'TEXT' ? '#2563eb' : '#ffffff',
            font_size: type === 'TEXT' ? 14 : 10, font_weight: '900',
          };
        }
      }
    }
    setGridData(refreshPlotNumbers(newGrid));
    setSelection({ start: null, end: null });
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
            <button onClick={() => router.push('/admin/plots')} className="text-[11px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-all">← Back</button>
            <h1 className="font-black text-slate-800 uppercase text-lg tracking-tighter">Plot: <span className="text-blue-600">{id}</span></h1>
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
              {/* Plot labels reference */}
              {(() => {
                const plotLabels = viewMode === 'svg'
                  ? svgShapes.filter(s => s.type === 'plot').map(s => s.label).filter(Boolean)
                  : Object.values(gridData).filter(c => c && !c.merged && c.type === 'PLOT' && c.display_name).map(c => c.display_name);
                if (!plotLabels.length) return null;
                return (
                  <div className="text-[10px] text-slate-400 font-semibold">
                    <span className="font-black uppercase text-slate-500 mr-2">Plot Labels:</span>
                    {plotLabels.slice(0, 60).join(', ')}{plotLabels.length > 60 ? ` …+${plotLabels.length - 60}` : ''}
                  </div>
                );
              })()}
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
              unitType="PLOT"
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

                if (cell?.type === 'PLOT') {
                  cellClass += getBookingStatusStyles(cell.status).tile;
                  cellStyle = { fontSize: `${cell.font_size}px`, fontWeight: cell.font_weight, transform: `rotate(${cell.rotation}deg)` };
                } else if (cell?.type === 'ROAD') {
                  cellClass += 'bg-[#1e293b] text-slate-500';
                } else if (cell?.type === 'TEXT') {
                  cellClass += 'bg-transparent font-bold';
                  cellStyle = { color: cell.color, fontSize: `${cell.font_size}px`, fontWeight: cell.font_weight, transform: `rotate(${cell.rotation}deg)` };
                } else {
                  cellClass += 'bg-white hover:bg-blue-50/50';
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
                        const defaultEnd = direction === 'horizontal'
                          ? { r, c: Math.min(c + 1, dims.cols - 1) }
                          : { r: Math.min(r + 1, dims.rows - 1), c };
                        setSelection({ start: { r, c }, end: defaultEnd });
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
                    <span style={cellStyle} className="whitespace-nowrap pointer-events-none">{cell?.display_name || ''}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {viewMode === 'grid' && <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-xl border border-slate-200 shadow-2xl p-2 rounded-[28px] flex items-center gap-2 z-[60]">
          <button onClick={() => applyAction('PLOT')} className="px-7 py-3.5 bg-emerald-500 text-white text-[11px] font-black rounded-2xl uppercase hover:scale-105 active:scale-95 transition-all">Add Plots</button>
          <button onClick={() => applyAction('ROAD')} className="px-7 py-3.5 bg-slate-900 text-white text-[11px] font-black rounded-2xl uppercase hover:scale-105 active:scale-95 transition-all">Road</button>
          <button onClick={() => applyAction('TEXT')} className="px-7 py-3.5 bg-blue-600 text-white text-[11px] font-black rounded-2xl uppercase hover:scale-105 active:scale-95 transition-all">Text Block</button>
          <div className="w-px h-8 bg-slate-200 mx-2" />
          <button onClick={() => applyAction('CLEAR')} className="px-7 py-3.5 bg-slate-50 text-slate-400 text-[11px] font-black rounded-2xl uppercase hover:text-red-500 hover:bg-red-50 transition-all">Clear</button>
          <div className="w-px h-8 bg-slate-200 mx-2" />
          <button
            onClick={() => { setSelectionMode(m => m === 'rect' ? 'freeform' : 'rect'); setSelection({ start: null, end: null }); setFreeformKeys({}); }}
            className={`px-7 py-3.5 text-[11px] font-black rounded-2xl uppercase hover:scale-105 active:scale-95 transition-all ${selectionMode === 'freeform' ? 'bg-violet-600 text-white shadow-[0_8px_20px_-4px_rgba(124,58,237,0.4)]' : 'bg-slate-100 text-slate-500 hover:bg-violet-50 hover:text-violet-600'}`}
          >Free Select</button>
          <div className="w-px h-8 bg-slate-200 mx-2" />
          <div className="flex items-center bg-slate-100 rounded-2xl p-1 gap-1">
            <button
              onClick={() => setDirection('horizontal')}
              className={`px-5 py-2.5 text-[11px] font-black rounded-xl uppercase transition-all ${direction === 'horizontal' ? 'bg-white text-blue-600 shadow' : 'text-slate-400 hover:text-slate-600'}`}
            >⟷ Horizontal</button>
            <button
              onClick={() => setDirection('vertical')}
              className={`px-5 py-2.5 text-[11px] font-black rounded-xl uppercase transition-all ${direction === 'vertical' ? 'bg-white text-blue-600 shadow' : 'text-slate-400 hover:text-slate-600'}`}
            >↕ Vertical</button>
          </div>
        </div>}
      </div>

      {selectedCellKey && activeCell && !activeCell.merged && (
        <div className="w-80 bg-white border-l shadow-2xl p-8 z-[70] overflow-y-auto shrink-0">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Properties</h2>
            <button onClick={() => setSelectedCellKey(null)} className="text-slate-300 hover:text-red-500 text-xl">✕</button>
          </div>
          <div className="space-y-6">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase">Display Name</label>
              <input
                type="text"
                className="w-full mt-2 p-3 bg-slate-50 border rounded-xl font-bold text-sm outline-none focus:border-blue-500"
                value={activeCell.display_name || ''}
                onChange={(e) => setGridData(prev => ({ ...prev, [selectedCellKey]: { ...prev[selectedCellKey], display_name: e.target.value, isManual: true } }))}
              />
            </div>
            <div>
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black text-slate-400 uppercase">Rotation (45° Steps)</label>
                <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">{activeCell.rotation || 0}°</span>
              </div>
              <input
                type="range" min="0" max="315" step="45"
                className="w-full mt-4 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                value={activeCell.rotation || 0}
                onChange={(e) => setGridData(prev => ({ ...prev, [selectedCellKey]: { ...prev[selectedCellKey], rotation: parseInt(e.target.value) } }))}
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase">Font Size (px)</label>
              <input
                type="number"
                className="w-full mt-2 p-3 bg-slate-50 border rounded-xl font-bold text-sm outline-none focus:border-blue-500"
                value={activeCell.font_size || 10}
                onChange={(e) => setGridData(prev => ({ ...prev, [selectedCellKey]: { ...prev[selectedCellKey], font_size: e.target.value } }))}
              />
            </div>
            {activeCell.type === 'TEXT' && (
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase">Text Color</label>
                <div className="flex gap-3 mt-2">
                  <input
                    type="color"
                    className="w-12 h-12 p-1 bg-white border rounded-xl cursor-pointer"
                    value={activeCell.color || '#000000'}
                    onChange={(e) => setGridData(prev => ({ ...prev, [selectedCellKey]: { ...prev[selectedCellKey], color: e.target.value } }))}
                  />
                  <input type="text" className="flex-1 p-3 bg-slate-50 border rounded-xl font-mono text-xs uppercase" value={activeCell.color} readOnly />
                </div>
              </div>
            )}
            {activeCell.type === 'PLOT' && (
              <>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase">Booking Status</label>
                  <div className="grid grid-cols-1 gap-2 mt-2">
                    {statusButtons.map(({ label, value, color }) => {
                      const styles = getBookingStatusStyles(value);
                      const norm = String(activeCell.status || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
                      const isActive = norm === value.trim().toUpperCase().replace(/[\s-]+/g, '_');
                      return (
                        <button key={value}
                          onClick={() => setGridData(prev => ({ ...prev, [selectedCellKey]: { ...prev[selectedCellKey], status: value } }))}
                          className={`p-3 rounded-xl text-[11px] font-bold uppercase transition-all border ${isActive ? styles.buttonActive : styles.buttonInactive}`}
                        >{label} ({color})</button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Token Paid To</label>
                  <select
                    value={activeCell.token_paid_to || ''}
                    onChange={e => setGridData(prev => ({ ...prev, [selectedCellKey]: { ...prev[selectedCellKey], token_paid_to: e.target.value } }))}
                    className="w-full p-3 bg-slate-50 border rounded-xl font-bold text-sm outline-none focus:border-blue-500"
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
                  setGridData(refreshPlotNumbers(newGrid));
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
