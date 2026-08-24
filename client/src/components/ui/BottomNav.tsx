import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MoreHorizontal, X, LogOut, type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface BottomNavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

interface BottomNavProps {
  items: BottomNavItem[];
  moreItems: BottomNavItem[];
  onLogout: () => void;
}

/**
 * Fixed mobile bottom navigation, shared across the Customer/Driver/Admin
 * layouts. Deliberately not a repositioned sidebar — four primary
 * destinations plus a "More" sheet for everything else, sized for one-handed
 * use and padded for iOS/Android safe areas.
 */
export function BottomNav({ items, moreItems, onLogout }: BottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (href: string) => location.pathname.startsWith(href);
  const moreIsActive = moreItems.some((item) => isActive(item.href));

  const goTo = (href: string) => {
    setMoreOpen(false);
    navigate(href);
  };

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch border-t border-slate-200 bg-white shadow-[0_-2px_8px_rgba(0,0,0,0.04)] md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors',
                active ? 'text-brand-600' : 'text-slate-500'
              )}
            >
              <item.icon className={cn('h-5 w-5', active && 'text-brand-600')} strokeWidth={active ? 2.5 : 2} />
              <span>{item.name}</span>
            </Link>
          );
        })}
        <button
          onClick={() => setMoreOpen(true)}
          className={cn(
            'flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors',
            moreIsActive ? 'text-brand-600' : 'text-slate-500'
          )}
        >
          <MoreHorizontal className="h-5 w-5" strokeWidth={moreIsActive ? 2.5 : 2} />
          <span>More</span>
        </button>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-slate-900/50" onClick={() => setMoreOpen(false)} />
          <div
            className="fixed inset-x-0 bottom-0 rounded-t-2xl bg-white p-2 shadow-2xl"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.5rem)' }}
          >
            <div className="flex items-center justify-between px-4 py-3">
              <h2 className="text-base font-semibold text-slate-900">More</h2>
              <button onClick={() => setMoreOpen(false)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto px-2 pb-2">
              {moreItems.map((item) => (
                <button
                  key={item.name}
                  onClick={() => goTo(item.href)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <item.icon className="h-5 w-5 text-slate-400" />
                  {item.name}
                </button>
              ))}
              <button
                onClick={onLogout}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-5 w-5" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
