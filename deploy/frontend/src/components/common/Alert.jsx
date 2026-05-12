import { useState } from 'react';
import { HiX, HiCheckCircle, HiExclamation, HiXCircle, HiInformationCircle } from 'react-icons/hi';

const config = {
  success: {
    bg: 'bg-green-50 border-green-200',
    icon: HiCheckCircle,
    iconColor: 'text-green-500',
    title: 'text-green-800',
    message: 'text-green-700',
  },
  warning: {
    bg: 'bg-yellow-50 border-yellow-200',
    icon: HiExclamation,
    iconColor: 'text-yellow-500',
    title: 'text-yellow-800',
    message: 'text-yellow-700',
  },
  danger: {
    bg: 'bg-red-50 border-red-200',
    icon: HiXCircle,
    iconColor: 'text-red-500',
    title: 'text-red-800',
    message: 'text-red-700',
  },
  info: {
    bg: 'bg-blue-50 border-blue-200',
    icon: HiInformationCircle,
    iconColor: 'text-blue-500',
    title: 'text-blue-800',
    message: 'text-blue-700',
  },
};

export default function Alert({
  variant = 'info',
  title,
  message,
  closeable = false,
  className = '',
  onClose,
}) {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  const c = config[variant];
  const Icon = c.icon;

  const handleClose = () => {
    setVisible(false);
    onClose?.();
  };

  return (
    <div className={`flex gap-3 border rounded-lg p-4 ${c.bg} ${className}`} role="alert">
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${c.iconColor}`} />
      <div className="flex-1 min-w-0">
        {title && <p className={`text-sm font-semibold ${c.title}`}>{title}</p>}
        {message && <p className={`text-sm ${title ? 'mt-1' : ''} ${c.message}`}>{message}</p>}
      </div>
      {closeable && (
        <button onClick={handleClose} className={`flex-shrink-0 ${c.iconColor} hover:opacity-70`}>
          <HiX className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
