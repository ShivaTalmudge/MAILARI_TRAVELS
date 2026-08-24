import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Button } from '../ui/Button';

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Services', path: '/#services' },
    { name: 'Fleet', path: '/#fleet' },
    { name: 'Corporate', path: '/#corporate' },
    { name: 'About', path: '/#about' },
    { name: 'Contact', path: '/#contact' },
  ];

  const isHomePage = location.pathname === '/';
  const isSolid = !isHomePage || isScrolled;
  const headerBgClass = isSolid ? 'bg-slate-900 shadow-md' : 'bg-transparent';
  const headerTextClass = isSolid ? 'text-brand-50' : 'text-white';

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${headerBgClass}`}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link to="/" className={`text-2xl font-bold tracking-tight ${headerTextClass}`}>
              <span className="text-brand-500">MAILARI</span> TRAVELS
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.path}
                className={`text-sm font-medium hover:text-brand-400 transition-colors ${headerTextClass}`}
              >
                {link.name}
              </a>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-4">
            <Link to="/login/customer" className={`text-sm font-medium hover:text-brand-400 ${headerTextClass}`}>
              Login
            </Link>
            <Link to="/book">
              <Button className="bg-brand-500 hover:bg-brand-600 text-white font-semibold px-6 py-2 rounded-md">
                Book a Trip
              </Button>
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`p-2 rounded-md focus:outline-none ${headerTextClass}`}
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-slate-900 shadow-xl border-t border-slate-800 overflow-y-auto max-h-[calc(100vh-80px)]">
          <div className="px-4 pt-2 pb-6 space-y-1">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.path}
                className="block px-3 py-3 text-base font-medium text-slate-300 hover:text-brand-400 hover:bg-slate-800 rounded-md"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.name}
              </a>
            ))}
            
            <div className="pt-4 mt-2 border-t border-slate-800 flex flex-col space-y-3 px-3">
              <Link to="/book" onClick={() => setIsMobileMenuOpen(false)}>
                <Button className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold">
                  Book a Trip
                </Button>
              </Link>
              <Link to="/login/customer" onClick={() => setIsMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full border-slate-700 text-slate-300 hover:text-white">
                  Customer Login
                </Button>
              </Link>
            </div>
            
            {/* Other Portals for Mobile */}
            <div className="pt-6 mt-4 border-t border-slate-800 px-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Partner & Staff Portals</p>
              <div className="flex flex-col space-y-2">
                <Link to="/login/driver" onClick={() => setIsMobileMenuOpen(false)} className="text-sm text-slate-400 hover:text-brand-400 transition-colors">
                  Driver Login
                </Link>
                <Link to="/login/admin" onClick={() => setIsMobileMenuOpen(false)} className="text-sm text-slate-400 hover:text-brand-400 transition-colors">
                  Admin Login
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
