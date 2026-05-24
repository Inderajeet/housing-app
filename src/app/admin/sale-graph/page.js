'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import {
  ScatterChart, Scatter, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList,
} from 'recharts';
import { GoogleMap, useJsApiLoader, Marker, Circle } from '@react-google-maps/api';
import { adminApi } from '@/lib/adminApi';

// ─── Constants ───────────────────────────────────────────────────────────────

const BOOKING_STATUSES = [
  { value: '',           label: 'All',         color: '#6b7280' },
  { value: 'sold',       label: 'Sold',        color: '#ef4444' },
  { value: 'confirmed',  label: 'Confirmed',   color: '#f59e0b' },
  { value: 'on_booking', label: 'On Booking',  color: '#3b82f6' },
  { value: 'nil_booking',label: 'Nil Booking', color: '#22c55e' },
];

const RANGE_OPTIONS = [1, 2, 3, 4, 5];

const MARKER_COLORS = {
  sold:        '#ef4444',
  confirmed:   '#f59e0b',
  on_booking:  '#3b82f6',
  nil_booking: '#22c55e',
  center:      '#7c3aed',
};

const CIRCLE_STROKE = '#7c3aed';
const CIRCLE_FILL   = 'rgba(124, 58, 237, 0.05)';

const mapContainerStyle = { width: '100%', height: '480px', borderRadius: '16px' };

const GRAPH_TABS = [
  { key: 'map',        label: 'Map Graph' },
  { key: 'price',      label: 'Price Curve' },
  { key: 'area-speed', label: 'Area Sales Speed' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatPhone = (p) => p ? String(p).replace(/(\d{5})(\d{5})/, '$1 $2') : '';

function downloadChartAsImage(ref, filename) {
  const svgEl = ref.current?.querySelector('svg');
  if (!svgEl) { alert('Chart not ready'); return; }
  const serializer = new XMLSerializer();
  const svgStr = serializer.serializeToString(svgEl);
  const { width, height } = svgEl.getBoundingClientRect();
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(width, 800);
  canvas.height = Math.max(height, 400);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const img = new Image();
  img.onload = () => {
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const a = document.createElement('a');
    a.download = filename;
    a.href = canvas.toDataURL('image/png');
    a.click();
  };
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgStr)}`;
}

async function downloadMapSnapshot(mapContainerRef, filename) {
  const el = mapContainerRef.current;
  if (!el) { alert('Map not ready'); return; }
  try {
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(el, { useCORS: true, allowTaint: true, scale: 2 });
    const a = document.createElement('a');
    a.download = filename;
    a.href = canvas.toDataURL('image/png');
    a.click();
  } catch {
    alert('Snapshot failed. Try a different browser.');
  }
}

function shareViaWhatsApp(text) {
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
}

function normalizeStatus(raw) {
  const s = String(raw || '').toLowerCase().replace(/[\s_-]/g, '');
  if (s === 'sold' || s === 'registered' || s === 'unregistered') return 'sold';
  if (s === 'confirmed' || s === 'onbooking' || s === 'booked') return 'on_booking';
  if (s === 'nilbooking' || s === 'nil' || s === 'available' || s === '') return 'nil_booking';
  return 'nil_booking';
}

function createMarkerSvg(color) {
  return {
    url: `data:image/svg+xml,%3Csvg width='24' height='36' viewBox='0 0 28 42' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M14 0C6.82 0 1 5.82 1 13c0 9.75 13 29 13 29s13-19.25 13-29C27 5.82 21.18 0 14 0z' fill='${encodeURIComponent(color)}'/%3E%3Ccircle cx='14' cy='13' r='6' fill='%23ffffff'/%3E%3C/svg%3E`,
    scaledSize: { width: 24, height: 36 },
    anchor: { x: 12, y: 36 },
  };
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function PropertyCard({ property, onClose }) {
  if (!property) return null;
  const img = property.primary_image;
  const location = [property.village_name, property.taluk_name, property.district_name].filter(Boolean).join(', ');
  const landmark = property.street_name_or_road_name || property.layout_name || '';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden" onClick={e => e.stopPropagation()}>
        {img && <img src={img} alt={property.formatted_id} className="w-full h-44 object-cover" />}
        <div className="p-5">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{property.formatted_id}</span>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
          </div>
          {property.title && <p className="font-bold text-sm text-gray-800 mb-1">{property.title}</p>}
          {landmark && <p className="text-xs text-gray-500 mb-1">{landmark}</p>}
          {location && <p className="text-xs text-gray-400 mb-3">{location}</p>}
          <div className="grid grid-cols-2 gap-3 text-xs">
            {property.price && (
              <div><p className="text-gray-400 uppercase tracking-wide text-[10px]">Rate</p>
                <p className="font-bold text-gray-800">₹{Number(property.price).toLocaleString()}/{property.rate_unit || 'unit'}</p></div>
            )}
            {property.sale_type && (
              <div><p className="text-gray-400 uppercase tracking-wide text-[10px]">Type</p>
                <p className="font-bold text-gray-800 capitalize">{property.sale_type}</p></div>
            )}
            {property.sale_status && (
              <div><p className="text-gray-400 uppercase tracking-wide text-[10px]">Status</p>
                <p className="font-bold text-gray-800">{property.sale_status}</p></div>
            )}
            {property.sold_date && (
              <div><p className="text-gray-400 uppercase tracking-wide text-[10px]">Sold Date</p>
                <p className="font-bold text-gray-800">{String(property.sold_date).slice(0, 10)}</p></div>
            )}
            {property.latitude && (
              <div><p className="text-gray-400 uppercase tracking-wide text-[10px]">Lat / Lng</p>
                <p className="font-bold text-gray-800">{Number(property.latitude).toFixed(4)}, {Number(property.longitude).toFixed(4)}</p></div>
            )}
            {property.contact_phone && (
              <div><p className="text-gray-400 uppercase tracking-wide text-[10px]">Contact</p>
                <p className="font-bold text-gray-800">{formatPhone(property.contact_phone)}</p></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PriceDot({ cx, cy, payload, onClick }) {
  return (
    <circle cx={cx} cy={cy} r={6} fill="#166534" stroke="#fff" strokeWidth={2}
      style={{ cursor: 'pointer' }} onClick={() => onClick && onClick(payload)} />
  );
}

const CustomBarTooltip = ({ active, payload, onCardOpen }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs min-w-[140px]">
      <p className="font-bold text-gray-700 mb-1">{d.monthLabel}</p>
      <p className="text-emerald-700 font-bold">{d.count} sale{d.count !== 1 ? 's' : ''}</p>
      {d.properties?.length > 0 && (
        <button onClick={() => onCardOpen(d.properties[0])} className="mt-2 text-blue-600 underline text-[10px]">View property</button>
      )}
    </div>
  );
};

const CustomScatterTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs min-w-[160px]">
      <p className="font-bold text-gray-700 mb-1">{d.formatted_id}</p>
      <p className="text-emerald-700 font-bold">{d.rate_lakhs_per_cent?.toFixed(2)} L/cent</p>
      <p className="text-gray-500">{d.monthLabel}</p>
      {d.sale_type && <p className="text-gray-400 capitalize">{d.sale_type}</p>}
    </div>
  );
};

