import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { HiEye, HiRewind, HiTable } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { auditLogAPI, userAPI } from '../../api/endpoints';
import { getErrorMessage } from '../../utils/handleError';
import { Table, Badge, Button, Select, Input, Pagination, Modal, Loading, Breadcrumb } from '../../components/common';
import { formatTanggalWaktu } from '../../utils/formatDate';
import { exportToExcel } from '../../utils/exportExcel';

const ACTION_COLORS = {
  CREATE: 'bg-green-100 text-green-800',
  UPDATE: 'bg-blue-100 text-blue-800',
  DELETE: 'bg-red-100 text-red-800',
  ROLLBACK: 'bg-purple-100 text-purple-800',
  LOGIN: 'bg-gray-100 text-gray-800',
  LOGOUT: 'bg-gray-100 text-gray-800',
};

const ACTION_OPTIONS = [
  { value: 'CREATE', label: 'Create' },
  { value: 'UPDATE', label: 'Update' },
  { value: 'DELETE', label: 'Delete' },
  { value: 'ROLLBACK', label: 'Rollback' },
  { value: 'LOGIN', label: 'Login' },
];

const MODULE_OPTIONS = [
  { value: 'User', label: 'User' },
  { value: 'Product', label: 'Product' },
  { value: 'Category', label: 'Category' },
  { value: 'Supplier', label: 'Supplier' },
  { value: 'Transaction', label: 'Transaction' },
  { value: 'PurchaseOrder', label: 'Purchase Order' },
  { value: 'StockMovement', label: 'Stock Movement' },
  { value: 'Project', label: 'Project' },
  { value: 'StockOpname', label: 'Stock Opname' },
];

