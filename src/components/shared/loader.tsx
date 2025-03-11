// components/ui/Loader.tsx
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoaderProps {
  /** The size of the loader in pixels */
  size?: number;
  /** Text to display below the loader */
  text?: string;
  /** Full screen overlay or inline */
  fullScreen?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function Loader({
  size = 24,
  text,
  fullScreen = false,
  className,
}: LoaderProps) {
  const loader = (
    <div className={cn('flex flex-col items-center justify-center', className)}>
      <Loader2
        className="animate-spin text-primary"
        size={size}
        strokeWidth={2}
      />
      {text && <p className="mt-2 text-sm text-muted-foreground">{text}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
        {loader}
      </div>
    );
  }

  return loader;
}

export function PageLoader({
  text = 'Loading Please wait...',
}: {
  text?: string;
}) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader size={36} text={text} />
    </div>
  );
}

export function ButtonLoader({ size = 16 }: { size?: number }) {
  return <Loader2 className="animate-spin" size={size} />;
}
