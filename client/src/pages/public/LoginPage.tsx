import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { useAuthStore } from '../../features/auth/authStore';
import { useBookingDraftStore } from '../../features/booking/bookingDraftStore';
import { useToast } from '../../hooks/useToast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import api from '../../services/api';

const loginSchema = z.object({
  identifier: z.string().min(3, 'Please enter your mobile number or email'),
  password: z.string().min(6, 'Password is required'),
});

type LoginValues = z.infer<typeof loginSchema>;

const ROLE_CONFIG = {
  customer: { label: 'Customer', placeholder: 'Mobile number or email', desc: 'Access your bookings, invoices and profile' },
  driver: { label: 'Driver', placeholder: 'Mobile number', desc: 'View your trips and manage your schedule' },
  admin: { label: 'Administrator', placeholder: 'Mobile number or email', desc: 'Manage fleet, bookings and operations' },
} as const;

export default function LoginPage() {
  const { role } = useParams<{ role: string }>();
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const draft = useBookingDraftStore((s) => s.draft);
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const postLoginRedirect = (userRole: string) => {
    if (userRole === 'CUSTOMER' && draft?.pickupLocation) {
      navigate('/customer/bookings/new');
    } else {
      navigate(`/${userRole.toLowerCase()}/dashboard`);
    }
  };

  const roleKey = (role as keyof typeof ROLE_CONFIG) || 'customer';
  const roleConfig = ROLE_CONFIG[roleKey] || ROLE_CONFIG.customer;
  const roleValue = roleKey.toUpperCase();

  const { register, handleSubmit, formState: { errors } } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginValues) => {
    try {
      setIsLoading(true);
      const res = await api.post('/auth/login', { identifier: data.identifier, password: data.password, role: roleValue });
      const { user, token } = res.data.data;
      setAuth(user, token);
      toast(`Welcome back, ${user.fullName || 'User'}!`, 'success');
      postLoginRedirect(user.role);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast(err.response?.data?.message || 'Invalid credentials. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    try {
      setIsLoading(true);
      const res = await api.post('/auth/google-login', { 
        token: credentialResponse.credential, 
        role: roleValue 
      });
      const { user, token } = res.data.data;
      setAuth(user, token);
      toast(`Welcome back, ${user.fullName || 'User'}!`, 'success');
      postLoginRedirect(user.role);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast(err.response?.data?.message || 'Google Login failed. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">{roleConfig.label} Sign In</h1>
        <p className="mt-2 text-sm text-slate-500">{roleConfig.desc}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Input
          label="Mobile Number or Email"
          type="text"
          id="identifier"
          placeholder={roleConfig.placeholder}
          autoComplete="username"
          {...register('identifier')}
          error={errors.identifier?.message}
        />

        <Input
          label="Password"
          type="password"
          id="password"
          placeholder="Enter your password"
          autoComplete="current-password"
          {...register('password')}
          error={errors.password?.message}
        />

        <div className="flex items-center justify-end">
          <Link
            to={`/forgot-password`}
            className="text-sm font-medium text-brand-600 hover:text-brand-500 transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" size="lg" className="w-full" isLoading={isLoading}>
          Sign In to {roleConfig.label} Portal
        </Button>
      </form>

      {roleKey === 'customer' && (
        <div className="mt-6">
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-slate-500">Or continue with</span>
            </div>
          </div>
          
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => toast('Google Login failed', 'error')}
              useOneTap
              shape="pill"
            />
          </div>
        </div>
      )}

      {roleKey === 'customer' && (
        <p className="mt-8 text-center text-sm text-slate-600">
          New to Mailari Travels?{' '}
          <Link to="/register" className="font-semibold text-brand-600 hover:text-brand-500 transition-colors">
            Create an account
          </Link>
        </p>
      )}

      <div className="mt-10 pt-6 border-t border-slate-100">
        <p className="text-xs text-center text-slate-400 mb-4 font-medium uppercase tracking-wider">Other Portals</p>
        <div className="flex justify-center gap-6">
          {roleKey !== 'customer' && (
            <Link to="/login/customer" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-600 transition-colors">
              Customer Login
            </Link>
          )}
          {roleKey !== 'driver' && (
            <Link to="/login/driver" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-600 transition-colors">
              Driver Login
            </Link>
          )}
          {roleKey !== 'admin' && (
            <Link to="/login/admin" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-600 transition-colors">
              Admin Login
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
