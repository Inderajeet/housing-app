'use client';

import React from 'react';

const Navbar = ({ title }) => (
  <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between sticky top-0 z-10">
    <div className="flex items-center space-x-4">
      <h1 className="text-lg font-bold text-slate-800 uppercase tracking-tight">{title}</h1>
    </div>
    <div className="flex items-center space-x-4">
      <div className="hidden lg:relative lg:block">
        <input type="text" placeholder="Search listings, sellers, IDs..." className="pl-10 pr-4 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 w-80 transition-all" />
        <svg className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
      </div>
      <button className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 relative group transition-all">
        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
        <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
      </button>
    </div>
  </header>
);

export default Navbar;