// ─── Property Search Box ──────────────────────────────────────────────────────

function PropertySearchBox({ onSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [allProperties, setAllProperties] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    adminApi.get('/sale').then(r => {
      setAllProperties(r.data || []);
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q || q.length < 1) { setResults([]); return; }
    const filtered = allProperties
      .filter(p => (p.formatted_id || '').toLowerCase().includes(q))
      .slice(0, 10);
    setResults(filtered);
  }, [query, allProperties]);

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setResults([]);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (p) => {
    onSelect(p);
    setQuery(p.formatted_id || '');
    setResults([]);
  };

  return (
    <div className="flex flex-col gap-1 w-52 relative" ref={wrapRef}>
      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Property ID</label>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder={loaded ? 'Search formatted ID…' : 'Loading…'}
        className="px-4 py-2.5 rounded-xl border border-gray-300 font-semibold text-sm w-full outline-none focus:ring-2 focus:ring-purple-400"
      />
      {results.length > 0 && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden max-h-56 overflow-y-auto">
          {results.map(p => (
            <button
              key={p.property_id}
              onClick={() => handleSelect(p)}
              className="w-full text-left px-4 py-2.5 hover:bg-purple-50 border-b border-gray-50 last:border-0"
            >
              <p className="text-xs font-bold text-purple-700">{p.formatted_id}</p>
              <p className="text-[10px] text-gray-400 truncate">
                {p.street_name_or_road_name || p.layout_name || p.address || ''}
                {p.sale_type ? ` · ${p.sale_type}` : ''}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Interactive Map Graph ────────────────────────────────────────────────────

function MapGraph({ centerLat, centerLng, activeStatus }) {
  const [range, setRange] = useState(1);
  const [mapProps, setMapProps] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedPin, setSelectedPin] = useState(null);
  const mapContainerRef = useRef(null);
  const [snapshotting, setSnapshotting] = useState(false);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API || '',
  });

  const fetchMapData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { lat: centerLat, lng: centerLng, range };
      if (activeStatus) params.status = activeStatus;
      const res = await adminApi.get('/sale-graph/map', { params });
      setMapProps(res.data);
    } catch (err) {
      alert('Map fetch failed: ' + (err?.response?.data?.error || err.message));
    } finally { setLoading(false); }
  }, [centerLat, centerLng, range, activeStatus]);

  useEffect(() => { fetchMapData(); }, [fetchMapData]);

  const circleRadii = range === 1
    ? [500, 1000]
    : Array.from({ length: range }, (_, i) => (i + 1) * 1000);

  const center = { lat: centerLat, lng: centerLng };
  const properties = mapProps?.properties || [];

  const handleDownloadSnapshot = async () => {
    setSnapshotting(true);
    await downloadMapSnapshot(mapContainerRef, 'map-graph.png');
    setSnapshotting(false);
  };

  const handleShareSnapshot = () => {
    const summary = properties.slice(0, 5)
      .map(p => `${p.formatted_id} (${p.sale_status || 'N/A'}) — ${Number(p.distance_km).toFixed(2)}km`)
      .join('\n');
    shareViaWhatsApp(`Map Graph — ${properties.length} properties within ${range}km\nLat:${centerLat.toFixed(4)}, Lng:${centerLng.toFixed(4)}\n\n${summary}`);
  };

  const btn = 'px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest';

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <p className="text-[11px] text-gray-400">Surrounding properties plotted by coordinates. Purple circles show distance rings.</p>
        <div className="flex gap-3 items-center flex-wrap">
          <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Range</label>
          <select value={range} onChange={e => setRange(Number(e.target.value))}
            className="px-3 py-2 rounded-xl border border-gray-300 text-xs font-bold bg-white outline-none focus:ring-2 focus:ring-purple-400">
            {RANGE_OPTIONS.map(r => <option key={r} value={r}>{r} km</option>)}
          </select>
          <button onClick={fetchMapData} disabled={loading}
            className={`${btn} bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-60`}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
          <button onClick={handleShareSnapshot}
            className={`${btn} bg-green-500 text-white hover:bg-green-600`}>
            Share
          </button>
          <button onClick={handleDownloadSnapshot} disabled={snapshotting}
            className={`${btn} bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-60`}>
            {snapshotting ? 'Saving…' : 'Download'}
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        {BOOKING_STATUSES.filter(s => s.value).map(s => (
          <div key={s.value} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full inline-block" style={{ background: s.color }} />
            <span className="text-[10px] font-bold uppercase text-gray-500">{s.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full inline-block" style={{ background: MARKER_COLORS.center }} />
          <span className="text-[10px] font-bold uppercase text-gray-500">Center</span>
        </div>
      </div>

      <div ref={mapContainerRef}>
        {isLoaded ? (
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={center}
            zoom={14}
            options={{
              streetViewControl: false, mapTypeControl: false, fullscreenControl: false,
              styles: [{ featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }],
            }}
          >
            {circleRadii.map(r => (
              <Circle key={r} center={center} radius={r}
                options={{ strokeColor: CIRCLE_STROKE, strokeOpacity: 0.7, strokeWeight: 1.5, fillColor: CIRCLE_FILL, fillOpacity: 1 }} />
            ))}
            <Marker position={center} icon={createMarkerSvg(MARKER_COLORS.center)} zIndex={10} />
            {properties.map((p, i) => {
              const lat = Number(p.latitude), lng = Number(p.longitude);
              if (isNaN(lat) || isNaN(lng)) return null;
              const statusKey = normalizeStatus(p.sale_status);
              return (
                <Marker key={p.property_id || i} position={{ lat, lng }}
                  icon={createMarkerSvg(MARKER_COLORS[statusKey] || MARKER_COLORS.nil_booking)}
                  onClick={() => setSelectedPin(p)} />
              );
            })}
          </GoogleMap>
        ) : (
          <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Loading map…</div>
        )}
      </div>

      <p className="text-[10px] text-gray-400 font-bold uppercase">
        {properties.length} properties within {range}km · circles at {circleRadii.map(r => r >= 1000 ? `${r / 1000}km` : `${r}m`).join(', ')}
        {activeStatus ? ` · filtered: ${BOOKING_STATUSES.find(s => s.value === activeStatus)?.label}` : ' · all statuses'}
      </p>

      {selectedPin && <PropertyCard property={selectedPin} onClose={() => setSelectedPin(null)} />}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SaleGraphPage() {
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [activeStatus, setActiveStatus] = useState('sold');
  const [activeTab, setActiveTab] = useState('map');
  const priceCurveRef = useRef(null);
  const areaSpeedRef = useRef(null);

  const fetchData = async () => {
    const latNum = parseFloat(lat), lngNum = parseFloat(lng);
    if (isNaN(latNum) || isNaN(lngNum)) { alert('Enter valid latitude and longitude.'); return; }
    setLoading(true);
    try {
      const res = await adminApi.get('/sale-graph', { params: { lat: latNum, lng: lngNum, status: activeStatus } });
      setData(res.data);
    } catch (err) {
      alert('Failed: ' + (err?.response?.data?.error || err.message));
    } finally { setLoading(false); }
  };

  const centerLat = parseFloat(lat);
  const centerLng = parseFloat(lng);
  const hasCoords = !isNaN(centerLat) && !isNaN(centerLng);

  const priceCurveData = (data?.priceCurvePoints || []).map((p, i) => ({ ...p, x: i + 1 }));
  const priceCurveByMonth = priceCurveData.map(p => ({ ...p, xMonth: p.monthLabel }));
  const areaSpeedData = data?.areaSpeedMonths || [];

  const handleDownloadPriceCurve = () => downloadChartAsImage(priceCurveRef, 'price-curve.png');
  const handleDownloadAreaSpeed = () => downloadChartAsImage(areaSpeedRef, 'area-sales-speed.png');

  const handleSharePriceCurve = () => {
    const pts = priceCurveData.slice(0, 5).map(p => `${p.formatted_id}: ${p.rate_lakhs_per_cent?.toFixed(2)}L/cent (${p.monthLabel})`).join('\n');
    shareViaWhatsApp(`Price Curve - Properties within 1km\nLat:${lat} Lng:${lng}\n\n${pts}`);
  };

  const handleShareAreaSpeed = () => {
    const total = areaSpeedData.reduce((s, m) => s + m.count, 0);
    const avg = (total / (areaSpeedData.length || 1)).toFixed(2);
    shareViaWhatsApp(`Area Sales Speed - 1km radius\nLat:${lat} Lng:${lng}\nTotal: ${total} | Avg: ${avg}/month`);
  };

  const inp = 'px-4 py-2.5 rounded-xl border border-gray-300 font-semibold text-sm w-full outline-none focus:ring-2 focus:ring-purple-400';
  const btn = 'px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest';

  const tabClass = (key) =>
    `py-3 px-4 text-[11px] font-bold uppercase tracking-widest border-b-2 transition-all whitespace-nowrap ${
      activeTab === key
        ? 'border-purple-600 text-purple-600'
        : 'border-transparent text-gray-400 hover:text-gray-600'
    }`;

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Sale Graph</h2>
        <p className="text-gray-500 text-xs uppercase tracking-widest font-bold">Map, Price Curve & Area Sales Speed within 1km</p>
      </div>

      {/* ── Input & Filters ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-5">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Enter Center Coordinates</p>
        <div className="flex gap-4 items-end flex-wrap">
          {/* Property ID search */}
          <PropertySearchBox
            onSelect={(p) => {
              if (p.latitude) setLat(String(p.latitude));
              if (p.longitude) setLng(String(p.longitude));
            }}
          />

          <div className="flex flex-col gap-1 w-52">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Latitude</label>
            <input value={lat} onChange={e => setLat(e.target.value)} placeholder="e.g. 11.0168" className={inp} />
          </div>
          <div className="flex flex-col gap-1 w-52">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Longitude</label>
            <input value={lng} onChange={e => setLng(e.target.value)} placeholder="e.g. 76.9558" className={inp} />
          </div>
          <button onClick={fetchData} disabled={loading}
            className={`${btn} bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-60`}>
            {loading ? 'Generating…' : 'Generate Charts'}
          </button>
        </div>

        {/* Booking Status Filter */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Filter by Booking Status</p>
          <div className="flex gap-2 flex-wrap">
            {BOOKING_STATUSES.map(s => (
              <button key={s.value} onClick={() => setActiveStatus(s.value)}
                className={`px-4 py-1.5 rounded-xl font-bold text-xs uppercase tracking-widest border transition-all ${activeStatus === s.value ? 'text-white border-transparent shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                style={activeStatus === s.value ? { background: s.color } : {}}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {data && (
          <p className="text-xs text-gray-400">
            Found <strong>{data.totalProperties}</strong> properties
            {activeStatus ? <> with status <strong>{BOOKING_STATUSES.find(s => s.value === activeStatus)?.label}</strong></> : ''}
            {' '}within 1km — from Jan last year to current month.
          </p>
        )}
      </div>

      {/* ── Graph Tabs ───────────────────────────────────────────────────── */}
      {hasCoords && (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Tab Bar */}
          <div className="flex border-b border-gray-100 overflow-x-auto">
            {GRAPH_TABS.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)} className={tabClass(t.key)}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* ── Map Graph Tab ── */}
            {activeTab === 'map' && (
              <MapGraph
                centerLat={centerLat}
                centerLng={centerLng}
                activeStatus={activeStatus}
              />
            )}

            {/* ── Price Curve Tab ── */}
            {activeTab === 'price' && (
              <div>
                <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
                  <div>
                    <h3 className="text-base font-bold text-gray-800">Price Curve (Rate / Cent)</h3>
                    <p className="text-[11px] text-gray-400">Each dot = one property. Y-axis in Lakhs/Cent.</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSharePriceCurve} className={`${btn} bg-green-500 text-white hover:bg-green-600`}>Share WhatsApp</button>
                    <button onClick={handleDownloadPriceCurve} className={`${btn} bg-gray-100 text-gray-700 hover:bg-gray-200`}>Download</button>
                  </div>
                </div>
                {!data ? (
                  <div className="text-center text-gray-400 py-16 text-sm">Click "Generate Charts" to load data.</div>
                ) : priceCurveData.length === 0 ? (
                  <div className="text-center text-gray-400 py-16 text-sm">No price data found for selected status. Ensure properties have rate_unit set (sqft or cent).</div>
                ) : (
                  <div ref={priceCurveRef} className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="monthLabel" type="category" allowDuplicatedCategory={false}
                          tick={{ fontSize: 11, fill: '#6b7280' }}
                          label={{ value: 'Month', position: 'insideBottom', offset: -10, fontSize: 11, fill: '#9ca3af' }} />
                        <YAxis dataKey="rate_lakhs_per_cent" name="Rate"
                          tick={{ fontSize: 11, fill: '#6b7280' }}
                          label={{ value: 'Lakhs/Cent', angle: -90, position: 'insideLeft', offset: 10, fontSize: 11, fill: '#9ca3af' }} />
                        <Tooltip content={<CustomScatterTooltip />} />
                        <Scatter data={priceCurveByMonth} fill="#166534"
                          shape={<PriceDot onClick={setSelectedCard} />}>
                          <LabelList dataKey="formatted_id" position="top" style={{ fontSize: 9, fill: '#374151' }} />
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}

            {/* ── Area Sales Speed Tab ── */}
            {activeTab === 'area-speed' && (
              <div>
                <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
                  <div>
                    <h3 className="text-base font-bold text-gray-800">Area Sales Speed</h3>
                    <p className="text-[11px] text-gray-400">Properties per month within 1km radius — from Jan last year to current month.</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleShareAreaSpeed} className={`${btn} bg-green-500 text-white hover:bg-green-600`}>Share WhatsApp</button>
                    <button onClick={handleDownloadAreaSpeed} className={`${btn} bg-gray-100 text-gray-700 hover:bg-gray-200`}>Download</button>
                  </div>
                </div>
                {!data ? (
                  <div className="text-center text-gray-400 py-16 text-sm">Click "Generate Charts" to load data.</div>
                ) : (
                  <div ref={areaSpeedRef} className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={areaSpeedData} margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="monthLabel" tick={{ fontSize: 10, fill: '#6b7280' }} interval={1}
                          label={{ value: 'Month', position: 'insideBottom', offset: -10, fontSize: 11, fill: '#9ca3af' }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6b7280' }}
                          label={{ value: 'No. of Properties', angle: -90, position: 'insideLeft', offset: 15, fontSize: 11, fill: '#9ca3af' }} />
                        <Tooltip content={<CustomBarTooltip onCardOpen={setSelectedCard} />} />
                        <Bar dataKey="count" fill="#166534" radius={[4, 4, 0, 0]} maxBarSize={50}>
                          <LabelList dataKey="count" position="top" style={{ fontSize: 10, fill: '#374151' }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {selectedCard && <PropertyCard property={selectedCard} onClose={() => setSelectedCard(null)} />}
    </div>
  );
}
