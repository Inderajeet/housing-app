'use client';
import { useState, useRef, useCallback, useEffect } from 'react';

const STATUS_COLORS_SVG = {
  'Nil Booking': '#22c55e',
  'ON_BOOKING':  '#f59e0b',
  'CONFIRMED':   '#ef4444',
  'UNREGISTERED':'#ef4444',
  'REGISTERED':  '#dc2626',
  'SOLD':        '#b91c1c',
};

const STATUS_OPTIONS = ['Nil Booking', 'ON_BOOKING', 'CONFIRMED', 'UNREGISTERED', 'REGISTERED', 'SOLD'];

const genId = () => Math.random().toString(36).slice(2, 9);
const SNAP_CLOSE_THRESHOLD = 20;

const getBBox = (points) => {
  if (!points || !points.length) return { x: 0, y: 0, w: 0, h: 0, cx: 0, cy: 0 };
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  const x = Math.min(...xs), y = Math.min(...ys);
  const w = Math.max(...xs) - x, h = Math.max(...ys) - y;
  return { x, y, w, h, cx: x + w / 2, cy: y + h / 2 };
};

const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);

const getCentroid = (points) => {
  if (!points || !points.length) return { cx: 0, cy: 0 };
  return {
    cx: points.reduce((s, p) => s + p.x, 0) / points.length,
    cy: points.reduce((s, p) => s + p.y, 0) / points.length,
  };
};

const nextPlotLabel = (shapesArr) => {
  const maxL = shapesArr
    .filter(s => s.type === 'plot')
    .map(s => parseInt(s.label, 10))
    .filter(n => !isNaN(n))
    .reduce((max, n) => Math.max(max, n), 0);
  return String(maxL + 1);
};

