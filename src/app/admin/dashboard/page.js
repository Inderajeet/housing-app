'use client';

import React, { useEffect, useState } from 'react';
import { getDashboardStats, getRecentEnquiries } from '../../../lib/adminApi.js';
import dynamic from 'next/dynamic';

const PieChart = dynamic(() => import('recharts').then(m => m.PieChart), { ssr: false });
const Pie = dynamic(() => import('recharts').then(m => m.Pie), { ssr: false });
const Cell = dynamic(() => import('recharts').then(m => m.Cell), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false });
const Legend = dynamic(() => import('recharts').then(m => m.Legend), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false });

const PIE_COLORS_TYPE   = ['#3b82f6', '#10b981', '#f59e0b'];
const PIE_COLORS_STATUS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444'];
const PIE_COLORS_ENQ    = ['#a78bfa', '#3b82f6', '#10b981', '#f43f5e'];

const fmt = (n) => (n == null ? '—' : Number(n).toLocaleString());
const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const StatCard = ({ label, count, color }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-slate-300 transition-all">
    <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center text-white mb-4`}>
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
    </div>
    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{label}</p>
    <h3 className="text-3xl font-bold mt-1 text-slate-800">{fmt(count)}</h3>
  </div>
);

const Skeleton = ({ className = '' }) => <div className={`animate-pulse bg-slate-100 rounded-xl ${className}`} />;

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [statsRes, enqRes] = await Promise.all([getDashboardStats(), getRecentEnquiries()]);
      setStats(statsRes.data);
      setEnquiries(enqRes.data || []);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const typeChartData = stats ? [
    { name: 'Rentals', value: Number(stats.total_rent) || 0 },
    { name: 'Sales', value: Number(stats.total_sale) || 0 },
    { name: 'Plots', value: Number(stats.total_plot) || 0 },
  ] : [];

  const statusChartData = stats ? [
    { name: 'Approved', value: Number(stats.status_approved) || 0 },
    { name: 'Pending', value: Number(stats.status_pending) || 0 },
    { name: 'Inactive', value: Number(stats.status_inactive) || 0 },
  ] : [];

  const enquiryChartData = stats ? [
    { name: 'Open', value: Number(stats.enquiries_open) || 0 },
    { name: 'Booked', value: Number(stats.enquiries_booked) || 0 },
    { name: 'Confirmed', value: Number(stats.enquiries_confirmed) || 0 },
    { name: 'Cancelled', value: Number(stats.enquiries_cancelled) || 0 },
  ] : [];

  const topStats = stats ? [
    { label: 'Total Properties', count: stats.total_properties, color: 'bg-slate-500' },
    { label: 'Verified Sellers', count: stats.total_sellers, color: 'bg-blue-500' },
    { label: 'Unique Buyers', count: stats.total_buyers, color: 'bg-emerald-500' },
    { label: 'Total Enquiries', count: stats.total_enquiries, color: 'bg-purple-500' },
  ] : [];

  const subStats = stats ? [
    { label: 'Rent Listings', count: stats.total_rent, color: 'bg-blue-50 text-blue-700 border-blue-100' },
    { label: 'Sale Listings', count: stats.total_sale, color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
    { label: 'Plot Listings', count: stats.total_plot, color: 'bg-amber-50 text-amber-700 border-amber-100' },
    { label: 'Premium Active', count: stats.premium_active, color: 'bg-rose-50 text-rose-700 border-rose-100' },
    { label: 'Premium Pending', count: stats.premium_pending, color: 'bg-orange-50 text-orange-700 border-orange-100' },
    { label: 'Confirmed Deals', count: stats.enquiries_confirmed, color: 'bg-violet-50 text-violet-700 border-violet-100' },
  ] : [];

  if (error) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <p className="text-red-500 font-bold text-lg">Failed to load dashboard</p>
        <p className="text-slate-400 text-sm mt-2">{error}</p>
        <button onClick={fetchData} className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold">Retry</button>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36" />) : topStats.map((s, i) => <StatCard key={i} {...s} />)}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {loading ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />) : subStats.map((s, i) => (
          <div key={i} className={`p-4 rounded-2xl border flex flex-col items-center justify-center text-center ${s.color}`}>
            <span className="text-2xl font-bold">{fmt(s.count)}</span>
            <span className="text-[10px] font-bold uppercase tracking-widest mt-1 opacity-80">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {loading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-72" />) : [
          { title: 'Portfolio by Type', data: typeChartData, colors: PIE_COLORS_TYPE },
          { title: 'Properties by Status', data: statusChartData, colors: PIE_COLORS_STATUS },
          { title: 'Enquiries by Stage', data: enquiryChartData, colors: PIE_COLORS_ENQ },
        ].map(({ title, data, colors }) => (
          <div key={title} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h4 className="text-sm font-bold text-slate-700 mb-4">{title}</h4>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                  {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,.08)' }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px', fontWeight: 700 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>

      {!loading && stats && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest mb-4">Sale Breakdown</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Houses', value: stats.sale_house, color: 'bg-blue-50 text-blue-700' },
              { label: 'Flats', value: stats.sale_flat, color: 'bg-emerald-50 text-emerald-700' },
              { label: 'Land', value: stats.sale_land, color: 'bg-amber-50 text-amber-700' },
              { label: 'Plots', value: stats.sale_plot, color: 'bg-purple-50 text-purple-700' },
            ].map((item) => (
              <div key={item.label} className={`rounded-xl p-4 flex flex-col items-center ${item.color}`}>
                <span className="text-2xl font-bold">{fmt(item.value)}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest mt-1 opacity-80">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-800">Recent Enquiries</h3>
          <span className="text-[10px] font-bold text-slate-400 border border-slate-100 px-3 py-1 rounded-full uppercase tracking-widest">Live</span>
        </div>
        {loading ? <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
          : enquiries.length === 0 ? <p className="text-center py-10 text-slate-300 font-bold uppercase text-[10px] tracking-widest">No active leads</p>
          : (
            <div className="space-y-3">
              {enquiries.map((enq, idx) => {
                const pill = { enquired: 'bg-blue-50 text-blue-600', booked: 'bg-amber-50 text-amber-600', confirmed: 'bg-emerald-50 text-emerald-600', cancelled: 'bg-red-50 text-red-500' }[enq.booking_status] || 'bg-slate-50 text-slate-500';
                return (
                  <div key={enq.enquiry_id || idx} className="p-4 bg-slate-50 rounded-xl border border-transparent hover:border-slate-200 transition-all flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{enq.contact_name || enq.phone_number || 'Unknown'}</p>
                      <p className="text-[10px] font-medium text-slate-400">{enq.property_title || '—'} · {formatDate(enq.enquiry_date)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase">{enq.formatted_id || enq.property_id}</span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${pill}`}>{enq.booking_status}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
      </div>
    </div>
  );
}
