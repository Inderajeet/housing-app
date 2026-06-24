'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

const Sidebar = ({ isOpen = true, onToggle }) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [openMenus, setOpenMenus] = useState({ rent: true, sale: true });
  const isSaleSub = ['/admin/sale', '/admin/sellers', '/admin/buyers', '/admin/enquiries', '/admin/plots', '/admin/flats', '/admin/sale-graph'].some(p => pathname === p || pathname?.startsWith(p + '/'));
  const toggleMenu = (menu) => setOpenMenus(prev => ({ ...prev, [menu]: !prev[menu] }));

  const navClass = (href) =>
    `w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
      pathname === href ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    }`;

  const subNavClass = (href) => {
    const [hrefPath, hrefSearch] = href.split('?');
    const hrefParams = new URLSearchParams(hrefSearch || '');
    const isActive = pathname === hrefPath && (!hrefSearch || [...hrefParams.entries()].every(([k, v]) => searchParams.get(k) === v));
    return `w-full flex items-center space-x-3 px-4 py-2 rounded-lg transition-all text-sm group ${
      isActive ? 'text-blue-400 font-bold bg-slate-800/50' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'
    }`;
  };

  return (
    <>
      <aside className={`bg-slate-900 text-white flex flex-col shadow-xl z-20 shrink-0 transition-all duration-300 ${isOpen ? 'w-64' : 'w-0 overflow-hidden'}`}>
        <div className="p-6 flex items-center justify-between border-b border-slate-800 min-w-0">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shrink-0">TN</div>
            <span className="text-xl font-bold tracking-tight truncate">TN Mandi</span>
          </div>
          <button onClick={onToggle} className="text-slate-400 hover:text-white transition-colors p-1 rounded shrink-0 ml-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          </button>
        </div>

        <nav className="flex-1 mt-6 px-4 space-y-1 overflow-y-auto">
          <Link href="/admin/dashboard" className={navClass('/admin/dashboard')}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            <span className="font-medium text-sm">Dashboard</span>
          </Link>

          {/* Rent Section */}
          <div>
            <button onClick={() => toggleMenu('rent')} className="w-full flex items-center justify-between px-4 py-3 text-slate-400 hover:text-white group transition-all">
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                <span className="font-medium text-sm">Rent Properties</span>
              </div>
              <span className={`text-[10px] transition-transform duration-200 ${openMenus.rent ? 'rotate-180' : ''}`}>▼</span>
            </button>
            {openMenus.rent && (
              <div className="ml-9 mt-1 space-y-1 border-l border-slate-800 pl-2">
                <Link href="/admin/rent" className={subNavClass('/admin/rent')}><span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span><span>Properties</span></Link>
                <Link href="/admin/rent/owners" className={subNavClass('/admin/rent/owners')}><span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span><span>Owners</span></Link>
                <Link href="/admin/rent/enquiries" className={subNavClass('/admin/rent/enquiries')}><span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span><span>Enquiries</span></Link>
                <Link href="/admin/rent/bookings" className={subNavClass('/admin/rent/bookings')}><span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span><span>Bookings</span></Link>
                <Link href="/admin/premium?type=rent" className={subNavClass('/admin/premium?type=rent')}><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span><span>Premium</span></Link>
              </div>
            )}
          </div>

          {/* Sale Section */}
          <div>
            <button onClick={() => toggleMenu('sale')} className="w-full flex items-center justify-between px-4 py-3 text-slate-400 hover:text-white group transition-all">
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                <span className="font-medium text-sm">Sale Properties</span>
              </div>
              <span className={`text-[10px] transition-transform duration-200 ${openMenus.sale ? 'rotate-180' : ''}`}>▼</span>
            </button>
            {openMenus.sale && (
              <div className="ml-9 mt-1 space-y-1 border-l border-slate-800 pl-2">
                <Link href="/admin/sale" className={subNavClass('/admin/sale')}><span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span><span>Properties</span></Link>
                <Link href="/admin/plots" className={subNavClass('/admin/plots')}><span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span><span>Plot Properties</span></Link>
                <Link href="/admin/flats" className={subNavClass('/admin/flats')}><span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span><span>Flat Properties</span></Link>
                <Link href="/admin/sellers" className={subNavClass('/admin/sellers')}><span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span><span>Sellers</span></Link>
                <Link href="/admin/buyers" className={subNavClass('/admin/buyers')}><span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span><span>Buyers</span></Link>
                <Link href="/admin/enquiries" className={subNavClass('/admin/enquiries')}><span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span><span>Enquiries</span></Link>
                <Link href="/admin/sale/bookings" className={subNavClass('/admin/sale/bookings')}><span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span><span>Bookings</span></Link>
                <Link href="/admin/premium?type=sale" className={subNavClass('/admin/premium?type=sale')}><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span><span>Premium</span></Link>
                <Link href="/admin/sale-graph" className={subNavClass('/admin/sale-graph')}><span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span><span>Sale Graph</span></Link>
              </div>
            )}
          </div>

          <Link href="/admin/site-content" className={navClass('/admin/site-content')}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            <span className="font-medium text-sm">Site Content</span>
          </Link>

          <Link href="/admin/locations" className={navClass('/admin/locations')}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            <span className="font-medium text-sm">Locations</span>
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="bg-slate-800 rounded-xl p-3 flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center border border-slate-600 shrink-0">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate text-white">Super Admin</p>
              <p className="text-[10px] text-slate-500 truncate">admin@tnmandi.com</p>
            </div>
          </div>
        </div>
      </aside>

      {!isOpen && (
        <button onClick={onToggle} className="fixed left-0 top-1/2 -translate-y-1/2 z-30 bg-slate-900 text-white p-2 rounded-r-xl shadow-xl hover:bg-slate-700 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
        </button>
      )}
    </>
  );
};

export default Sidebar;
