import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

// Split out of ui/index.tsx (which pulls in framer-motion) so the app shell's
// Suspense fallback doesn't drag that dependency into the eagerly-loaded entry chunk.
export const Spinner = ({ className }: { className?: string }) => <Loader2 className={cn('h-5 w-5 animate-spin text-brand-500', className)} aria-label="Loading" />;
export const PageLoader = () => <div className="flex h-64 items-center justify-center"><Spinner className="h-8 w-8" /></div>;
