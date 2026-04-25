'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { endpoints } from '../api/api';
import '../styles/UnitSelector.css';

const layoutCache = new Map();

const UnitSelector = ({ propertyId, onSelectUnit, saleType, onNoPlots, refreshKey = 0 }) => {
    const [dims, setDims] = useState({ rows: 40, cols: 60 });
    const [gridData, setGridData] = useState({});
    const [loading, setLoading] = useState(true);
    const [hasPlots, setHasPlots] = useState(true);
    const [loadError, setLoadError] = useState('');

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
                console.error("Layout fetch failed", err);
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
                                switch (cell.status) {
                                    case 'BOOKED':
                                    case 'ON_BOOKING':
                                        cellClass += " unit-plot on-booking";
                                        break;
                                    case 'TOKEN_PAID':
                                    case 'ADVANCE_PAID':
                                    case 'CLOSED':
                                        cellClass += " unit-plot token-paid";
                                        break;
                                    case 'NIL_BOOKING':
                                    default:
                                        cellClass += " unit-plot available";
                                        break;
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
                                if (cell?.type === unitTypeName && !['TOKEN_PAID', 'ADVANCE_PAID', 'CLOSED'].includes(cell.status)) {
                                    onSelectUnit(cell);
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
