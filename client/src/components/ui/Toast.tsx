import { useState, useCallback, ReactNode } from 'react';
import { CheckCircle2, XCircle, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ToastContext, type ToastType } from '../../hooks/useToast';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2, 11);
    setToasts((prev) => [...prev, { id, type, message }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg transition-all animate-in slide-in-from-right-4 fade-in duration-300 min-w-[300px]',
              t.type === 'success' && 'bg-green-600',
              t.type === 'error' && 'bg-red-600',
              t.type === 'warning' && 'bg-amber-600',
              t.type === 'info' && 'bg-blue-600'
            )}
          >
            {t.type === 'success' && <CheckCircle2 className="h-5 w-5" />}
            {t.type === 'error' && <XCircle className="h-5 w-5" />}
            {t.type === 'warning' && <AlertCircle className="h-5 w-5" />}
            {t.type === 'info' && <Info className="h-5 w-5" />}

            <p className="flex-1">{t.message}</p>

            <button
              onClick={() => removeToast(t.id)}
              className="ml-auto text-white/80 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
