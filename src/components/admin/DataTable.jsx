'use client';

import React, { useState, useMemo } from 'react';

const DataTable = ({
  columns, data, onEdit, onView, actions, emptyMessage,
  itemsPerPage = 10, showPagination = true, onRowClick,
  columnFilters = {}, onColumnFilterChange,
  selectable = false, selectedIds = new Set(), onSelectionChange,
  expandedRowId = null, renderExpandedRow = null,
  editingRowId = null, editDraft = {}, onEditDraftChange = null,
  onCellDoubleClick = null, cellSaving = false,
}) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPageState, setItemsPerPageState] = useState(itemsPerPage);

  const safeData = Array.isArray(data) ? data : [];
  const hasActions = Boolean(onView || onEdit || actions);
  const hasColumnFilters = columns.some(c => c.filterable);
  const totalPages = Math.ceil(safeData.length / itemsPerPageState);
  const startIndex = (currentPage - 1) * itemsPerPageState;

  const sortedData = useMemo(() => {
    if (!sortConfig.key) return safeData;
    return [...safeData].sort((a, b) => {
      const col = columns.find(c => c.accessor === sortConfig.key);
      let aVal, bVal;
      if (col && typeof col.accessor === 'function') {
        aVal = col.sortBy ? col.sortBy(a) : String(col.accessor(a) ?? '');
        bVal = col.sortBy ? col.sortBy(b) : String(col.accessor(b) ?? '');
      } else {
        aVal = a?.[sortConfig.key] ?? '';
        bVal = b?.[sortConfig.key] ?? '';
      }
      if (typeof aVal === 'string' && typeof bVal === 'string')
        return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      return sortConfig.direction === 'asc' ? (aVal < bVal ? -1 : 1) : (aVal > bVal ? -1 : 1);
    });
  }, [safeData, sortConfig, columns]);

  const paginatedData = sortedData.slice(startIndex, startIndex + itemsPerPageState);

  const getRowId = (item, fallbackIdx) =>
    item.plot_unit_id ?? item.property_id ?? item.enquiry_id ?? item.seller_id ?? item.buyer_id ?? item.booking_id ?? fallbackIdx;

  const pageRowIds = paginatedData.map((item, i) => getRowId(item, startIndex + i));
  const selectedOnPage = pageRowIds.filter(id => selectedIds.has(id));
  const allPageSelected = pageRowIds.length > 0 && selectedOnPage.length === pageRowIds.length;
  const somePageSelected = selectedOnPage.length > 0 && !allPageSelected;

  const handleSelectAll = () => {
    if (!onSelectionChange) return;
    const next = new Set(selectedIds);
    if (allPageSelected) pageRowIds.forEach(id => next.delete(id));
    else pageRowIds.forEach(id => next.add(id));
    onSelectionChange(next);
  };

  const handleSelectRow = (id) => {
    if (!onSelectionChange) return;
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    onSelectionChange(next);
  };

  const handleSort = (col) => {
    if (col.sortable === false || (typeof col.accessor === 'function' && col.sortable !== true)) return;
    setSortConfig(prev => ({ key: col.accessor, direction: prev.key === col.accessor && prev.direction === 'asc' ? 'desc' : 'asc' }));
    setCurrentPage(1);
  };

  const goToPage = (p) => { if (p >= 1 && p <= totalPages) setCurrentPage(p); };

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 5) { for (let i = 1; i <= totalPages; i++) pages.push(i); }
    else if (currentPage <= 3) { for (let i = 1; i <= 4; i++) pages.push(i); pages.push('...'); pages.push(totalPages); }
    else if (currentPage >= totalPages - 2) { pages.push(1); pages.push('...'); for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i); }
    else { pages.push(1); pages.push('...'); for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i); pages.push('...'); pages.push(totalPages); }
    return pages;
  };

  const totalColSpan = columns.length + (hasActions ? 1 : 0) + (selectable ? 1 : 0);

  const inputCls = 'min-w-[80px] max-w-[180px] w-full px-1.5 py-0.5 text-xs border border-amber-400 rounded-md bg-white outline-none focus:ring-2 focus:ring-amber-400';

  const renderEditCell = (col, field) => {
    const val = editDraft?.[field] ?? '';
    if (col.editType === 'select') {
      return (
        <select
          value={val}
          onChange={e => onEditDraftChange?.(field, e.target.value)}
          className={inputCls}
          onClick={e => e.stopPropagation()}
        >
          {(col.editOptions || []).map(o => {
            const v = typeof o === 'object' ? o.value : o;
            const l = typeof o === 'object' ? o.label : (o || '— None —');
            return <option key={v} value={v}>{l}</option>;
          })}
        </select>
      );
    }
    if (col.editType === 'textarea') {
      return (
        <textarea
          value={val}
          onChange={e => onEditDraftChange?.(field, e.target.value)}
          rows={2}
          className={`${inputCls} resize-none`}
          onClick={e => e.stopPropagation()}
        />
      );
    }
    return (
      <input
        type={col.editType || 'text'}
        value={val}
        onChange={e => onEditDraftChange?.(field, e.target.value)}
        className={inputCls}
        onClick={e => e.stopPropagation()}
      />
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="text-left border-collapse" style={{ minWidth: '100%', width: 'max-content' }}>
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-200">
              {selectable && (
                <th className="px-4 py-3.5 w-10 cursor-default">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={handleSelectAll}
                    className="w-4 h-4 accent-emerald-600 cursor-pointer"
                    ref={el => { if (el) el.indeterminate = somePageSelected; }}
                  />
                </th>
              )}
              {columns.map((col, idx) => {
                const isSortable = col.sortable !== false && (typeof col.accessor !== 'function' || col.sortable === true);
                return (
                  <th key={idx} onClick={() => handleSort(col)}
                    className={`px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap ${isSortable ? 'cursor-pointer hover:bg-gray-100' : 'cursor-default'} ${col.className || ''}`}>
                    <div className="flex items-center space-x-1">
                      <span>{col.header}</span>
                      {col.editable && <span className="text-amber-400" title="Double-click cell to edit">✎</span>}
                      {isSortable && <svg className={`w-3 h-3 transition-transform ${sortConfig.key === col.accessor && sortConfig.direction === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>}
                    </div>
                  </th>
                );
              })}
              {hasActions && (
                <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-widest text-center cursor-default sticky right-0 bg-gray-50/80 border-l border-gray-200 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.06)] whitespace-nowrap z-10">
                  Actions
                </th>
              )}
            </tr>
            {hasColumnFilters && (
              <tr className="bg-white border-b border-gray-200">
                {selectable && <th className="px-4 py-2 w-10" />}
                {columns.map((col, idx) => (
                  <th key={idx} className="px-3 py-2">
                    {col.filterable ? (
                      <input
                        type="text"
                        value={columnFilters[col.filterKey || col.accessor] || ''}
                        onChange={e => { onColumnFilterChange?.(col.filterKey || col.accessor, e.target.value); setCurrentPage(1); }}
                        placeholder="Search..."
                        className="w-full min-w-[90px] px-2 py-1 text-[11px] border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-400 bg-gray-50 font-medium"
                        onClick={e => e.stopPropagation()}
                      />
                    ) : null}
                  </th>
                ))}
                {hasActions && <th className="sticky right-0 bg-white border-l border-gray-200 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.06)]" />}
              </tr>
            )}
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginatedData.length > 0 ? paginatedData.map((item, index) => {
              const rowId = getRowId(item, startIndex + index);
              const isSelected = selectedIds.has(rowId);
              const isExpanded = renderExpandedRow && expandedRowId === rowId;
              const isRowEditing = editingRowId != null && rowId === editingRowId;
              return (
                <React.Fragment key={rowId}>
                  <tr
                    className={`transition-colors ${onRowClick && !isRowEditing ? 'cursor-pointer' : ''} ${isSelected ? 'bg-emerald-50/30' : 'hover:bg-blue-50/20'} ${isExpanded ? 'bg-amber-50/40' : ''} ${isRowEditing ? '!bg-amber-50 ring-1 ring-inset ring-amber-300' : ''}`}
                    onClick={onRowClick && !isRowEditing ? () => onRowClick(item) : undefined}
                  >
                    {selectable && (
                      <td className="px-4 py-3.5 w-10" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(rowId)}
                          className="w-4 h-4 accent-emerald-600 cursor-pointer"
                        />
                      </td>
                    )}
                    {columns.map((col, ci) => {
                      const editField = col.editField || (typeof col.accessor === 'string' ? col.accessor : null);
                      const showEditInput = isRowEditing && col.editable && editField;
                      const canStartEdit = !editingRowId && col.editable && onCellDoubleClick;
                      return (
                        <td
                          key={ci}
                          className={`px-5 py-3.5 text-sm text-gray-700 whitespace-nowrap ${col.className || ''} ${canStartEdit ? 'cursor-text' : ''}`}
                          onDoubleClick={canStartEdit ? (e) => { e.stopPropagation(); onCellDoubleClick(item); } : undefined}
                          title={canStartEdit ? 'Double-click to edit row' : undefined}
                        >
                          {showEditInput
                            ? renderEditCell(col, editField)
                            : (typeof col.accessor === 'function' ? col.accessor(item) : item?.[col.accessor] ?? '-')}
                        </td>
                      );
                    })}
                    {hasActions && (
                      <td
                        className="px-5 py-3.5 text-sm text-center whitespace-nowrap sticky right-0 bg-white border-l border-gray-200 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.06)] z-10"
                        onClick={e => e.stopPropagation()}
                      >
                        <div className="flex justify-center items-center space-x-1.5">
                          {onView && !isRowEditing && (
                            <button onClick={() => onView(item)} className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-100" title="View">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            </button>
                          )}
                          {onEdit && !isRowEditing && (
                            <button onClick={() => onEdit(item)} className="p-1.5 text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-100" title="Edit">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                          )}
                          {actions && actions(item, isRowEditing)}
                        </div>
                      </td>
                    )}
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={totalColSpan} className="p-0 border-b-2 border-amber-200">
                        {renderExpandedRow(item)}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            }) : (
              <tr>
                <td colSpan={totalColSpan} className="px-6 py-12 text-center text-gray-400 font-bold uppercase tracking-widest">
                  {emptyMessage || 'No matching records'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {showPagination && safeData.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-3">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Show</span>
            <select value={itemsPerPageState} onChange={e => { setItemsPerPageState(Number(e.target.value)); setCurrentPage(1); }} className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-bold bg-white focus:outline-none">
              {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">entries</span>
          </div>
          <div className="text-xs font-bold text-gray-700 uppercase tracking-widest">
            Showing {startIndex + 1}–{Math.min(startIndex + itemsPerPageState, safeData.length)} of {safeData.length}
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={() => goToPage(1)} disabled={currentPage === 1} className={`p-1.5 rounded-lg border ${currentPage === 1 ? 'border-gray-200 text-gray-300 cursor-not-allowed' : 'border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
            </button>
            <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} className={`p-1.5 rounded-lg border ${currentPage === 1 ? 'border-gray-200 text-gray-300 cursor-not-allowed' : 'border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div className="flex space-x-1">
              {getPageNumbers().map((n, i) => n === '...' ? <span key={`e${i}`} className="px-2 py-1 text-xs text-gray-400">...</span> : (
                <button key={n} onClick={() => goToPage(n)} className={`w-8 h-8 flex items-center justify-center rounded-lg border text-xs font-bold ${currentPage === n ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:bg-gray-100'}`}>{n}</button>
              ))}
            </div>
            <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} className={`p-1.5 rounded-lg border ${currentPage === totalPages ? 'border-gray-200 text-gray-300 cursor-not-allowed' : 'border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
            </button>
            <button onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages} className={`p-1.5 rounded-lg border ${currentPage === totalPages ? 'border-gray-200 text-gray-300 cursor-not-allowed' : 'border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
