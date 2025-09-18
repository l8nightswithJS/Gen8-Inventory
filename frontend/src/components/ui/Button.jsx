import { forwardRef } from 'react';
import { cn } from '../../utils/classnames';

const Button = forwardRef(
  (
    {
      as: Component = 'button', // 1. Add the 'as' prop, defaulting to 'button'
      children,
      className = '',
      variant = 'primary',
      size = 'md',
      leftIcon: LeftIcon,
      rightIcon: RightIcon,
      disabled = false,
      ...props
    },
    ref,
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-semibold rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-in-out';

    const variantStyles = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
      secondary:
        'bg-slate-100 text-slate-700 hover:bg-slate-200 focus:ring-slate-500 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
      ghost:
        'bg-transparent text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 focus:ring-blue-500',
    };

    const sizeStyles = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-5 py-2.5 text-base',
    };

    const iconSize = {
      sm: 'h-4 w-4',
      md: 'h-5 w-5',
      lg: 'h-5 w-5',
    };

    return (
      // 2. Use the dynamic Component here instead of a hardcoded <button>
      <Component
        ref={ref}
        disabled={disabled}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        {...props} // This passes down the 'to' prop to the Link component
      >
        {LeftIcon && (
          <LeftIcon className={cn(iconSize[size], children ? 'mr-2' : '')} />
        )}
        {children}
        {RightIcon && (
          <RightIcon className={cn(iconSize[size], children ? 'ml-2' : '')} />
        )}
      </Component>
    );
  },
);

Button.displayName = 'Button';
export default Button;
