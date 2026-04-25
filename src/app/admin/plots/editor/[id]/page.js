'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getPlotLayout, savePlotLayout } from '@/lib/adminApi';

const getBookingStatusStyles = (status) => {
  const s = String(status || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (s === 'NIL_BOOKING') return { tile: 'bg-emerald-500 text-white shadow-inner', buttonActive: 'bg-emerald-500 text-white border-emerald-600', buttonInactive: 'bg-white text-emerald-600 border-emerald-100' };
  if (s === 'ON_BOOKING' || s === 'BOOKED') return { tile: 'bg-yellow-400 text-slate-900 shadow-inner', buttonActive: 'bg-yellow-400 text-slate-900 border-yellow-500', buttonInactive: 'bg-white text-yellow-600 border-yellow-100' };
  return { tile: 'bg-red-500 text-white shadow-inner', buttonActive: 'bg-red-500 text-white border-red-600', buttonInactive: 'bg-white text-red-600 border-red-100' };
};

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 2500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed top-6 right-6 z-[100] px-6 py-3 rounded-2xl shadow-xl text-sm font-bold ${type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
      {message}
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
  const isSelectingRef = useRef(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedCellKey, setSelectedCellKey] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState(null);

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
        const unitStatusByKey = new Map();
        const mapped = {};
        let maxR = 40, maxC = 60;

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
      } catch (err) { console.error(err); }
    };
    load();
  }, [id, refreshPlotNumbers]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const elements = Object.keys(gridData)
        .filter((k) => !gridData[k].merged && gridData[k].type)
        .map((k) => {
          const cell = gridData[k];
          return {
            property_id: id, type: cell.type,
            x: cell.col, y: cell.row,
            width: cell.colSpan || 1, height: cell.rowSpan || 1,
            name: cell.display_name, status: cell.status,
            rotation: parseInt(cell.rotation || 0), color: cell.color,
            font_size: parseInt(cell.font_size || 10), font_weight: cell.font_weight || '900',
            visible: true,
          };
        });
      await savePlotLayout(id, elements);
      showToast('Layout saved successfully!');
    } catch { showToast('Save failed', 'error'); }
    finally { setIsSaving(false); }
  };

  const applyAction = (type) => {
    const { start, end } = selection;
    if (!start || !end) return;
    recordHistory(gridData);
    let newGrid = { ...gridData };
    const rMin = Math.min(start.r, end.r), rMax = Math.max(start.r, end.r);
    const cMin = Math.min(start.c, end.c), cMax = Math.max(start.c, end.c);

    if (type === 'CLEAR') {
      for (let r = rMin; r <= rMax; r++)
        for (let c = cMin; c <= cMax; c++) delete newGrid[`${r}-${c}`];
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

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden font-sans">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <div className="flex-1 flex flex-col min-w-0 relative">
        <div className="h-20 bg-white border-b flex items-center justify-between px-10 z-50 shrink-0">
          <div className="flex items-center gap-8">
            <button onClick={() => router.push('/admin/plots')} className="text-[11px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-all">← Back</button>
            <h1 className="font-black text-slate-800 uppercase text-lg tracking-tighter">Plot: <span className="text-blue-600">{id}</span></h1>
          </div>
          <div className="flex items-center gap-6">
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

        <div className="flex-1 overflow-auto p-20 bg-[#f0f4f8]">
          <div
            className="inline-grid bg-white shadow-2xl origin-top-left border-[0.5px] border-slate-200"
            style={{ gridTemplateColumns: `repeat(${dims.cols}, 32px)`, gridAutoRows: '32px', transform: `scale(${zoom})`, userSelect: 'none' }}
          >
            {Array.from({ length: dims.rows }, (_, r) =>
              Array.from({ length: dims.cols }, (_, c) => {
                const key = `${r}-${c}`;
                const cell = gridData[key];
                if (cell?.merged) return null;

                const inSel = selection.start &&
                  r >= Math.min(selection.start.r, selection.end.r) && r <= Math.max(selection.start.r, selection.end.r) &&
                  c >= Math.min(selection.start.c, selection.end.c) && c <= Math.max(selection.start.c, selection.end.c);

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
                      setSelection({ start: { r, c }, end: { r, c } });
                      isSelectingRef.current = true;
                      setIsSelecting(true);
                    }}
                    onMouseEnter={() => {
                      if (isSelectingRef.current) setSelection(prev => ({ ...prev, end: { r, c } }));
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

        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-xl border border-slate-200 shadow-2xl p-2 rounded-[28px] flex items-center gap-2 z-[60]">
          <button onClick={() => applyAction('PLOT')} className="px-7 py-3.5 bg-emerald-500 text-white text-[11px] font-black rounded-2xl uppercase hover:scale-105 active:scale-95 transition-all">Add Plots</button>
          <button onClick={() => applyAction('ROAD')} className="px-7 py-3.5 bg-slate-900 text-white text-[11px] font-black rounded-2xl uppercase hover:scale-105 active:scale-95 transition-all">Road</button>
          <button onClick={() => applyAction('TEXT')} className="px-7 py-3.5 bg-blue-600 text-white text-[11px] font-black rounded-2xl uppercase hover:scale-105 active:scale-95 transition-all">Text Block</button>
          <div className="w-px h-8 bg-slate-200 mx-2" />
          <button onClick={() => applyAction('CLEAR')} className="px-7 py-3.5 bg-slate-50 text-slate-400 text-[11px] font-black rounded-2xl uppercase hover:text-red-500 hover:bg-red-50 transition-all">Clear</button>
        </div>
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
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase">Booking Status</label>
                <div className="grid grid-cols-1 gap-2 mt-2">
                  {[{ label: 'Nil Booking (Green)', value: 'Nil Booking' }, { label: 'On Booking (Yellow)', value: 'ON_BOOKING' }, { label: 'Booked (Yellow)', value: 'BOOKED' }].map(({ label, value }) => {
                    const styles = getBookingStatusStyles(value);
                    const norm = String(activeCell.status || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
                    const isActive = norm === value.trim().toUpperCase().replace(/[\s-]+/g, '_');
                    return (
                      <button key={value}
                        onClick={() => setGridData(prev => ({ ...prev, [selectedCellKey]: { ...prev[selectedCellKey], status: value } }))}
                        className={`p-3 rounded-xl text-[11px] font-bold uppercase transition-all border ${isActive ? styles.buttonActive : styles.buttonInactive}`}
                      >{label}</button>
                    );
                  })}
                </div>
              </div>
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
