import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { HiPlus, HiPencil, HiTrash, HiEye } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { projectAPI } from '../../api/endpoints';
import { getErrorMessage } from '../../utils/handleError';
import { Badge, Breadcrumb, Button, Modal, Loading } from '../../components/common';
import { formatRupiah } from '../../utils/formatCurrency';
import { formatTanggal } from '../../utils/formatDate';
import { PROJECT_STATUS, PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS } from '../../utils/constants';
import useAuth from '../../hooks/useAuth';

const STATUS_TABS = [
  { key: '', label: 'Semua' },
  { key: PROJECT_STATUS.PLANNING, label: 'Perencanaan' },
  { key: PROJECT_STATUS.IN_PROGRESS, label: 'Berjalan' },
  { key: PROJECT_STATUS.COMPLETED, label: 'Selesai' },
  { key: PROJECT_STATUS.CANCELLED, label: 'Dibatalkan' },
];

function ProgressBar({ value, className = '' }) {
  const pct = Math.min(Math.max(value || 0, 0), 100);
  return (
    <div className={`w-full h-2 bg-gray-100 rounded-full overflow-hidden ${className}`}>
      <div
        className={`h-full rounded-full transition-all ${
          pct >= 100 ? 'bg-green-500' : pct >= 70 ? 'bg-blue-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-gray-400'
        }`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function ProjectCard({ project, canEdit, isAdmin, onEdit, onDelete, onView }) {
  const progress = project.progressPercent || 0;
  const budgetUsed = Number(project.budget) > 0
    ? Math.round((Number(project.spent || 0) / Number(project.budget)) * 100)
    : 0;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 mr-3">
          <h3 className="font-semibold text-gray-900 truncate">{project.name}</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {formatTanggal(project.startDate)} — {project.endDate ? formatTanggal(project.endDate) : 'Belum ditentukan'}
          </p>
        </div>
        <Badge colorClass={PROJECT_STATUS_COLORS[project.status]} size="sm">
          {PROJECT_STATUS_LABELS[project.status]}
        </Badge>
      </div>

      {/* Description */}
      {project.description && (
        <p className="text-sm text-gray-600 line-clamp-2 mb-3">{project.description}</p>
      )}

      {/* Progress */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
          <span>Progress Material</span>
          <span className="font-medium">{progress}%</span>
        </div>
        <ProgressBar value={progress} />
      </div>

      {/* Budget */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
          <span>Budget</span>
          <span className="font-medium">{budgetUsed}%</span>
        </div>
        <ProgressBar value={budgetUsed} />
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-gray-400">
            {formatRupiah(project.spent || 0)} / {formatRupiah(project.budget)}
          </span>
          <span className="text-xs text-gray-500">
            Sisa: {formatRupiah(project.budgetRemaining || (Number(project.budget) - Number(project.spent || 0)))}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
        <button
          onClick={() => onView(project)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium"
        >
          <HiEye className="w-4 h-4" /> Detail
        </button>
        {canEdit && (
          <button
            onClick={() => onEdit(project)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors font-medium"
          >
            <HiPencil className="w-4 h-4" /> Edit
          </button>
        )}
        {isAdmin && (
          <button
            onClick={() => onDelete(project)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
          >
            <HiTrash className="w-4 h-4" /> Hapus
          </button>
        )}
      </div>
    </div>
  );
}

export default function ProjectList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAdmin, isOperator } = useAuth();
  const canEdit = isAdmin || isOperator;

  const [statusFilter, setStatusFilter] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['projects', { status: statusFilter }],
    queryFn: async () => {
      const params = { limit: 50 };
      if (statusFilter) params.status = statusFilter;
      const { data: res } = await projectAPI.getAll(params);
      return res;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => projectAPI.remove(id),
    onSuccess: () => {
      toast.success('Proyek berhasil dihapus');
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Gagal menghapus proyek')),
  });

  const projects = data?.data || [];

  if (isLoading) return <Loading text="Memuat daftar proyek..." />;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Proyek' }]} className="mb-4" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Daftar Proyek</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola proyek dan kebutuhan material</p>
        </div>
        {canEdit && (
          <Button icon={HiPlus} onClick={() => navigate('/proyek/tambah')}>
            Tambah Proyek
          </Button>
        )}
      </div>

      {/* Status Tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              statusFilter === tab.key
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Project Cards Grid */}
      {projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              canEdit={canEdit}
              isAdmin={isAdmin}
              onView={(p) => navigate(`/proyek/${p.id}`)}
              onEdit={(p) => navigate(`/proyek/${p.id}/edit`)}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl px-6 py-12 text-center text-gray-400 text-sm">
          Tidak ada proyek ditemukan
        </div>
      )}

      {/* Delete Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Konfirmasi Hapus Proyek"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Batal</Button>
            <Button
              variant="danger"
              loading={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(deleteTarget?.id)}
            >
              Hapus
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Apakah Anda yakin ingin menghapus proyek{' '}
          <span className="font-semibold text-gray-900">{deleteTarget?.name}</span>?
        </p>
      </Modal>
    </div>
  );
}
