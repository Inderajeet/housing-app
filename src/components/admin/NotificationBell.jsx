'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';
import { getUnreadNotifications, markEnquiryRead, markBookingRead } from '@/lib/adminApi';

const POLL_INTERVAL_MS = 15000;
export const NOTIFICATION_SLOT_ID = 'admin-notification-slot';

const timeAgo = (date) => {
  const diffMs = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

// Renders inline (portaled) into the button row of whichever page defines
// a slot with id={NOTIFICATION_SLOT_ID}; falls back to a fixed corner
// position on pages that don't have one yet.
export default function NotificationBell({ className = '' }) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [open, setOpen] = useState(false);
  const [slotEl, setSlotEl] = useState(null);
  const wrapRef = useRef(null);
  const router = useRouter();
  const pathname = usePathname();

  const load = useCallback(async () => {
    try {
      const res = await getUnreadNotifications();
      const data = res.data || res;
      setItems(Array.isArray(data.items) ? data.items : []);
      setTotal(data.total || 0);
    } catch {
      // silent — keep last known state on a failed poll
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    setSlotEl(document.getElementById(NOTIFICATION_SLOT_ID));
  }, [pathname]);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const handleItemClick = async (item) => {
    setItems((prev) => prev.filter((i) => !(i.kind === item.kind && i.id === item.id)));
    setTotal((prev) => Math.max(0, prev - 1));
    setOpen(false);
    router.push(item.href);
    try {
      if (item.kind === 'enquiry') await markEnquiryRead(item.id);
      else await markBookingRead(item.id);
    } catch {
      // best-effort — a stale unread flag will just resurface on next poll
    }
  };

  const wrapperClass = slotEl ? 'relative' : (className || 'fixed top-6 right-6 z-40');

  const bell = (
    <div className={wrapperClass} ref={wrapRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2.5 bg-white border border-gray-200 rounded-xl text-slate-500 shadow-sm hover:bg-gray-50 hover:text-slate-800 transition-colors"
        title="Notifications"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {total > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {total > 99 ? '99+' : total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 max-h-[28rem] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-gray-100 z-50">
          <div className="px-5 py-3 border-b bg-gray-50/50 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-800">Notifications</h3>
            <span className="text-[10px] font-bold uppercase text-gray-400">{total} unread</span>
          </div>
          {items.length === 0 ? (
            <p className="text-center text-gray-400 text-xs font-semibold py-10">No new notifications</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {items.map((item) => (
                <li key={`${item.kind}-${item.id}`}>
                  <button
                    onClick={() => handleItemClick(item)}
                    className="w-full text-left px-5 py-3 hover:bg-blue-50/40 transition-colors flex flex-col gap-1"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${item.listingType === 'rent' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'}`}>
                        {item.listingType}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-100 text-slate-600">
                        {item.kind}
                      </span>
                      {item.kind === 'enquiry' && (
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${item.role === 'seller' ? 'bg-purple-100 text-purple-600' : 'bg-emerald-100 text-emerald-600'}`}>
                          {item.role}
                        </span>
                      )}
                      <span className="ml-auto text-[10px] text-gray-400 font-medium">{timeAgo(item.date)}</span>
                    </div>
                    <div className="text-sm font-semibold text-gray-800">{item.name}</div>
                    <div className="text-xs text-gray-500 font-mono">
                      {item.phone || 'No phone'} {item.propertyId ? `· #${item.propertyId}` : ''}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );

  return slotEl ? createPortal(bell, slotEl) : bell;
}
