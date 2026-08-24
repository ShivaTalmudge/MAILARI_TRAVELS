import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../features/auth/authStore';
import {
  LayoutDashboard, CalendarRange, User, LogOut, PlaneTakeoff, PlusCircle, Receipt, FileText, LifeBuoy, Shield
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { NotificationBell } from '../components/ui/NotificationBell';
import { BottomNav, type BottomNavItem } from '../components/ui/BottomNav';

const navigation = [
  { name: 'Dashboard', href: '/customer/dashboard', icon: LayoutDashboard },
  { name: 'My Bookings', href: '/customer/bookings', icon: CalendarRange },
  { name: 'Payments', href: '/customer/payments', icon: Receipt },
  { name: 'Profile', href: '/customer/profile', icon: User },
];

const mobileNavItems: BottomNavItem[] = [
  { name: 'Home', href: '/customer/dashboard', icon: LayoutDashboard },
  { name: 'Bookings', href: '/customer/bookings', icon: CalendarRange },
  { name: 'Book', href: '/customer/bookings/new', icon: PlusCircle },
  { name: 'Payments', href: '/customer/payments', icon: Receipt },
];

const mobileMoreItems: BottomNavItem[] = [
  { name: 'Profile', href: '/customer/profile', icon: User },
  { name: 'Invoices', href: '/customer/invoices', icon: FileText },
  { name: 'Support', href: '/customer/support', icon: LifeBuoy },
  { name: 'Terms', href: '/terms', icon: FileText },
  { name: 'Privacy', href: '/privacy', icon: Shield },
];

export default function CustomerLayout() {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login/customer');
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar — desktop only. Mobile uses the bottom navigation instead. */}
      <div className="hidden md:flex md:w-64 md:flex-col md:border-r md:border-slate-200 md:bg-white">
        <div className="flex h-16 items-center gap-2 border-b border-slate-100 px-6 font-bold text-brand-900">
          <PlaneTakeoff className="text-brand-600" />
          <span>Mailari Travels</span>
        </div>

        <div className="p-4">
          <Link to="/customer/bookings/new">
            <Button className="w-full flex items-center gap-2">
              <PlusCircle size={18} /> New Booking
            </Button>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1 px-3">
            {navigation.map((item) => {
              const isActive = location.pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center rounded-md px-3 py-2 text-sm font-medium ${
                    isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <item.icon className={`mr-3 h-5 w-5 flex-shrink-0 ${isActive ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-500'}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-slate-100 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-brand-700 font-bold">
              {user?.fullName?.charAt(0) || 'C'}
            </div>
            <div className="overflow-hidden">
              <p className="truncate text-sm font-medium text-slate-900">{user?.fullName || 'Customer'}</p>
              <button onClick={handleLogout} className="text-xs text-slate-500 hover:text-red-600 flex items-center mt-1">
                <LogOut size={12} className="mr-1" /> Sign out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm md:px-6">
          <div className="flex items-center gap-2 font-bold text-brand-900 md:hidden">
            <PlaneTakeoff className="text-brand-600" size={20} />
            <span>Mailari Travels</span>
          </div>

          <div className="ml-auto flex items-center gap-4">
            <NotificationBell />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 pb-24 md:p-6 md:pb-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      <BottomNav items={mobileNavItems} moreItems={mobileMoreItems} onLogout={handleLogout} />
    </div>
  );
}
