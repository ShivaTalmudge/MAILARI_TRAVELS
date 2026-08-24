import { Link } from 'react-router-dom';
import { brand } from '../../config/brand';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-950 text-slate-300 border-t border-slate-900 pt-16 pb-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          
          {/* Brand Column */}
          <div className="lg:pr-8">
            <Link to="/" className="inline-block text-2xl font-bold tracking-tight text-white mb-6">
              <span className="text-brand-500">MAILARI</span> TRAVELS
            </Link>
            <p className="text-sm leading-relaxed text-slate-400 mb-6">
              {brand.tagline}. We provide reliable, safe, and comfortable outstation and local travel experiences across India.
            </p>
            <div className="text-sm">
              <p className="flex items-center mb-2">
                <span className="font-semibold text-white mr-2">Email:</span> {brand.supportEmail}
              </p>
              <p className="flex items-center">
                <span className="font-semibold text-white mr-2">Phone:</span> {brand.supportPhone}
              </p>
            </div>
          </div>

          {/* Services Column */}
          <div>
            <h4 className="text-white font-semibold mb-6 uppercase tracking-wider text-sm">Our Services</h4>
            <ul className="space-y-3 text-sm">
              <li><Link to="/services/local" className="hover:text-brand-400 transition-colors">Local City Travel</Link></li>
              <li><Link to="/services/outstation" className="hover:text-brand-400 transition-colors">Outstation Taxi</Link></li>
              <li><Link to="/services/airport" className="hover:text-brand-400 transition-colors">Airport Transfers</Link></li>
              <li><Link to="/services/corporate" className="hover:text-brand-400 transition-colors">Corporate Travel</Link></li>
              <li><Link to="/services/group" className="hover:text-brand-400 transition-colors">Group Travel</Link></li>
              <li><Link to="/services/events" className="hover:text-brand-400 transition-colors">Wedding & Events</Link></li>
            </ul>
          </div>

          {/* Company Column */}
          <div>
            <h4 className="text-white font-semibold mb-6 uppercase tracking-wider text-sm">Company</h4>
            <ul className="space-y-3 text-sm">
              <li><Link to="/about" className="hover:text-brand-400 transition-colors">About Us</Link></li>
              <li><Link to="/contact" className="hover:text-brand-400 transition-colors">Contact</Link></li>
              <li><Link to="/#faq" className="hover:text-brand-400 transition-colors">FAQ</Link></li>
              <li><Link to="/terms" className="hover:text-brand-400 transition-colors">Terms & Conditions</Link></li>
              <li><Link to="/privacy" className="hover:text-brand-400 transition-colors">Privacy Policy</Link></li>
              <li><Link to="/cancellation" className="hover:text-brand-400 transition-colors">Cancellation Policy</Link></li>
            </ul>
          </div>

          {/* Customer Column */}
          <div>
            <h4 className="text-white font-semibold mb-6 uppercase tracking-wider text-sm">Customer</h4>
            <ul className="space-y-3 text-sm">
              <li><Link to="/book" className="hover:text-brand-400 transition-colors text-brand-300 font-medium">Book a Trip</Link></li>
              <li><Link to="/customer/bookings" className="hover:text-brand-400 transition-colors">My Bookings</Link></li>
              <li><Link to="/login/customer" className="hover:text-brand-400 transition-colors">Login / Register</Link></li>
              <li><Link to="/login/driver" className="hover:text-brand-400 transition-colors">Driver Partner Login</Link></li>
              <li><Link to="/support" className="hover:text-brand-400 transition-colors">Help & Support</Link></li>
            </ul>
          </div>

        </div>

        <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <p>&copy; {currentYear} {brand.name}. All rights reserved.</p>
          <div className="flex space-x-6">
            <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link to="/cancellation" className="hover:text-white transition-colors">Cancellation</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
