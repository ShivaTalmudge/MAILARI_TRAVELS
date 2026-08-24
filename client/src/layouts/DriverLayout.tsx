import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../features/auth/authStore';
import {
  LayoutDashboard, Map, Car, User, LogOut, PlaneTakeoff, Wallet, FileText, LifeBuoy
} from 'lucide-react';
import { NotificationBell } from '../components/ui/NotificationBell';
import { BottomNav, type BottomNavItem } from '../components/ui/BottomNav';

const navigation = [
  { name: 'Dashboard', href: '/driver/dashboard', icon: LayoutDashboard },
  { name: 'My Trips', href: '/driver/trips', icon: Map },
  { name: 'My Vehicle', href: '/driver/vehicle', icon: Car },
  { name: 'Earnings', href: '/driver/earnings', icon: Wallet },
  { name: 'Profile', href: '/driver/profile', icon: User },
];

const mobileNavItems: BottomNavItem[] = [
  { name: 'Home', href: '/driver/dashboard', icon: LayoutDashboard },
  { name: 'Trips', href: '/driver/trips', icon: Map },
  { name: 'Vehicle', href: '/driver/vehicle', icon: Car },
  { name: 'Earnings', href: '/driver/earnings', icon: Wallet },
];

const mobileMoreItems: BottomNavItem[] = [
  { name: 'Documents', href: '/driver/documents', icon: FileText },
  { name: 'Profile', href: '/driver/profile', icon: User },
  { name: 'Support', href: '/driver/support', icon: LifeBuoy },
];

export default function DriverLayout() {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login/driver');
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar — desktop only. Mobile uses the bottom navigation instead. */}
      <div className="hidden md:flex md:w-64 md:flex-col md:bg-brand-900 md:text-brand-100">
        <div className="flex h-16 items-center gap-2 bg-brand-950 px-6 font-bold text-white">
          <PlaneTakeoff className="text-brand-400" />
          <span>Driver Portal</span>
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
                    isActive ? 'bg-brand-700 text-white' : 'hover:bg-brand-800 hover:text-white'
                  }`}
                >
                  <item.icon className={`mr-3 h-5 w-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-brand-300 group-hover:text-white'}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="bg-brand-950 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-700 text-white font-bold">
              {user?.fullName?.charAt(0) || 'D'}
            </div>
            <div className="overflow-hidden">
              <p className="truncate text-sm font-medium text-white">{user?.fullName || 'Driver'}</p>
              <button onClick={handleLogout} className="text-xs text-brand-300 hover:text-white flex items-center mt-1">
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
            <span>Driver Portal</span>
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