export default function SvgMapEditor({ shapes, backgroundImage, unitType = 'PLOT', onChange }) {
  const svgRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [tool, setTool] = useState('select');
  const [drawing, setDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState(null);
  const [drawCurrent, setDrawCurrent] = useState(null);
  const [polyPoints, setPolyPoints] = useState([]);
  const polyPointsRef = useRef([]); // kept in sync; used in dblclick handler to avoid stale closure
  const [mousePos, setMousePos] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef(null);
  const [editPanel, setEditPanel] = useState(false);
  const [showBg, setShowBg] = useState(true);
  const [movingId, setMovingId] = useState(null);
  const [movingStart, setMovingStart] = useState(null);
  const [draggingPoint, setDraggingPoint] = useState(null); // { shapeId, pointIdx }
  const draggingPointRef = useRef(null);
  const undoStackRef = useRef([]); // stores previous shapes arrays for Ctrl+Z

  const selectedShape = shapes.find(s => s.id === selectedId);

  // Wrap onChange to push current shapes onto undo stack before every change
  const onChangeWithUndo = useCallback((newShapes) => {
    undoStackRef.current = [...undoStackRef.current, shapes];
    if (undoStackRef.current.length > 50) undoStackRef.current = undoStackRef.current.slice(-50);
    onChange(newShapes);
  }, [shapes, onChange]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        polyPointsRef.current = [];
        setPolyPoints([]);
        setMousePos(null);
        setDrawing(false);
        setMovingId(null);
        setMovingStart(null);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (undoStackRef.current.length === 0) return;
        const prev = undoStackRef.current[undoStackRef.current.length - 1];
        undoStackRef.current = undoStackRef.current.slice(0, -1);
        onChange(prev);
        setSelectedId(null);
        setEditPanel(false);
        setMovingId(null);
        setMovingStart(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onChange]);

  const getSvgPoint = useCallback((e) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (e.clientX - rect.left - offset.x) / scale,
      y: (e.clientY - rect.top - offset.y) / scale,
    };
  }, [offset, scale]);

  // Keeps state and ref in sync so dblclick handler always sees latest points
  const addPolyPoint = (p) => {
    const next = [...polyPointsRef.current, p];
    polyPointsRef.current = next;
    setPolyPoints(next);
  };

  const clearPolyPoints = () => {
    polyPointsRef.current = [];
    setPolyPoints([]);
    setMousePos(null);
  };

  const placeMovingShape = (p) => {
    if (!movingId || !movingStart) return;
    const dx = p.x - movingStart.x;
    const dy = p.y - movingStart.y;
    onChangeWithUndo(shapes.map(s =>
      s.id === movingId
        ? { ...s, points: s.points.map(pt => ({ x: pt.x + dx, y: pt.y + dy })) }
        : s
    ));
    setMovingId(null);
    setMovingStart(null);
  };

  const handleShapeDblClick = (shapeId, e) => {
    e.stopPropagation();
    if (tool !== 'select') return;
    const p = getSvgPoint(e);
    if (movingId) {
      placeMovingShape(p);
    } else {
      setSelectedId(shapeId);
      setEditPanel(true);
      setMovingId(shapeId);
      setMovingStart(p);
    }
  };

  const handleMouseDown = (e) => {
    if (movingId) return; // only dblclick places while in move mode

    const isCanvas = e.target === svgRef.current || e.target.tagName === 'image' ||
      (e.target.tagName === 'rect' && e.target.dataset.bg);

    if (isCanvas) {
      if (tool === 'select') { setSelectedId(null); setEditPanel(false); }
    }

    if (tool === 'pan') {
      setIsPanning(true);
      panStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
      return;
    }

    if (tool === 'rect') {
      const p = getSvgPoint(e);
      setDrawStart(p); setDrawCurrent(p); setDrawing(true);
      return;
    }

    if (tool === 'text' && isCanvas) {
      const p = getSvgPoint(e);
      const newShape = { id: genId(), type: 'text', points: [p], label: 'Label', fontSize: 14 };
      onChangeWithUndo([...shapes, newShape]);
      setSelectedId(newShape.id);
      setEditPanel(true);
      setTool('select');
      return;
    }

    if (tool === 'polygon' || tool === 'line') {
      const p = getSvgPoint(e);
      if (tool === 'polygon' && polyPointsRef.current.length > 2 && dist(p, polyPointsRef.current[0]) < SNAP_CLOSE_THRESHOLD / scale) {
        const newShape = {
          id: genId(), type: 'plot', closed: true,
          points: polyPointsRef.current,
          label: nextPlotLabel(shapes),
          status: 'Nil Booking', color: '#22c55e',
        };
        onChangeWithUndo([...shapes, newShape]);
        setSelectedId(newShape.id);
        setEditPanel(true);
        clearPolyPoints();
        setTool('select');
      } else {
        addPolyPoint(p);
      }
    }
  };

  const handleMouseMove = (e) => {
    if (draggingPointRef.current) {
      const { shapeId, pointIdx } = draggingPointRef.current;
      const p = getSvgPoint(e);
      onChange(shapes.map(s =>
        s.id !== shapeId ? s : { ...s, points: s.points.map((pt, i) => i === pointIdx ? p : pt) }
      ));
      return;
    }
    if (isPanning && panStart.current) {
      setOffset({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
    }
    if (drawing && tool === 'rect') {
      setDrawCurrent(getSvgPoint(e));
    }
    if (((tool === 'polygon' || tool === 'line') && polyPointsRef.current.length > 0) || movingId) {
      setMousePos(getSvgPoint(e));
    }
  };

  const handleMouseUp = () => {
    if (draggingPointRef.current) {
      setDraggingPoint(null);
      draggingPointRef.current = null;
      return;
    }
    if (isPanning) { setIsPanning(false); panStart.current = null; }
    if (drawing && tool === 'rect' && drawStart && drawCurrent) {
      const x1 = Math.min(drawStart.x, drawCurrent.x);
      const y1 = Math.min(drawStart.y, drawCurrent.y);
      const x2 = Math.max(drawStart.x, drawCurrent.x);
      const y2 = Math.max(drawStart.y, drawCurrent.y);
      if (Math.abs(x2 - x1) > 5 && Math.abs(y2 - y1) > 5) {
        const newShape = {
          id: genId(), type: 'plot', closed: true,
          points: [{ x: x1, y: y1 }, { x: x2, y: y1 }, { x: x2, y: y2 }, { x: x1, y: y2 }],
          label: nextPlotLabel(shapes),
          status: 'Nil Booking', color: '#22c55e',
        };
        onChangeWithUndo([...shapes, newShape]);
        setSelectedId(newShape.id);
        setEditPanel(true);
        setTool('select');
      }
      setDrawing(false); setDrawStart(null); setDrawCurrent(null);
    }
  };

  const handleDblClick = (e) => {
    if (movingId) {
      placeMovingShape(getSvgPoint(e));
      return;
    }
    if (tool === 'polygon' && polyPointsRef.current.length > 2) {
      // Double-click fires two mousedown events that each add a point; strip both
      const finalPoints = polyPointsRef.current.slice(0, -2);
      if (finalPoints.length < 3) { clearPolyPoints(); return; }
      const newShape = {
        id: genId(), type: 'plot', closed: true,
        points: finalPoints,
        label: nextPlotLabel(shapes),
        status: 'Nil Booking', color: '#22c55e',
      };
      onChangeWithUndo([...shapes, newShape]);
      setSelectedId(newShape.id);
      setEditPanel(true);
      clearPolyPoints();
      setTool('select');
      return;
    }
    if (tool === 'line' && polyPointsRef.current.length > 1) {
      const finalPoints = polyPointsRef.current.slice(0, -2);
      if (finalPoints.length < 2) { clearPolyPoints(); return; }
      const newShape = {
        id: genId(), type: 'road',
        points: finalPoints,
        label: '', color: '#1e293b',
      };
      onChangeWithUndo([...shapes, newShape]);
      clearPolyPoints();
      setTool('select');
    }
  };

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      setScale(s => Math.max(0.2, Math.min(5, s * factor)));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const autoAlign = () => {
    const plotItems = shapes.filter(s => s.type === 'plot');
    if (plotItems.length < 2) return;
    const THRESHOLD = 30;
    let aligned = shapes.map(s => ({ ...s, points: s.points.map(p => ({ ...p })) }));

    const getBox = (s) => getBBox(s.points);

    // Row alignment: group by similar cy → align bottom edge to first (leftmost) shape's bottom
    const withCy = plotItems.map(s => {
      const bb = getBox(s);
      return { id: s.id, cx: bb.cx, cy: bb.cy, bottom: bb.y + bb.h };
    });
    const sortedByY = [...withCy].sort((a, b) => a.cy - b.cy);
    const rows = [];
    sortedByY.forEach(item => {
      const row = rows.find(r => Math.abs(r.cy - item.cy) < THRESHOLD);
      if (row) row.items.push(item);
      else rows.push({ cy: item.cy, items: [item] });
    });
    rows.forEach(row => {
      if (row.items.length < 2) return;
      const sorted = [...row.items].sort((a, b) => a.cx - b.cx); // leftmost first
      const refBottom = sorted[0].bottom;
      sorted.slice(1).forEach(item => {
        const dy = refBottom - item.bottom;
        if (Math.abs(dy) < 0.5) return;
        const idx = aligned.findIndex(s => s.id === item.id);
        if (idx >= 0) aligned[idx] = { ...aligned[idx], points: aligned[idx].points.map(p => ({ ...p, y: p.y + dy })) };
      });
    });

    // Column alignment: recompute after row pass → align left edge to first (topmost) shape's left
    const withCx = aligned.filter(s => s.type === 'plot').map(s => {
      const bb = getBox(s);
      return { id: s.id, cx: bb.cx, cy: bb.cy, left: bb.x };
    });
    const sortedByX = [...withCx].sort((a, b) => a.cx - b.cx);
    const cols = [];
    sortedByX.forEach(item => {
      const col = cols.find(c => Math.abs(c.cx - item.cx) < THRESHOLD);
      if (col) col.items.push(item);
      else cols.push({ cx: item.cx, items: [item] });
    });
    cols.forEach(col => {
      if (col.items.length < 2) return;
      const sorted = [...col.items].sort((a, b) => a.cy - b.cy); // topmost first
      const refLeft = sorted[0].left;
      sorted.slice(1).forEach(item => {
        const dx = refLeft - item.left;
        if (Math.abs(dx) < 0.5) return;
        const idx = aligned.findIndex(s => s.id === item.id);
        if (idx >= 0) aligned[idx] = { ...aligned[idx], points: aligned[idx].points.map(p => ({ ...p, x: p.x + dx })) };
      });
    });

    onChangeWithUndo(aligned);
  };

  const updateShape = (id, updates) => onChangeWithUndo(shapes.map(s => s.id === id ? { ...s, ...updates } : s));

  const deleteShape = (id) => {
    onChangeWithUndo(shapes.filter(s => s.id !== id));
    setSelectedId(null);
    setEditPanel(false);
  };

  const duplicateShape = (id) => {
    const shape = shapes.find(s => s.id === id);
    if (!shape) return;
    const newShape = {
      ...shape,
      id: genId(),
      label: shape.type === 'plot' ? nextPlotLabel(shapes) : shape.label + ' (Copy)',
      points: shape.points.map(p => ({ x: p.x + 20, y: p.y + 20 })),
    };
    onChangeWithUndo([...shapes, newShape]);
    setSelectedId(newShape.id);
  };

  // Returns points with move offset applied when dragging
  const getEffectivePoints = (shape) => {
    if (movingId === shape.id && mousePos && movingStart) {
      const dx = mousePos.x - movingStart.x;
      const dy = mousePos.y - movingStart.y;
      return shape.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
    }
    return shape.points;
  };

  const roadShapes = shapes.filter(s => s.type === 'road');
  const plotShapes = shapes.filter(s => s.type === 'plot');
  const textShapes = shapes.filter(s => s.type === 'text');

  const cursorClass = movingId ? 'cursor-move'
    : tool === 'pan' ? (isPanning ? 'cursor-grabbing' : 'cursor-grab')
    : (tool === 'rect' || tool === 'polygon' || tool === 'line' || tool === 'text') ? 'cursor-crosshair'
    : 'cursor-default';

  return (
    <div className="flex h-full">
      <div className="flex-1 relative bg-slate-200 overflow-hidden select-none">

        {/* Left sidebar toolbar */}
        <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur rounded-2xl shadow-xl border border-slate-200 p-2 w-28">
          <div className="grid grid-cols-2 gap-1">
            <ToolBtn active={tool === 'select'} onClick={() => setTool('select')} label="Select" icon="↖" />
            <ToolBtn active={tool === 'pan'} onClick={() => setTool('pan')} label="Pan" icon="✋" />
            <ToolBtn active={tool === 'rect'} onClick={() => setTool('rect')} label="Rectangle" icon="⬜" color="emerald" />
            <ToolBtn active={tool === 'polygon'} onClick={() => setTool('polygon')} label="Polygon" icon="⬟" color="emerald" />
            <ToolBtn active={tool === 'line'} onClick={() => setTool('line')} label="Line" icon="╌" color="slate" />
            <ToolBtn active={tool === 'text'} onClick={() => setTool('text')} label="Text" icon="T" color="slate" />
            <ToolBtn active={!showBg} onClick={() => setShowBg(s => !s)} label="BG" icon="🖼" />
            <ToolBtn active={false} onClick={() => {
              if (undoStackRef.current.length === 0) return;
              const prev = undoStackRef.current[undoStackRef.current.length - 1];
              undoStackRef.current = undoStackRef.current.slice(0, -1);
              onChange(prev);
              setSelectedId(null); setEditPanel(false); setMovingId(null); setMovingStart(null);
            }} label="Undo" icon="↩" color="slate" />
            <ToolBtn active={false} onClick={autoAlign} label="Align" icon="⊞" color="slate" />
          </div>
          <div className="flex items-center justify-between mt-2 px-0.5">
            <button onClick={() => setScale(s => Math.max(0.2, s / 1.2))} className="w-7 h-7 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-black">−</button>
            <span className="text-[9px] font-mono text-slate-600">{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale(s => Math.min(5, s * 1.2))} className="w-7 h-7 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-black">+</button>
          </div>
        </div>

        {/* Status hints */}
        {(tool === 'polygon' || tool === 'line') && polyPoints.length > 0 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 bg-slate-900/80 text-white text-[11px] font-bold px-4 py-2 rounded-xl">
            {tool === 'polygon'
              ? `${polyPoints.length} pts — double-click to close · or click near start · Esc to cancel`
              : `${polyPoints.length} pts — double-click to end · Esc to cancel`}
          </div>
        )}
        {movingId && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 bg-blue-900/80 text-white text-[11px] font-bold px-4 py-2 rounded-xl">
            Moving — double-click to place · Esc to cancel
          </div>
        )}

        <svg
          ref={svgRef}
          className={`w-full h-full ${cursorClass}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onDoubleClick={handleDblClick}
        >
          <g style={{ transform: `translate(${offset.x}px,${offset.y}px) scale(${scale})`, transformOrigin: '0 0' }}>
            {backgroundImage && showBg && (
              <image href={backgroundImage} x="0" y="0" style={{ opacity: 0.5 }} data-bg="1" />
            )}

            {/* Road shapes */}
            {roadShapes.map(shape => {
              const pts = getEffectivePoints(shape);
              const isMoving = movingId === shape.id;
              const isSelected = selectedId === shape.id;
              const isClosed = shape.closed === true;
              const handlers = {
                className: 'cursor-pointer',
                onClick: e => { e.stopPropagation(); if (!movingId) { setSelectedId(shape.id); setEditPanel(true); } },
                onDoubleClick: e => handleShapeDblClick(shape.id, e),
              };
              const roadPts = pts.map(p => `${p.x},${p.y}`).join(' ');
              const roadCentroid = getCentroid(pts);
              const roadFill = isMoving || isSelected ? '#3b82f6' : '#1f2937';
              return (
                <g key={shape.id}>
                  {isClosed ? (
                    <polygon
                      points={roadPts}
                      fill={roadFill}
                      fillOpacity={isMoving ? 0.65 : 0.85}
                      stroke={isMoving || isSelected ? '#3b82f6' : 'none'}
                      strokeWidth={isMoving || isSelected ? 3 / scale : 0}
                      strokeLinejoin="round"
                      strokeDasharray={isMoving ? `${6 / scale},${3 / scale}` : undefined}
                      {...handlers}
                    />
                  ) : (
                    <polyline
                      points={roadPts}
                      fill="none"
                      stroke={roadFill}
                      strokeWidth={(isMoving || isSelected ? 4 : 3) / scale}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray={isMoving ? `${6 / scale},${3 / scale}` : undefined}
                      {...handlers}
                    />
                  )}
                  {shape.label && !/^\d+$/.test(shape.label.trim()) && (
                    <text
                      x={roadCentroid.cx} y={roadCentroid.cy}
                      textAnchor="middle" dominantBaseline="middle"
                      fontSize={(shape.fontSize || 11) / scale}
                      fontWeight="bold"
                      fill={isMoving || isSelected ? '#3b82f6' : '#ffffff'}
                      pointerEvents="none"
                      style={{ userSelect: 'none' }}
                    >
                      {shape.label}
                    </text>
                  )}
                  {isSelected && !isMoving && shape.points.map((pt, i) => (
                    <circle key={i} cx={pt.x} cy={pt.y} r={6 / scale}
                      fill={draggingPoint?.shapeId === shape.id && draggingPoint?.pointIdx === i ? '#1e293b' : 'white'}
                      stroke="#1e293b" strokeWidth={2 / scale}
                      style={{ cursor: 'grab' }}
                      onMouseDown={e => { e.stopPropagation(); setDraggingPoint({ shapeId: shape.id, pointIdx: i }); draggingPointRef.current = { shapeId: shape.id, pointIdx: i }; }}
                    />
                  ))}
                </g>
              );
            })}

            {/* Plot shapes */}
            {plotShapes.map(shape => {
              const pts = getEffectivePoints(shape);
              const color = STATUS_COLORS_SVG[shape.status] || '#22c55e';
              const isSelected = selectedId === shape.id;
              const isMoving = movingId === shape.id;
              const bbox = getBBox(pts);
              const centroid = getCentroid(pts);
              return (
                <g key={shape.id}>
                  <polygon
                    points={pts.map(p => `${p.x},${p.y}`).join(' ')}
                    fill={color}
                    fillOpacity={isMoving ? 0.65 : isSelected ? 0.95 : 0.85}
                    stroke={isMoving || isSelected ? '#3b82f6' : 'white'}
                    strokeWidth={(isMoving || isSelected ? 3 : 1.5) / scale}
                    strokeDasharray={isMoving ? `${6 / scale},${3 / scale}` : undefined}
                    className="cursor-pointer hover:fill-opacity-40 transition-all"
                    onClick={e => { e.stopPropagation(); if (!movingId) { setSelectedId(shape.id); setEditPanel(true); } }}
                    onDoubleClick={e => handleShapeDblClick(shape.id, e)}
                  />
                  {bbox.w > 10 / scale && (() => {
                    const baseFontSize = shape.fontSize || 11;
                    const labelLen = (shape.label || '').length || 1;
                    const maxByWidth = (bbox.w * 0.8) / (labelLen * 0.6);
                    const maxByHeight = bbox.h * 0.45;
                    const autoFont = Math.max(5, Math.min(baseFontSize, maxByWidth, maxByHeight));
                    const bhkN = parseInt(shape.bhk) || 0;
                    const dotR = Math.max(1.5, autoFont * 0.22);
                    const dotGap = dotR * 3;
                    const dotsY = centroid.cy + autoFont * 0.7 / scale;
                    const dotsStartX = centroid.cx - ((bhkN - 1) * dotGap) / 2;
                    return (
                      <>
                        <text
                          x={centroid.cx}
                          y={bhkN > 0 ? centroid.cy - autoFont * 0.35 / scale : centroid.cy}
                          textAnchor="middle" dominantBaseline="middle"
                          fontSize={autoFont / scale}
                          fontWeight="bold"
                          fill={isMoving || isSelected ? '#1d4ed8' : '#1e293b'}
                          pointerEvents="none"
                          style={{ userSelect: 'none' }}
                        >
                          {shape.label}
                        </text>
                        {bhkN > 0 && Array.from({ length: bhkN }, (_, i) => (
                          <circle
                            key={i}
                            cx={dotsStartX + i * dotGap}
                            cy={dotsY}
                            r={dotR / scale}
                            fill="white"
                            pointerEvents="none"
                          />
                        ))}
                      </>
                    );
                  })()}
                  {isSelected && !isMoving && shape.points.map((pt, i) => (
                    <circle key={i} cx={pt.x} cy={pt.y} r={6 / scale}
                      fill={draggingPoint?.shapeId === shape.id && draggingPoint?.pointIdx === i ? '#3b82f6' : 'white'}
                      stroke="#3b82f6" strokeWidth={2 / scale}
                      style={{ cursor: 'grab' }}
                      onMouseDown={e => { e.stopPropagation(); setDraggingPoint({ shapeId: shape.id, pointIdx: i }); draggingPointRef.current = { shapeId: shape.id, pointIdx: i }; }}
                    />
                  ))}
                </g>
              );
            })}

            {/* Text shapes */}
            {textShapes.map(shape => {
              const pt = getEffectivePoints(shape)[0];
              const isSelected = selectedId === shape.id;
              const isMoving = movingId === shape.id;
              return (
                <text
                  key={shape.id}
                  x={pt.x}
                  y={pt.y}
                  fontSize={(shape.fontSize || 14) / scale}
                  fontWeight="bold"
                  fill={isMoving || isSelected ? '#3b82f6' : '#1e293b'}
                  className="cursor-pointer select-none"
                  onClick={e => { e.stopPropagation(); if (!movingId) { setSelectedId(shape.id); setEditPanel(true); } }}
                  onDoubleClick={e => handleShapeDblClick(shape.id, e)}
                >
                  {shape.label}
                </text>
              );
            })}

            {/* Rect drawing preview */}
            {drawing && drawStart && drawCurrent && (
              <rect
                x={Math.min(drawStart.x, drawCurrent.x)}
                y={Math.min(drawStart.y, drawCurrent.y)}
                width={Math.abs(drawCurrent.x - drawStart.x)}
                height={Math.abs(drawCurrent.y - drawStart.y)}
                fill="rgba(34,197,94,0.2)"
                stroke="#22c55e"
                strokeWidth={2 / scale}
                strokeDasharray={`${6 / scale},${3 / scale}`}
              />
            )}

            {/* Polygon / line drawing preview */}
            {(tool === 'polygon' || tool === 'line') && polyPoints.length > 0 && (
              <g>
                <polyline
                  points={polyPoints.map(p => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke={tool === 'line' ? '#1e293b' : '#22c55e'}
                  strokeWidth={2 / scale}
                  strokeDasharray={`${4 / scale},${2 / scale}`}
                />
                {mousePos && !movingId && (
                  <line
                    x1={polyPoints[polyPoints.length - 1].x}
                    y1={polyPoints[polyPoints.length - 1].y}
                    x2={mousePos.x} y2={mousePos.y}
                    stroke="#94a3b8"
                    strokeWidth={1.5 / scale}
                    strokeDasharray={`${3 / scale},${2 / scale}`}
                  />
                )}
                {tool === 'polygon' && polyPoints.length > 2 && mousePos && dist(mousePos, polyPoints[0]) < SNAP_CLOSE_THRESHOLD / scale && (
                  <circle cx={polyPoints[0].x} cy={polyPoints[0].y} r={SNAP_CLOSE_THRESHOLD / scale}
                    fill="#22c55e" fillOpacity={0.25} stroke="#22c55e" strokeWidth={2 / scale} />
                )}
                {polyPoints.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r={4 / scale}
                    fill={i === 0 ? '#22c55e' : '#64748b'} />
                ))}
              </g>
            )}
          </g>
        </svg>
      </div>

      {/* Edit Panel */}
      {editPanel && selectedShape && (
        <div className="w-72 bg-white border-l shadow-2xl p-6 overflow-y-auto shrink-0 space-y-5">
          <div className="flex justify-between items-center">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Shape Properties</h3>
            <button onClick={() => { setEditPanel(false); setSelectedId(null); setMovingId(null); setMovingStart(null); }} className="text-slate-300 hover:text-red-500 text-lg">✕</button>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Label / Name</label>
            <input
              type="text"
              className="w-full p-2.5 bg-slate-50 border rounded-xl text-sm font-bold outline-none focus:border-blue-500"
              value={selectedShape.label || ''}
              onChange={e => updateShape(selectedShape.id, { label: e.target.value })}
            />
          </div>

          {(selectedShape.type === 'text' || selectedShape.type === 'plot' || selectedShape.type === 'road') && (
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Font Size</label>
              <input
                type="number"
                min="6" max="72"
                className="w-full p-2.5 bg-slate-50 border rounded-xl text-sm font-bold outline-none focus:border-blue-500"
                value={selectedShape.fontSize || (selectedShape.type === 'text' ? 14 : 11)}
                onChange={e => updateShape(selectedShape.id, { fontSize: Number(e.target.value) })}
              />
            </div>
          )}

          {(selectedShape.type === 'plot' || selectedShape.type === 'road') && (
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Type</label>
              <div className="flex gap-2">
                {['plot', 'road'].map(t => (
                  <button
                    key={t}
                    onClick={() => updateShape(selectedShape.id, { type: t })}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase border transition-all ${selectedShape.type === t ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedShape.type === 'plot' && (
            <>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-2">Booking Status</label>
                <div className="space-y-1.5">
                  {STATUS_OPTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => updateShape(selectedShape.id, { status: s, color: STATUS_COLORS_SVG[s] })}
                      className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg border text-xs font-semibold transition-all ${selectedShape.status === s ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                    >
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLORS_SVG[s] }} />
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-2">BHK</label>
                <div className="flex gap-2 flex-wrap">
                  {['', '1', '2', '3', '4'].map(v => (
                    <button
                      key={v}
                      onClick={() => updateShape(selectedShape.id, { bhk: v })}
                      className={`px-3 py-2 rounded-xl text-[11px] font-bold border transition-all ${(selectedShape.bhk || '') === v ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-indigo-50'}`}
                    >
                      {v || 'None'}{v ? ' BHK' : ''}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => duplicateShape(selectedShape.id)}
              className="flex-1 py-2.5 bg-slate-100 text-slate-700 text-xs font-black rounded-xl uppercase hover:bg-slate-200 transition-all"
            >
              Duplicate
            </button>
            <button
              onClick={() => deleteShape(selectedShape.id)}
              className="flex-1 py-2.5 bg-red-50 text-red-500 text-xs font-black rounded-xl uppercase hover:bg-red-500 hover:text-white transition-all"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ToolBtn({ active, onClick, label, icon, color = 'blue' }) {
  const colors = {
    blue:    active ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100',
    emerald: active ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:bg-slate-100',
    slate:   active ? 'bg-slate-700 text-white' : 'text-slate-500 hover:bg-slate-100',
  };
  return (
    <button
      onClick={onClick}
      title={label}
      className={`flex flex-col items-center justify-center gap-0.5 p-1.5 rounded-xl transition-all w-full ${colors[color] || colors.blue}`}
    >
      <span className="text-base leading-none">{icon}</span>
      <span className="text-[8px] font-black uppercase leading-none">{label}</span>
    </button>
  );
}
