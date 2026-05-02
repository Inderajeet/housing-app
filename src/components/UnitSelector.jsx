'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { endpoints } from '../api/api';
import '../styles/UnitSelector.css';

const layoutCache = new Map();

const UnitSelector = ({ propertyId, onSelectUnit, saleType, onNoPlots, refreshKey = 0 }) => {
    const [dims, setDims] = useState({ rows: 40, cols: 60 });
    const [gridData, setGridData] = useState({});
    const [svgItems, setSvgItems] = useState([]); // shapes when SVG mode was saved
    const [loading, setLoading] = useState(true);
    const [hasPlots, setHasPlots] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [svgZoom, setSvgZoom] = useState(1);
    const [svgPan, setSvgPan] = useState({ x: 0, y: 0 });
    const [pendingCell, setPendingCell] = useState(null);
    const svgRef = useRef(null);
    const panStartRef = useRef(null);
    const pendingTimerRef = useRef(null);

    const normalizedSaleType = (saleType || '').toLowerCase();
    const isFlat = normalizedSaleType === 'flat';
    const unitLabel = isFlat ? 'flat' : 'plot';
    const unitTypeName = isFlat ? 'FLAT' : 'PLOT';
    const preferredUnitIdField = isFlat ? 'flat_unit_id' : 'plot_unit_id';
    const preferredUnitNumberField = isFlat ? 'flat_number' : 'plot_number';
    const fallbackUnitIdField = isFlat ? 'plot_unit_id' : 'flat_unit_id';
    const fallbackUnitNumberField = isFlat ? 'plot_number' : 'flat_number';

    const getUnitId = (item) => item?.[preferredUnitIdField] ?? item?.[fallbackUnitIdField] ?? null;
    const getUnitNumber = (item) => item?.[preferredUnitNumberField] ?? item?.[fallbackUnitNumberField] ?? null;

    const refreshPlotNumbers = (currentGrid) => {
        const newGrid = { ...currentGrid };
        const plotKeys = Object.keys(newGrid).filter(
            (key) => newGrid[key].type === unitTypeName && !newGrid[key].merged
        );
        plotKeys.sort((a, b) => {
            const [rA, cA] = a.split('-').map(Number);
            const [rB, cB] = b.split('-').map(Number);
            return rA !== rB ? rA - rB : cA - cB;
        });

        let currentAutoIndex = 1;
        plotKeys.forEach((key) => {
            const cell = newGrid[key];
            const unitNumber = getUnitNumber(cell);
            if (unitNumber) {
                cell.display_name = unitNumber.toString();
                cell.isManual = true;
            } else if (!(cell.isManual && cell.display_name !== "")) {
                cell.display_name = currentAutoIndex.toString();
                cell.isManual = false;
                currentAutoIndex++;
            }
        });

        return newGrid;
    };

    useEffect(() => {
        const fetchLayout = async () => {
            setLoading(true);
            setLoadError('');

            try {
                const cacheKey = `${propertyId}:${normalizedSaleType || 'property'}`;
                const cachedItems = layoutCache.get(cacheKey);
                const shouldBypassCache = refreshKey > 0;
                const response = shouldBypassCache || !cachedItems
                    ? (isFlat ? await endpoints.getFlatLayout(propertyId) : await endpoints.getPlotLayout(propertyId))
                    : { data: cachedItems };
                const rawItems = Array.isArray(response.data) ? response.data : (response.data?.items || []);
                layoutCache.set(cacheKey, rawItems);

                // SVG mode: items with polygon points were saved via the SVG map editor.
                // All SVG shapes are stored with x=0,y=0 so grid processing would collapse
                // them all onto key "0-0" — detect them first and skip grid processing.
                const svgLayoutItems = rawItems.filter(item =>
                    item.points && Array.isArray(item.points) && item.points.length > 0
                );
                if (svgLayoutItems.length > 0) {
                    const unitItems = rawItems.filter(item => getUnitId(item) != null);
                    const merged = svgLayoutItems.map(shape => {
                        const unit = unitItems.find(u =>
                            getUnitNumber(u)?.toString() === (shape.name || shape.label || '').toString()
                        );
                        return {
                            ...shape,
                            ...(unit ? {
                                [preferredUnitIdField]: getUnitId(unit),
                                plot_unit_id: unit.plot_unit_id,
                                flat_unit_id: unit.flat_unit_id,
                                formatted_id: unit.formatted_id,
                                status: unit.status || shape.status || 'Nil Booking',
                            } : {
                                status: shape.status || 'Nil Booking',
                            }),
                            display_name: shape.name || shape.label || '',
                        };
                    });
                    setSvgItems(merged);
                    setHasPlots(merged.some(s => (s.type || '').toUpperCase() === unitTypeName));
                    setLoading(false);
                    return;
                }

                const plotItems = rawItems.filter(item => getUnitId(item) != null);
                const layoutItems = rawItems.filter(item => getUnitId(item) == null);

                const mapped = {};
                let minR = Number.POSITIVE_INFINITY;
                let minC = Number.POSITIVE_INFINITY;
                let maxR = 0;
                let maxC = 0;

                layoutItems.forEach(item => {
                    const x = parseInt(item.x, 10);
                    const y = parseInt(item.y, 10);
                    const w = parseInt(item.width, 10) || 1;
                    const h = parseInt(item.height, 10) || 1;
                    if (isNaN(x) || isNaN(y)) return;
                    if (y < minR) minR = y;
                    if (x < minC) minC = x;
                    if (y + h > maxR) maxR = y + h;
                    if (x + w > maxC) maxC = x + w;

                    const key = `${y}-${x}`;
                    mapped[key] = {
                        ...item,
                        row: y, col: x, colSpan: w, rowSpan: h,
                        display_name: item.name || item.label || '',
                        type: item.type || unitTypeName,
                        rotation: item.rotation || 0,
                        color: item.color || (item.type === 'TEXT' ? '#1e293b' : '#ffffff'),
                        font_size: item.font_size || 10,
                        font_weight: item.font_weight || '900',
                    };

                    if (w > 1 || h > 1) {
                        for (let r = 0; r < h; r++) {
                            for (let c = 0; c < w; c++) {
                                if (r === 0 && c === 0) continue;
                                mapped[`${y + r}-${x + c}`] = { merged: true, anchorKey: key };
                            }
                        }
                    }
                });

                plotItems.forEach(plot => {
                    const unitId = getUnitId(plot);
                    const unitNumber = getUnitNumber(plot);
                    const plotX = parseInt(plot.x, 10) || 0;
                    const plotY = parseInt(plot.y, 10) || 0;
                    if (plotY < minR) minR = plotY;
                    if (plotX < minC) minC = plotX;
                    if (plotY + 1 > maxR) maxR = plotY + 1;
                    if (plotX + 1 > maxC) maxC = plotX + 1;

                    const cellKey = Object.keys(mapped).find(
                        key => mapped[key].display_name === unitNumber?.toString()
                    );
                    if (cellKey) {
                        mapped[cellKey] = {
                            ...mapped[cellKey],
                            [preferredUnitIdField]: unitId,
                            [preferredUnitNumberField]: unitNumber,
                            plot_unit_id: plot.plot_unit_id,
                            flat_unit_id: plot.flat_unit_id,
                            plot_number: plot.plot_number,
                            flat_number: plot.flat_number,
                            formatted_id: plot.formatted_id,
                            type: unitTypeName,
                            status: plot.status.toUpperCase() || 'NIL_BOOKING',
                        };
                    } else {
                        const key = `${plotY}-${plotX}`;
                        mapped[key] = {
                            ...plot,
                            [preferredUnitIdField]: unitId,
                            [preferredUnitNumberField]: unitNumber,
                            row: plotY, col: plotX, colSpan: 1, rowSpan: 1,
                            display_name: unitNumber?.toString() || '',
                            type: unitTypeName,
                            status: plot.status.toUpperCase() || 'NIL_BOOKING',
                        };
                    }
                });

                if (!Number.isFinite(minR)) {
                    setDims({ rows: 0, cols: 0 });
                    setGridData({});
                    setHasPlots(false);
                } else {
                    const normalized = {};
                    Object.keys(mapped).forEach((key) => {
                        const cell = mapped[key];
                        if (cell.merged) {
                            const [r, c] = key.split('-').map(Number);
                            normalized[`${r - minR}-${c - minC}`] = { ...cell };
                            return;
                        }
                        const newRow = cell.row - minR;
                        const newCol = cell.col - minC;
                        normalized[`${newRow}-${newCol}`] = { ...cell, row: newRow, col: newCol };
                    });
                    setDims({ rows: maxR - minR + 1, cols: maxC - minC + 1 });
                    setGridData(refreshPlotNumbers(normalized));
                    const anyPlots = Object.values(normalized).some(
                        (cell) => cell && !cell.merged && (cell.type || unitTypeName) === unitTypeName
                    );
                    setHasPlots(anyPlots);
                }
            } catch (err) {
                if (err?.response?.status === 429) {
                    setLoadError('Layout is temporarily rate-limited. Please wait a moment and try again.');
                } else {
                    setLoadError('Unable to load the unit layout right now.');
                }
            } finally {
                setLoading(false);
            }
        };
        fetchLayout();
    }, [propertyId, preferredUnitIdField, preferredUnitNumberField, unitTypeName, normalizedSaleType, isFlat, refreshKey]);

    useEffect(() => {
        if (!loading && !loadError && !hasPlots) onNoPlots?.();
    }, [loading, hasPlots, loadError, onNoPlots]);

    const rowsArray = useMemo(() => Array.from({ length: dims.rows }), [dims.rows]);
    const colsArray = useMemo(() => Array.from({ length: dims.cols }), [dims.cols]);

    if (loading) return <div className="unit-selector-subtitle">Loading Layout...</div>;
    if (loadError) {
        return (
            <div className="unit-selector-container">
                <h2 className="unit-selector-title">{isFlat ? 'Book Flats' : 'Book Plots'}</h2>
                <p className="unit-selector-subtitle">{loadError}</p>
            </div>
        );
    }
    if (!hasPlots) return null;

    const titleLabel = normalizedSaleType === 'plot' ? 'Book Plots' : normalizedSaleType === 'flat' ? 'Book Flats' : 'Book Plots';

    const STATUS_SVG_COLORS = {
        'Nil Booking': '#22c55e', 'NIL_BOOKING': '#22c55e',
        'ON_BOOKING': '#f59e0b',
        'CONFIRMED': '#ef4444', 'UNREGISTERED': '#ef4444',
        'REGISTERED': '#dc2626', 'SOLD': '#b91c1c', 'RENTED': '#b91c1c',
        'BOOKED': '#ef4444',
    };

    const getSvgBBox = (pts) => {
        const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
        const minX = Math.min(...xs), minY = Math.min(...ys);
        const maxX = Math.max(...xs), maxY = Math.max(...ys);
        return { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, w: maxX - minX, h: maxY - minY };
    };

    if (svgItems.length > 0) {
        const plotSvgItems = svgItems.filter(s => (s.type || '').toUpperCase() === unitTypeName);
        const roadSvgItems = svgItems.filter(s => ['ROAD', 'LINE'].includes((s.type || '').toUpperCase()));
        const textSvgItems = svgItems.filter(s => (s.type || '').toUpperCase() === 'TEXT');

        const allPts = svgItems.flatMap(s => s.points || []);
        if (allPts.length === 0) return null;
        const viewMinX = Math.min(...allPts.map(p => p.x)) - 10;
        const viewMinY = Math.min(...allPts.map(p => p.y)) - 10;
        const viewMaxX = Math.max(...allPts.map(p => p.x)) + 10;
        const viewMaxY = Math.max(...allPts.map(p => p.y)) + 10;
        const vbFullW = viewMaxX - viewMinX;
        const vbFullH = viewMaxY - viewMinY;
        const vbW = vbFullW / svgZoom;
        const vbH = vbFullH / svgZoom;
        const vbX = viewMinX + vbFullW / 2 - vbW / 2 + svgPan.x;
        const vbY = viewMinY + vbFullH / 2 - vbH / 2 + svgPan.y;
        const vb = `${vbX} ${vbY} ${vbW} ${vbH}`;

        const handleSvgPointerDown = (e) => {
            if (e.target.tagName === 'polygon') return;
            panStartRef.current = {
                clientX: e.clientX, clientY: e.clientY,
                panX: svgPan.x, panY: svgPan.y,
            };
        };
        const handleSvgPointerMove = (e) => {
            if (!panStartRef.current) return;
            const svgEl = svgRef.current;
            if (!svgEl) return;
            const rect = svgEl.getBoundingClientRect();
            const scaleX = vbW / rect.width;
            const scaleY = vbH / rect.height;
            const dx = (e.clientX - panStartRef.current.clientX) * scaleX;
            const dy = (e.clientY - panStartRef.current.clientY) * scaleY;
            setSvgPan({ x: panStartRef.current.panX - dx, y: panStartRef.current.panY - dy });
        };
        const handleSvgPointerUp = () => { panStartRef.current = null; };

        const handlePlotClick = (cell) => {
            const st = (cell.status || '').toUpperCase().replace(/[\s-]+/g, '_');
            const blocked = ['CONFIRMED','UNREGISTERED','REGISTERED','SOLD','RENTED','TOKEN_PAID','ADVANCE_PAID','CLOSED','BOOKED'].includes(st);
            if (blocked) return;
            if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
            if (pendingCell === cell) {
                setPendingCell(null);
                return;
            }
            setPendingCell(cell);
            pendingTimerRef.current = setTimeout(() => {
                onSelectUnit(cell);
                setPendingCell(null);
                pendingTimerRef.current = null;
            }, 1000);
        };

        return (
            <div className="unit-selector-container">
                <h2 className="unit-selector-title">{titleLabel}</h2>
                <p className="unit-selector-subtitle">
                    {pendingCell
                        ? `Plot ${pendingCell.display_name} selected — proceeding…`
                        : `Select and Visit`}
                </p>
                <div className="unit-grid-scroll" style={{ height: 400, position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 10, display: 'flex', alignItems: 'center', gap: 4, background: 'white', borderRadius: 8, padding: '4px 8px', border: '1px solid #e2e8f0', fontSize: 12, fontWeight: 700, color: '#334155', userSelect: 'none' }}>
                        <button onClick={() => setSvgZoom(z => Math.min(4, +(z + 0.25).toFixed(2)))} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, lineHeight: 1, color: '#334155', padding: '0 2px' }}>+</button>
                        <span style={{ minWidth: 36, textAlign: 'center' }}>{Math.round(svgZoom * 100)}%</span>
                        <button onClick={() => setSvgZoom(z => Math.max(0.25, +(z - 0.25).toFixed(2)))} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, lineHeight: 1, color: '#334155', padding: '0 2px' }}>−</button>
                        {(svgPan.x !== 0 || svgPan.y !== 0) && (
                            <button onClick={() => setSvgPan({ x: 0, y: 0 })} style={{ border: 'none', background: '#f1f5f9', cursor: 'pointer', fontSize: 10, fontWeight: 900, color: '#64748b', padding: '2px 6px', borderRadius: 4, marginLeft: 4 }}>Reset</button>
                        )}
                    </div>
                    <svg
                        ref={svgRef}
                        viewBox={vb}
                        style={{ width: '100%', height: '100%', cursor: panStartRef.current ? 'grabbing' : 'grab', touchAction: 'none' }}
                        className="rounded-xl border border-gray-200"
                        onPointerDown={handleSvgPointerDown}
                        onPointerMove={handleSvgPointerMove}
                        onPointerUp={handleSvgPointerUp}
                        onPointerLeave={handleSvgPointerUp}
                    >
                        {roadSvgItems.map((shape, idx) => {
                            const pts = shape.points || [];
                            if (shape.closed === true) {
                                return (
                                    <polygon key={`road-${idx}`}
                                        points={pts.map(p => `${p.x},${p.y}`).join(' ')}
                                        fill="#1f2937" fillOpacity={0.85}
                                        stroke="none"
                                    />
                                );
                            }
                            return (
                                <polyline key={`road-${idx}`}
                                    points={pts.map(p => `${p.x},${p.y}`).join(' ')}
                                    fill="none" stroke="#1e293b" strokeWidth={2} strokeLinecap="round"
                                />
                            );
                        })}
                        {plotSvgItems.map((cell, idx) => {
                            const st = (cell.status || '').toUpperCase().replace(/[\s-]+/g, '_');
                            const blocked = ['CONFIRMED','UNREGISTERED','REGISTERED','SOLD','RENTED','TOKEN_PAID','ADVANCE_PAID','CLOSED','BOOKED'].includes(st);
                            const isPending = pendingCell === cell;
                            const color = STATUS_SVG_COLORS[cell.status] || STATUS_SVG_COLORS[st] || '#22c55e';
                            const pts = cell.points || [];
                            const bbox = getSvgBBox(pts);
                            return (
                                <g key={`plot-${idx}`}>
                                    <polygon
                                        points={pts.map(p => `${p.x},${p.y}`).join(' ')}
                                        fill={isPending ? '#3b82f6' : color}
                                        fillOpacity={blocked ? 0.9 : isPending ? 0.95 : 0.85}
                                        stroke={isPending ? '#1d4ed8' : color}
                                        strokeWidth={isPending ? 3 : 1.5}
                                        style={{ cursor: blocked ? 'not-allowed' : 'pointer' }}
                                        onPointerDown={e => e.stopPropagation()}
                                        onClick={() => handlePlotClick(cell)}
                                    />
                                    {bbox.w > 8 && (
                                        <text x={bbox.cx} y={bbox.cy} textAnchor="middle" dominantBaseline="middle"
                                            fontSize={Math.max(4, bbox.w * 0.25)} fontWeight="bold"
                                            fill="#ffffff"
                                            style={{ pointerEvents: 'none', userSelect: 'none' }}
                                        >
                                            {cell.display_name}
                                        </text>
                                    )}
                                </g>
                            );
                        })}
                        {textSvgItems.map((shape, idx) => (
                            <text key={`text-${idx}`}
                                x={(shape.points || [])[0]?.x || 0}
                                y={(shape.points || [])[0]?.y || 0}
                                fontSize={shape.font_size || 14} fontWeight="bold" fill="#1e293b"
                                style={{ pointerEvents: 'none', userSelect: 'none' }}
                            >
                                {shape.display_name || shape.label || shape.name || ''}
                            </text>
                        ))}
                    </svg>
                </div>
                <div className="unit-legend">
                    <div className="legend-item"><div className="legend-dot legend-available"></div> Available</div>
                    <div className="legend-item"><div className="legend-dot legend-on-booking"></div> On Booking</div>
                    <div className="legend-item"><div className="legend-dot legend-booked"></div> Confirmed/Sold</div>
                </div>
            </div>
        );
    }

    return (
        <div className="unit-selector-container">
            <h2 className="unit-selector-title">{titleLabel}</h2>
            <p className="unit-selector-subtitle">Please click on an available {unitLabel} to continue</p>

            <div className="unit-grid-scroll">
                <div
                    className="unit-grid-wrapper"
                    style={{
                        gridTemplateColumns: `repeat(${dims.cols}, var(--unit-cell))`,
                        gridAutoRows: 'var(--unit-cell)',
                    }}
                >
                    {rowsArray.map((_, r) => (
                        colsArray.map((_, c) => {
                            const key = `${r}-${c}`;
                            const cell = gridData[key];
                            if (cell?.merged) return null;

                            let cellClass = "unit-cell";
                            let cellStyle = {};

                            if (cell?.type === unitTypeName) {
                                const st = (cell.status || '').toUpperCase();
                                if (['CONFIRMED', 'UNREGISTERED', 'REGISTERED', 'SOLD', 'RENTED',
                                     'BOOKED', 'TOKEN_PAID', 'ADVANCE_PAID', 'CLOSED'].includes(st)) {
                                    cellClass += " unit-plot token-paid";
                                } else if (st === 'ON_BOOKING') {
                                    cellClass += " unit-plot on-booking";
                                } else {
                                    cellClass += " unit-plot available";
                                }
                                cellStyle = {
                                    fontSize: `${cell.font_size}px`,
                                    fontWeight: cell.font_weight,
                                    transform: `rotate(${cell.rotation}deg)`,
                                };
                            } else if (cell?.type === 'ROAD') {
                                cellClass += " unit-road";
                            } else if (cell?.type === 'TEXT') {
                                cellClass += " unit-text";
                                cellStyle = {
                                    color: cell.color,
                                    fontSize: `${cell.font_size}px`,
                                    fontWeight: cell.font_weight,
                                    transform: `rotate(${cell.rotation}deg)`,
                                };
                            } else {
                                cellClass += " unit-empty";
                            }

                            const handleClick = () => {
                                const st = (cell?.status || '').toUpperCase();
                                const blocked = ['CONFIRMED', 'UNREGISTERED', 'REGISTERED', 'SOLD', 'RENTED',
                                                 'TOKEN_PAID', 'ADVANCE_PAID', 'CLOSED'].includes(st);
                                if (cell?.type === unitTypeName && !blocked) {
                                    if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
                                    setPendingCell(cell);
                                    pendingTimerRef.current = setTimeout(() => {
                                        onSelectUnit(cell);
                                        setPendingCell(null);
                                        pendingTimerRef.current = null;
                                    }, 1000);
                                }
                            };

                            return (
                                <div
                                    key={key}
                                    className={cellClass}
                                    style={{
                                        gridColumnStart: c + 1,
                                        gridColumnEnd: `span ${cell?.colSpan || 1}`,
                                        gridRowStart: r + 1,
                                        gridRowEnd: `span ${cell?.rowSpan || 1}`,
                                    }}
                                    onClick={handleClick}
                                >
                                    {cell?.display_name && (
                                        <span style={cellStyle} className="unit-label">{cell.display_name}</span>
                                    )}
                                </div>
                            );
                        })
                    ))}
                </div>
            </div>

            <div className="unit-legend">
                <div className="legend-item"><div className="legend-dot legend-available"></div> Available</div>
                <div className="legend-item"><div className="legend-dot legend-on-booking"></div> On Booking</div>
                <div className="legend-item"><div className="legend-dot legend-booked"></div> Booked</div>
            </div>
        </div>
    );
};

export default UnitSelector;
