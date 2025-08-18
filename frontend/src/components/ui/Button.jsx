// src/components/ui/Button.jsx

import { cn } from '../../utils/classnames';

const base =
  'inline-flex items-center justify-center gap-2 rounded-2xl font-medium transition-colors ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed ' +
  'whitespace-nowrap';

const sizes = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-10 px-4 text-[0.95rem]',
  lg: 'h-11 px-5 text-base',
};

const variants = {
  primary:
    'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500',
  secondary:
    'bg-gray-100 text-gray-900 hover:bg-gray-200 focus-visible:ring-gray-400',
  outline:
    'border border-gray-300 text-gray-800 bg-white hover:bg-gray-50 focus-visible:ring-gray-400',
  ghost:
    'bg-transparent text-gray-800 hover:bg-gray-50 focus-visible:ring-gray-400',
};

export default function Button({
  as: Comp = 'button',
  size = 'md',
  variant = 'outline',
  className,
  children,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  ...props
}) {
  return (
    <Comp
      className={cn(base, sizes[size], variants[variant], className)}
      {...props}
    >
      {LeftIcon ? <LeftIcon className="shrink-0" /> : null}
      <span className="min-w-0">{children}</span>
      {RightIcon ? <RightIcon className="shrink-0" /> : null}
    </Comp>
  );
}
