const paddings = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export default function Card({
  title,
  subtitle,
  children,
  footer,
  padding = 'md',
  hover = false,
  className = '',
  headerAction,
}) {
  return (
    <div
      className={`bg-white border border-gray-200 rounded-xl ${
        hover ? 'hover:shadow-md transition-shadow' : ''
      } ${className}`}
    >
      {(title || subtitle || headerAction) && (
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100">
          <div>
            {title && <h3 className="text-base font-semibold text-gray-900">{title}</h3>}
            {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}

      <div className={paddings[padding]}>{children}</div>

      {footer && (
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-xl">
          {footer}
        </div>
      )}
    </div>
  );
}
