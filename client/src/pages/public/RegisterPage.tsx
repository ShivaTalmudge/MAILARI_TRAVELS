import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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

const registerSchema = z.object({
  mobile: z.string().length(10, 'Mobile number must be exactly 10 digits'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().min(2, 'Full name is required'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
});

type RegisterValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const draft = useBookingDraftStore((s) => s.draft);
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterValues) => {
    try {
      setIsLoading(true);
      await api.post('/auth/register', data);
      
      toast('Registration successful! Please sign in.', 'success');
      navigate('/login/customer');
    } catch (error: any) {
      toast(error.response?.data?.message || 'Registration failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    try {
      setIsLoading(true);
      const res = await api.post('/auth/google-login', { 
        token: credentialResponse.credential, 
        role: 'CUSTOMER' 
      });
      const { user, token } = res.data.data;
      setAuth(user, token);
      toast(`Welcome, ${user.fullName || 'User'}!`, 'success');
      navigate(draft?.pickupLocation ? '/customer/bookings/new' : `/${user.role.toLowerCase()}/dashboard`);
    } catch (error: any) {
      toast(error.response?.data?.message || 'Google Registration failed. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Create Account</h1>
        <p className="mt-2 text-sm text-slate-600">
          Join Mailari Travels for a premium booking experience.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Full Name *"
          placeholder="John Doe"
          {...register('fullName')}
          error={errors.fullName?.message}
        />

        <Input
          label="Mobile Number *"
          type="tel"
          placeholder="10-digit mobile number"
          {...register('mobile')}
          error={errors.mobile?.message}
        />
        
        <Input
          label="Email (Optional)"
          type="email"
          placeholder="john@example.com"
          {...register('email')}
          error={errors.email?.message}
        />
        
        <Input
          label="Password *"
          type="password"
          placeholder="••••••••"
          {...register('password')}
          error={errors.password?.message}
        />

        <Button type="submit" className="w-full mt-2" isLoading={isLoading}>
          Register
        </Button>
      </form>

      <div className="mt-6">
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-slate-500">Or sign up with</span>
          </div>
        </div>
        
        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => toast('Google Registration failed', 'error')}
            useOneTap
            shape="pill"
          />
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link to="/login/customer" className="font-semibold text-brand-600 hover:text-brand-500">
          Sign in
        </Link>
      </p>
    </div>
  );
}
