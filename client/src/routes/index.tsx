import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import PublicLayout from '../layouts/PublicLayout';
import AuthLayout from '../layouts/AuthLayout';
import AdminLayout from '../layouts/AdminLayout';
import CustomerLayout from '../layouts/CustomerLayout';
import DriverLayout from '../layouts/DriverLayout';

// Public Pages
import LandingPage from '../pages/public/LandingPage';
import ContactPage from '../pages/public/ContactPage';
import LoginPage from '../pages/public/LoginPage';
import RegisterPage from '../pages/public/RegisterPage';
import TermsPage from '../pages/public/TermsPage';
import PrivacyPage from '../pages/public/PrivacyPage';
import CancellationPage from '../pages/public/CancellationPage';

// Admin Pages
import AdminDashboard from '../pages/admin/AdminDashboard';
import AdminBookings from '../pages/admin/AdminBookings';
import AdminCustomers from '../pages/admin/AdminCustomers';
import AdminDrivers from '../pages/admin/AdminDrivers';
import AdminVehicles from '../pages/admin/AdminVehicles';
import AdminSettings from '../pages/admin/AdminSettings';
import AdminPricing from '../pages/admin/AdminPricing';
import AdminReports from '../pages/admin/AdminReports';
import AdminAuditLogs from '../pages/admin/AdminAuditLogs';

// Customer Pages
import CustomerDashboard from '../pages/customer/CustomerDashboard';
import CustomerBookings from '../pages/customer/CustomerBookings';
import NewBooking from '../pages/customer/NewBooking';
import CustomerProfile from '../pages/customer/CustomerProfile';
import CustomerPayments from '../pages/customer/CustomerPayments';
import CustomerInvoices from '../pages/customer/CustomerInvoices';
import CustomerSupport from '../pages/customer/CustomerSupport';

// Driver Pages
import DriverDashboard from '../pages/driver/DriverDashboard';
import DriverTrips from '../pages/driver/DriverTrips';
import DriverTripDetail from '../pages/driver/DriverTripDetail';
import DriverVehicle from '../pages/driver/DriverVehicle';
import DriverProfile from '../pages/driver/DriverProfile';
import DriverEarnings from '../pages/driver/DriverEarnings';
import DriverDocuments from '../pages/driver/DriverDocuments';
import DriverSupport from '../pages/driver/DriverSupport';



export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/cancellation" element={<CancellationPage />} />
      </Route>

      {/* Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login/:role" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* Admin Routes */}
      <Route path="/admin" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="bookings" element={<AdminBookings />} />
        <Route path="customers" element={<AdminCustomers />} />
        <Route path="drivers" element={<AdminDrivers />} />
        <Route path="vehicles" element={<AdminVehicles />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="pricing" element={<AdminPricing />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="audit-logs" element={<AdminAuditLogs />} />
      </Route>

      {/* Customer Routes */}
      <Route path="/customer" element={<ProtectedRoute allowedRoles={['CUSTOMER']}><CustomerLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/customer/dashboard" replace />} />
        <Route path="dashboard" element={<CustomerDashboard />} />
        <Route path="bookings" element={<CustomerBookings />} />
        <Route path="bookings/new" element={<NewBooking />} />
        <Route path="profile" element={<CustomerProfile />} />
        <Route path="payments" element={<CustomerPayments />} />
        <Route path="invoices" element={<CustomerInvoices />} />
        <Route path="support" element={<CustomerSupport />} />
      </Route>

      {/* Driver Routes */}
      <Route path="/driver" element={<ProtectedRoute allowedRoles={['DRIVER']}><DriverLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/driver/dashboard" replace />} />
        <Route path="dashboard" element={<DriverDashboard />} />
        <Route path="trips" element={<DriverTrips />} />
        <Route path="trips/:id" element={<DriverTripDetail />} />
        <Route path="vehicle" element={<DriverVehicle />} />
        <Route path="profile" element={<DriverProfile />} />
        <Route path="earnings" element={<DriverEarnings />} />
        <Route path="documents" element={<DriverDocuments />} />
        <Route path="support" element={<DriverSupport />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
