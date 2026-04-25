'use client';

import React, { useEffect, useState } from 'react';
import { getAllDistricts, getTaluksByDistrict, getVillagesByTaluk } from '../../lib/adminApi.js';

const LocationSelector = ({ district_id, taluk_id, village_id, onChange, disabled = false, vertical = false }) => {
  const [districts, setDistricts] = useState([]);
  const [taluks, setTaluks] = useState([]);
  const [villages, setVillages] = useState([]);

  useEffect(() => {
    getAllDistricts().then(res => setDistricts(res.data || [])).catch(() => setDistricts([]));
  }, []);

  useEffect(() => {
    if (!district_id) { setTaluks([]); setVillages([]); return; }
    getTaluksByDistrict(district_id).then(res => setTaluks(res.data || [])).catch(() => setTaluks([]));
  }, [district_id]);

  useEffect(() => {
    if (!taluk_id) { setVillages([]); return; }
    getVillagesByTaluk(taluk_id).then(res => setVillages(res.data || [])).catch(() => setVillages([]));
  }, [taluk_id]);

  const wrapperClass = vertical ? 'flex flex-col space-y-4' : 'grid grid-cols-3 gap-4';

  return (
    <div className={wrapperClass}>
      <select disabled={disabled} value={district_id || ''} onChange={e => onChange({ district_id: e.target.value, taluk_id: '', village_id: '' })} className="input disabled:bg-gray-100">
        <option value="">Select District</option>
        {districts.map(d => <option key={d.district_id} value={d.district_id}>{d.district_name}</option>)}
      </select>
      <select disabled={!district_id || disabled} value={taluk_id || ''} onChange={e => onChange({ taluk_id: e.target.value, village_id: '' })} className="input disabled:bg-gray-100">
        <option value="">Select Taluk</option>
        {taluks.map(t => <option key={t.taluk_id} value={t.taluk_id}>{t.taluk_name}</option>)}
      </select>
      <select disabled={!taluk_id || disabled} value={village_id || ''} onChange={e => onChange({ village_id: e.target.value })} className="input disabled:bg-gray-100">
        <option value="">Select Village</option>
        {villages.map(v => <option key={v.village_id} value={v.village_id}>{v.village_name}</option>)}
      </select>
    </div>
  );
};

export default LocationSelector;
