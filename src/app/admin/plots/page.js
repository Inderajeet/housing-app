'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DataTable from '@/components/admin/DataTable';
import Loader from '@/components/admin/Loader';
import { getPlotProperties, getPlotLayout } from '@/lib/adminApi';

const STATUS_COLORS = {
  'Nil Booking': 'bg-gray-100 text-gray-600',
  'ON_BOOKING': 'bg-yellow-100 text-yellow-800',
  'BOOKED': 'bg-blue-100 text-blue-800',
  'SOLD': 'bg-red-100 text-red-800',
};

const getApprovalClasses = (status) => {
  const s = String(status || '').toLowerCase();
  if (s === 'approved') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (s === 'pending') return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  if (s === 'rejected') return 'bg-red-100 text-red-800 border-red-200';
  return 'bg-gray-100 text-gray-600 border-gray-200';
};

export default function PlotsPage() {
  const router = useRouter();
  const [plots, setPlots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPlotProperties()
      .then((res) => {
        const data = res.data || res;
        setPlots(Array.isArray(data) ? data : []);
      })
      .catch(() => setPlots([]))
      .finally(() => setLoading(false));
  }, []);

  const handleOpenEditor = async (p) => {
    try {
      await getPlotLayout(p.property_id);
      router.push(`/admin/plots/editor/${p.property_id}`);
    } catch {
      router.push(`/admin/plots/editor/${p.property_id}`);
    }
  };

  const columns = [
    { header: 'Property ID', accessor: 'formatted_id', className: 'font-mono font-semibold text-blue-600' },
    { header: 'Seller Phone', accessor: 'seller_phone', className: 'font-mono text-sm' },
    {
      header: 'Approval', sortable: true, sortBy: p => p.status || '',
      accessor: (p) => (
        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${getApprovalClasses(p.status)}`}>
          {p.status || 'pending'}
        </span>
      ),
    },
    {
      header: 'Booking Status', sortable: true, sortBy: p => p.booking_status || '',
      accessor: (p) => (
        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${STATUS_COLORS[p.booking_status] || 'bg-gray-100 text-gray-600'}`}>
          {p.booking_status || 'Nil Booking'}
        </span>
      ),
    },
    {
      header: 'Total Plots',
      accessor: (p) => <span className="font-bold text-blue-700">{p.total_plots ?? 0}</span>,
      sortable: true, sortBy: p => Number(p.total_plots) || 0,
    },
    {
      header: 'Nil Booking', sortable: true, sortBy: p => Number(p.nil_booking) || 0,
      accessor: (p) => <span className="font-bold text-gray-600">{p.nil_booking ?? 0}</span>,
    },
    {
      header: 'On Booking', sortable: true, sortBy: p => Number(p.on_booking) || 0,
      accessor: (p) => <span className="font-bold text-yellow-700">{p.on_booking ?? 0}</span>,
    },
    {
      header: 'Confirmed', sortable: true, sortBy: p => Number(p.confirmed) || 0,
      accessor: (p) => <span className="font-bold text-emerald-700">{p.confirmed ?? 0}</span>,
    },
    {
      header: 'Created',
      accessor: (p) => p.created_at?.split('T')[0] || '-',
      sortable: true, sortBy: p => new Date(p.created_at).getTime(),
      className: 'text-xs text-gray-500',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Plot Properties</h2>
        <p className="text-gray-500 text-xs uppercase tracking-widest font-bold mt-1">Plot-type layout editor</p>
      </div>
      {loading ? (
        <Loader />
      ) : (
        <DataTable
          columns={columns}
          data={plots}
          emptyMessage="No plot properties found"
          actions={(p) => (
            <button
              onClick={(e) => { e.stopPropagation(); handleOpenEditor(p); }}
              className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-lg border border-blue-100 hover:bg-blue-100 uppercase tracking-widest"
            >
              Open Editor
            </button>
          )}
        />
      )}
    </div>
  );
}
