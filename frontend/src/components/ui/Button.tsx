import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

const buttonVariants = cva(
    "inline-flex items-center justify-center rounded-xl text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background active:scale-95",
    {
        variants: {
            variant: {
                default: "bg-primary text-white shadow-lg shadow-primary/25 hover:bg-primary-dark",
                destructive: "bg-status-red text-white hover:bg-red-600 shadow-lg shadow-status-red/25",
                outline: "border border-input bg-transparent hover:bg-white/5 text-white",
                secondary: "bg-surface-light dark:bg-zinc-800 text-text-main dark:text-white hover:bg-gray-100 dark:hover:bg-zinc-700",
                ghost: "hover:bg-white/10 text-text-main dark:text-white",
                link: "text-primary underline-offset-4 hover:underline",
            },
            size: {
                default: "h-12 py-3 px-6",
                sm: "h-9 px-3 rounded-lg",
                lg: "h-14 px-8 rounded-2xl text-base",
                icon: "h-12 w-12",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
);

export interface ButtonProps
    extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, isLoading, children, ...props }, ref) => {
        return (
            <button
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                disabled={isLoading || props.disabled}
                {...props}
            >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {children}
            </button>
        );
    }
);
Button.displayName = "Button";

export { Button, buttonVariants };
