// src/components/ui/Button.jsx
import clsx from 'clsx';

const baseClasses =
  'inline-flex items-center justify-center font-medium border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition';

const sizeClasses = {
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

const variantClasses = {
  primary:
    'border-transparent bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
  secondary:
    'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500',
  danger:
    'border-transparent bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  // Added a new 'success' variant for green buttons
  success:
    'border-transparent bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
  ghost:
    'border-transparent bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-blue-500',
};

export default function Button({
  as: Component = 'button',
  variant = 'primary',
  size = 'md',
  leftIcon: LeftIcon,
  className,
  children,
  ...props
}) {
  return (
    <Component
      className={clsx(
        baseClasses,
        sizeClasses[size],
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {LeftIcon && <LeftIcon className="mr-2 -ml-1 h-4 w-4" />}
      {children}
    </Component>
  );
}
