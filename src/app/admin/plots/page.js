'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DataTable from '@/components/admin/DataTable';
import Loader from '@/components/admin/Loader';
import { getPlotProperties, getPlotLayout } from '@/lib/adminApi';

const getStatusClasses = (status) => {
  const s = String(status || '').toLowerCase();
  if (s === 'approved') return 'bg-emerald-100 text-emerald-700';
  if (s === 'pending') return 'bg-red-100 text-red-700';
  return 'bg-gray-100 text-gray-600';
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
      header: 'Status',
      accessor: (p) => (
        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${getStatusClasses(p.status)}`}>
          {p.status}
        </span>
      ),
    },
    {
      header: 'Units',
      accessor: (p) => <span className="font-bold text-blue-700">{p.total_plots ?? 0} plots</span>,
    },
    {
      header: 'Created',
      accessor: (p) => p.created_at?.split('T')[0] || '-',
      className: 'text-xs text-gray-500',
    },
    {
      header: 'Actions',
      accessor: (p) => (
        <button
          onClick={(e) => { e.stopPropagation(); handleOpenEditor(p); }}
          className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-lg border border-blue-100 hover:bg-blue-100 uppercase tracking-widest"
        >
          Open Editor
        </button>
      ),
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
        <DataTable columns={columns} data={plots} emptyMessage="No plot properties found" onRowClick={handleOpenEditor} />
      )}
    </div>
  );
}
