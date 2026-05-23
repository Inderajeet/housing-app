'use client';
import { useState, useRef, useCallback } from 'react';
import {
  ComposedChart, ScatterChart, Scatter, Bar, BarChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, LabelList,
} from 'recharts';
import { adminApi } from '@/lib/adminApi';

const formatPhone = (p) => p ? String(p).replace(/(\d{5})(\d{5})/, '$1 $2') : '';

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
            {property.extension && (
              <div><p className="text-gray-400 uppercase tracking-wide text-[10px]">Extent</p>
                <p className="font-bold text-gray-800">{property.extension} {property.area_size || ''}</p></div>
            )}
            {property.sale_status && (
              <div><p className="text-gray-400 uppercase tracking-wide text-[10px]">Status</p>
                <p className="font-bold text-gray-800">{property.sale_status}</p></div>
            )}
            {property.sold_date && (
              <div><p className="text-gray-400 uppercase tracking-wide text-[10px]">Sold Date</p>
                <p className="font-bold text-gray-800">{String(property.sold_date).slice(0, 10)}</p></div>
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

// Custom dot for price curve scatter
function PriceDot(props) {
  const { cx, cy, payload, onClick } = props;
  return (
    <circle
      cx={cx} cy={cy} r={6}
      fill="#166534" stroke="#fff" strokeWidth={2}
      style={{ cursor: 'pointer' }}
      onClick={() => onClick && onClick(payload)}
    />
  );
}

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

function shareViaWhatsApp(text) {
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
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

export default function SaleGraphPage() {
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const priceCurveRef = useRef(null);
  const areaSpeedRef = useRef(null);

  const fetchData = async () => {
    const latNum = parseFloat(lat), lngNum = parseFloat(lng);
    if (isNaN(latNum) || isNaN(lngNum)) { alert('Enter valid latitude and longitude.'); return; }
    setLoading(true);
    try {
      const res = await adminApi.get('/sale-graph', { params: { lat: latNum, lng: lngNum } });
      setData(res.data);
    } catch (err) {
      alert('Failed: ' + (err?.response?.data?.error || err.message));
    } finally { setLoading(false); }
  };

  // Build price curve chart data — one point per property with index for X
  const priceCurveData = data?.priceCurvePoints?.map((p, i) => ({
    ...p,
    x: i + 1, // sequential index as X placeholder; grouped by month below
  })) || [];

  // For X axis we use month labels — deduplicated in order
  const monthsInOrder = data ? data.areaSpeedMonths.map(m => m.monthLabel) : [];

  // Convert priceCurve to use monthLabel as X for the composed chart
  const priceCurveByMonth = priceCurveData.map(p => ({
    ...p,
    xMonth: p.monthLabel,
  }));

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
    shareViaWhatsApp(`Area Sales Speed - 1km radius\nLat:${lat} Lng:${lng}\nTotal sold: ${total} | Avg: ${avg}/month`);
  };

  const inp = 'px-4 py-2.5 rounded-xl border border-gray-300 font-semibold text-sm w-full outline-none focus:ring-2 focus:ring-purple-400';
  const btn = 'px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest';

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Sale Graph</h2>
        <p className="text-gray-500 text-xs uppercase tracking-widest font-bold">Price Curve & Area Sales Speed within 1km</p>
      </div>

      {/* Input */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Enter Center Coordinates</p>
        <div className="flex gap-4 items-end flex-wrap">
          <div className="flex flex-col gap-1 w-52">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Latitude</label>
            <input value={lat} onChange={e => setLat(e.target.value)} placeholder="e.g. 11.0168" className={inp} />
          </div>
          <div className="flex flex-col gap-1 w-52">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Longitude</label>
            <input value={lng} onChange={e => setLng(e.target.value)} placeholder="e.g. 76.9558" className={inp} />
          </div>
          <button onClick={fetchData} disabled={loading} className={`${btn} bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-60`}>
            {loading ? 'Generating…' : 'Generate Charts'}
          </button>
        </div>
        {data && (
          <p className="text-xs text-gray-400 mt-3">
            Found <strong>{data.totalProperties}</strong> sold properties with dates within 1km — covering past 2 years.
          </p>
        )}
      </div>

      {data && (
        <>
          {/* Price Curve */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
              <div>
                <h3 className="text-base font-bold text-gray-800">Price Curve (Rate / Cent)</h3>
                <p className="text-[11px] text-gray-400">Each dot = one sold property. Y-axis in Lakhs/Cent.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={handleSharePriceCurve} className={`${btn} bg-green-500 text-white hover:bg-green-600`}>
                  Share WhatsApp
                </button>
                <button onClick={handleDownloadPriceCurve} className={`${btn} bg-gray-100 text-gray-700 hover:bg-gray-200`}>
                  Download
                </button>
              </div>
            </div>

            {priceCurveData.length === 0 ? (
              <div className="text-center text-gray-400 py-16 text-sm">No price data found. Ensure properties have rate_unit set (sqft or cent).</div>
            ) : (
              <div ref={priceCurveRef} className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="monthLabel"
                      type="category"
                      allowDuplicatedCategory={false}
                      tick={{ fontSize: 11, fill: '#6b7280' }}
                      label={{ value: 'Month', position: 'insideBottom', offset: -10, fontSize: 11, fill: '#9ca3af' }}
                    />
                    <YAxis
                      dataKey="rate_lakhs_per_cent"
                      name="Rate"
                      tick={{ fontSize: 11, fill: '#6b7280' }}
                      label={{ value: 'Lakhs/Cent', angle: -90, position: 'insideLeft', offset: 10, fontSize: 11, fill: '#9ca3af' }}
                    />
                    <Tooltip content={<CustomScatterTooltip />} />
                    <Scatter
                      data={priceCurveByMonth}
                      fill="#166534"
                      shape={<PriceDot onClick={setSelectedCard} />}
                    >
                      <LabelList dataKey="formatted_id" position="top" style={{ fontSize: 9, fill: '#374151' }} />
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Area Sales Speed */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
              <div>
                <h3 className="text-base font-bold text-gray-800">Area Sales Speed</h3>
                <p className="text-[11px] text-gray-400">Number of plots/sales per month within 1km radius.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={handleShareAreaSpeed} className={`${btn} bg-green-500 text-white hover:bg-green-600`}>
                  Share WhatsApp
                </button>
                <button onClick={handleDownloadAreaSpeed} className={`${btn} bg-gray-100 text-gray-700 hover:bg-gray-200`}>
                  Download
                </button>
              </div>
            </div>

            <div ref={areaSpeedRef} className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={areaSpeedData} margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="monthLabel"
                    tick={{ fontSize: 10, fill: '#6b7280' }}
                    interval={1}
                    label={{ value: 'Month', position: 'insideBottom', offset: -10, fontSize: 11, fill: '#9ca3af' }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    label={{ value: 'No. of Plots/Sales', angle: -90, position: 'insideLeft', offset: 15, fontSize: 11, fill: '#9ca3af' }}
                  />
                  <Tooltip content={<CustomBarTooltip onCardOpen={setSelectedCard} />} />
                  <Bar dataKey="count" fill="#166534" radius={[4, 4, 0, 0]} maxBarSize={50}>
                    <LabelList dataKey="count" position="top" style={{ fontSize: 10, fill: '#374151' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {selectedCard && <PropertyCard property={selectedCard} onClose={() => setSelectedCard(null)} />}
    </div>
  );
}
