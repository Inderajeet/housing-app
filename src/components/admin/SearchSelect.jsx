'use client';

import React, { useEffect, useRef, useState } from 'react';

const SearchSelect = ({ label, value, onChange, fetchOptions, getOptionLabel, getOptionValue, placeholder = 'Select', disabled = false }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [options, setOptions] = useState([]);
  const [selected, setSelected] = useState(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const data = await fetchOptions(search);
      setOptions(Array.isArray(data) ? data : []);
    })();
  }, [search, open, fetchOptions]);

  useEffect(() => {
    if (value && options.length) {
      const found = options.find(o => getOptionValue(o) === value);
      if (found) setSelected(found);
    }
  }, [value, options, getOptionValue]);

  return (
    <div ref={wrapperRef} className="relative space-y-2">
      {label && <label className="text-[10px] font-bold uppercase tracking-widest text-gray-700">{label}</label>}
      <button type="button" disabled={disabled} onClick={() => setOpen(o => !o)} className={`w-full text-left px-4 py-2 rounded-xl border border-gray-400 bg-white font-semibold focus:ring-2 focus:ring-emerald-500 ${disabled ? 'bg-gray-200 cursor-not-allowed' : ''}`}>
        {selected ? getOptionLabel(selected) : <span className="text-gray-400">{placeholder}</span>}
      </button>
      {open && !disabled && (
        <div className="absolute z-50 mt-2 w-full bg-white border border-gray-300 rounded-xl shadow-xl overflow-hidden">
          <div className="p-3 border-b">
            <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="w-full px-3 py-2 rounded-lg border border-gray-300 font-semibold focus:ring-2 focus:ring-emerald-500 outline-none" />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {options.length === 0 ? <div className="px-4 py-3 text-sm text-gray-400">No results found</div> : options.map(opt => (
              <div key={getOptionValue(opt)} onClick={() => { setSelected(opt); onChange(getOptionValue(opt), opt); setOpen(false); setSearch(''); }} className="px-4 py-3 cursor-pointer hover:bg-emerald-50 border-b last:border-b-0">
                {getOptionLabel(opt)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchSelect;