// ─── Diff Viewer ──────────────────────────────────────
function JsonDiff({ oldData, newData }) {
  const oldObj = typeof oldData === 'string' ? JSON.parse(oldData || '{}') : (oldData || {});
  const newObj = typeof newData === 'string' ? JSON.parse(newData || '{}') : (newData || {});
  const allKeys = [...new Set([...Object.keys(oldObj), ...Object.keys(newObj)])];

  if (allKeys.length === 0) {
    return <p className="text-sm text-gray-400 italic">Tidak ada data</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left px-3 py-2 font-semibold text-gray-600">Field</th>
            <th className="text-left px-3 py-2 font-semibold text-gray-600">Data Lama</th>
            <th className="text-left px-3 py-2 font-semibold text-gray-600">Data Baru</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {allKeys.map((key) => {
            const oldVal = JSON.stringify(oldObj[key] ?? '—');
            const newVal = JSON.stringify(newObj[key] ?? '—');
            const changed = oldVal !== newVal;
            return (
              <tr key={key} className={changed ? 'bg-yellow-50' : ''}>
                <td className="px-3 py-1.5 font-mono font-medium text-gray-700">{key}</td>
                <td className={`px-3 py-1.5 font-mono ${changed ? 'text-red-600 bg-red-50' : 'text-gray-600'}`}>
                  {oldVal}
                </td>
                <td className={`px-3 py-1.5 font-mono ${changed ? 'text-green-600 bg-green-50' : 'text-gray-600'}`}>
                  {newVal}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Detail Modal ─────────────────────────────────────
function DetailModal({ logId, onClose }) {
  const queryClient = useQueryClient();
  const [showRollback, setShowRollback] = useState(false);

  const { data: log, isLoading } = useQuery({
    queryKey: ['audit-log', logId],
    queryFn: async () => {
      const { data } = await auditLogAPI.getById(logId);
      return data.data;
    },
    enabled: !!logId,
  });

  const rollbackMutation = useMutation({
    mutationFn: () => auditLogAPI.rollback(logId),
    onSuccess: () => {
      toast.success('Rollback berhasil. Data dikembalikan ke kondisi sebelumnya.');
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      queryClient.invalidateQueries({ queryKey: ['audit-log', logId] });
      setShowRollback(false);
      onClose();
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Gagal melakukan rollback')),
  });

  const canRollback = log?.action === 'UPDATE' || log?.action === 'DELETE';

  return (
    <>
      <Modal
        isOpen
        onClose={onClose}
        title="Detail Audit Log"
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <div>
              {canRollback && (
                <Button
                  variant="outline"
                  size="sm"
                  icon={HiRewind}
                  onClick={() => setShowRollback(true)}
                >
                  Rollback
                </Button>
              )}
            </div>
            <Button variant="outline" onClick={onClose}>Tutup</Button>
          </div>
        }
      >
        {isLoading ? (
          <Loading text="Memuat detail..." />
        ) : log ? (
          <div className="space-y-4">
            {/* Meta info */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-gray-500">Tanggal</p>
                <p className="font-medium">{formatTanggalWaktu(log.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">User</p>
                <p className="font-medium">{log.user?.fullName || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Aksi</p>
                <Badge colorClass={ACTION_COLORS[log.action]} size="sm">{log.action}</Badge>
              </div>
              <div>
                <p className="text-xs text-gray-500">Modul</p>
                <p className="font-medium">{log.tableName || log.module || '-'}</p>
              </div>
              {log.recordId && (
                <div>
                  <p className="text-xs text-gray-500">Record ID</p>
                  <p className="font-mono text-xs">{log.recordId}</p>
                </div>
              )}
              {log.description && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-500">Deskripsi</p>
                  <p className="text-sm">{log.description}</p>
                </div>
              )}
            </div>

            {/* Data diff */}
            <div className="border-t border-gray-200 pt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Perbandingan Data</p>
              <JsonDiff oldData={log.oldData} newData={log.newData} />
            </div>
          </div>
        ) : (
          <p className="text-gray-400 text-sm">Data tidak ditemukan</p>
        )}
      </Modal>

      {/* Rollback Confirmation */}
      <Modal
        isOpen={showRollback}
        onClose={() => setShowRollback(false)}
        title="Konfirmasi Rollback"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowRollback(false)}>Batal</Button>
            <Button variant="danger" loading={rollbackMutation.isPending} onClick={() => rollbackMutation.mutate()}>
              Rollback
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Data akan dikembalikan ke kondisi sebelumnya. Tindakan ini akan membuat log audit baru.
          Lanjutkan?
        </p>
      </Modal>
    </>
  );
}

// ─── Main Component ───────────────────────────────────
export default function AuditLog() {
  const [page, setPage] = useState(1);
  const [userId, setUserId] = useState('');
  const [tableName, setTableName] = useState('');
  const [action, setAction] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [detailId, setDetailId] = useState(null);

  // Fetch users for filter
  const { data: usersData } = useQuery({
    queryKey: ['users-select-audit'],
    queryFn: async () => {
      const { data } = await userAPI.getAll({ limit: 100 });
      return data.data || [];
    },
  });

  const userOptions = (usersData || []).map((u) => ({
    value: u.id,
    label: `${u.fullName} (${u.email})`,
  }));

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', { page, userId, tableName, action, startDate, endDate }],
    queryFn: async () => {
      const params = { page, limit: 20 };
      if (userId) params.userId = userId;
      if (tableName) params.tableName = tableName;
      if (action) params.action = action;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const { data: res } = await auditLogAPI.getAll(params);
      return res;
    },
  });

  const logs = data?.data || [];
  const pagination = data?.pagination || {};

  const handleExportExcel = () => {
    const headers = ['Tanggal', 'User', 'Aksi', 'Modul', 'Record ID', 'Deskripsi'];
    const rows = logs.map((l) => [
      formatTanggalWaktu(l.createdAt),
      l.user?.fullName || '-',
      l.action,
      l.tableName || l.module || '-',
      l.recordId || '-',
      l.description || '-',
    ]);
    exportToExcel('Audit Log', headers, rows, 'audit-log.xlsx');
  };

  const columns = [
    {
      key: 'createdAt',
      header: 'Tanggal & Waktu',
      sortable: true,
      render: (v) => <span className="text-gray-600 text-xs">{formatTanggalWaktu(v)}</span>,
    },
    {
      key: 'user',
      header: 'User',
      render: (_, row) => (
        <span className="text-gray-700 text-sm">{row.user?.fullName || '-'}</span>
      ),
    },
    {
      key: 'action',
      header: 'Aksi',
      render: (v) => (
        <Badge colorClass={ACTION_COLORS[v] || 'bg-gray-100 text-gray-800'} size="sm">
          {v}
        </Badge>
      ),
    },
    {
      key: 'tableName',
      header: 'Modul',
      render: (v, row) => <span className="text-gray-600 text-sm">{v || row.module || '-'}</span>,
    },
    {
      key: 'description',
      header: 'Deskripsi',
      render: (v) => <span className="text-gray-500 text-xs line-clamp-1">{v || '-'}</span>,
    },
    {
      key: 'actions',
      header: 'Aksi',
      width: '60px',
      render: (_, row) => (
        <button
          onClick={(e) => { e.stopPropagation(); setDetailId(row.id); }}
          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          title="Lihat Detail"
          aria-label="Lihat detail"
        >
          <HiEye className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Audit Log' }]} className="mb-4" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
          <p className="text-sm text-gray-500 mt-1">Riwayat semua perubahan data dalam sistem</p>
        </div>
        <Button variant="outline" size="sm" icon={HiTable} onClick={handleExportExcel}>
          Export Excel
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-56">
          <Select
            label="User"
            value={userId}
            onChange={(val) => { setUserId(val); setPage(1); }}
            options={userOptions}
            placeholder="Semua User"
            searchable
          />
        </div>
        <div className="w-44">
          <Select
            label="Modul"
            value={tableName}
            onChange={(val) => { setTableName(val); setPage(1); }}
            options={MODULE_OPTIONS}
            placeholder="Semua Modul"
          />
        </div>
        <div className="w-36">
          <Select
            label="Aksi"
            value={action}
            onChange={(val) => { setAction(val); setPage(1); }}
            options={ACTION_OPTIONS}
            placeholder="Semua"
          />
        </div>
        <Input
          label="Dari Tanggal"
          type="date"
          value={startDate}
          onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
          className="w-40"
        />
        <Input
          label="Sampai Tanggal"
          type="date"
          value={endDate}
          onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
          className="w-40"
        />
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={logs}
        loading={isLoading}
        sortable
        emptyMessage="Tidak ada log ditemukan"
      />

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <Pagination
          currentPage={pagination.page || page}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
        />
      )}

      {/* Detail Modal */}
      {detailId && (
        <DetailModal logId={detailId} onClose={() => setDetailId(null)} />
      )}
    </div>
  );
}
