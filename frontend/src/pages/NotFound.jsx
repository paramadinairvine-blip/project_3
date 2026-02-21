import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <p className="text-7xl font-bold text-gray-200">404</p>
        <h2 className="text-xl font-semibold text-gray-800 mt-4 mb-2">
          Halaman Tidak Ditemukan
        </h2>
        <p className="text-gray-500 mb-6">
          Halaman yang Anda cari tidak ada atau telah dipindahkan.
        </p>
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Kembali ke Dashboard
        </button>
      </div>
    </div>
  );
}
