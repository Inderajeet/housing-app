'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getDashboardStats, getRecentEnquiries } from '../../../lib/adminApi.js';

const fmt = (n) => (n == null ? '—' : Number(n).toLocaleString());
const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const ICONS = {
  properties: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
  sellers: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  buyers: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
  enquiries: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>,
};

const StatCard = ({ label, count, color, icon, href }) => {
  const card = (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-slate-300 transition-all h-full">
      <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center text-white mb-4`}>
        {icon}
      </div>
      <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{label}</p>
      <h3 className="text-3xl font-bold mt-1 text-slate-800">{fmt(count)}</h3>
    </div>
  );
  return href ? <Link href={href} className="block h-full">{card}</Link> : card;
};

const SubTile = ({ label, value, color, href }) => {
  const tile = (
    <div className={`p-4 rounded-2xl border flex flex-col items-center justify-center text-center h-full transition-all ${href ? 'hover:shadow-md hover:brightness-95 cursor-pointer' : ''} ${color}`}>
      <span className="text-2xl font-bold">{fmt(value)}</span>
      <span className="text-[10px] font-bold uppercase tracking-widest mt-1 opacity-80">{label}</span>
    </div>
  );
  return href ? <Link href={href} className="block h-full">{tile}</Link> : tile;
};

const Skeleton = ({ className = '' }) => <div className={`animate-pulse bg-slate-100 rounded-xl ${className}`} />;

const BreakdownSection = ({ title, loading, topStats, subTiles }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest mb-6">{title}</h3>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
      {loading
        ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36" />)
        : topStats.map((s, i) => <StatCard key={i} {...s} />)
      }
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {loading
        ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)
        : subTiles.map((s, i) => <SubTile key={i} {...s} />)
      }
    </div>
  </div>
);

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fetchedRef = React.useRef(false);

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

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetchData();
  }, []);

  const saleTopStats = stats ? [
    { label: 'Total Properties', count: stats.total_sale, color: 'bg-slate-500', icon: ICONS.properties, href: '/admin/sale' },
    { label: 'Sellers', count: stats.sale_sellers, color: 'bg-blue-500', icon: ICONS.sellers, href: '/admin/sellers' },
    { label: 'Buyers', count: stats.sale_buyers, color: 'bg-emerald-500', icon: ICONS.buyers, href: '/admin/buyers' },
    { label: 'Unread Enquiries', count: stats.sale_enquiries, color: 'bg-purple-500', icon: ICONS.enquiries, href: '/admin/enquiries' },
  ] : [];

  const saleSubTiles = stats ? [
    { label: 'Plots', value: stats.sale_plot, color: 'bg-blue-50 text-blue-700 border-blue-100', href: '/admin/sale?sale_type=plot' },
    { label: 'Flats', value: stats.sale_flat, color: 'bg-emerald-50 text-emerald-700 border-emerald-100', href: '/admin/sale?sale_type=flat' },
    { label: 'Land', value: stats.sale_land, color: 'bg-amber-50 text-amber-700 border-amber-100', href: '/admin/sale?sale_type=land' },
    { label: 'House', value: stats.sale_house, color: 'bg-purple-50 text-purple-700 border-purple-100', href: '/admin/sale?sale_type=house' },
  ] : [];

  const rentTopStats = stats ? [
    { label: 'Total Properties', count: stats.total_rent, color: 'bg-slate-500', icon: ICONS.properties, href: '/admin/rent' },
    { label: 'Sellers', count: stats.rent_sellers, color: 'bg-blue-500', icon: ICONS.sellers, href: '/admin/rent/owners' },
    { label: 'Buyers', count: stats.rent_buyers, color: 'bg-emerald-500', icon: ICONS.buyers, href: '/admin/buyers' },
    { label: 'Unread Enquiries', count: stats.rent_enquiries, color: 'bg-purple-500', icon: ICONS.enquiries, href: '/admin/rent/enquiries' },
  ] : [];

  const rentSubTiles = stats ? [
    { label: '1 BHK', value: stats.rent_1bhk, color: 'bg-blue-50 text-blue-700 border-blue-100', href: '/admin/rent?bhk=1' },
    { label: '2 BHK', value: stats.rent_2bhk, color: 'bg-emerald-50 text-emerald-700 border-emerald-100', href: '/admin/rent?bhk=2' },
    { label: '3+ BHK', value: stats.rent_3plus_bhk, color: 'bg-amber-50 text-amber-700 border-amber-100', href: '/admin/rent?bhk=3plus' },
    { label: 'Commercial', value: stats.rent_commercial, color: 'bg-purple-50 text-purple-700 border-purple-100', href: '/admin/rent?property_use=commercial' },
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
      <BreakdownSection
        title="Sales Breakdown"
        loading={loading}
        topStats={saleTopStats}
        subTiles={saleSubTiles}
      />

      <BreakdownSection
        title="Rent Breakdown"
        loading={loading}
        topStats={rentTopStats}
        subTiles={rentSubTiles}
      />

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
