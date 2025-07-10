// app/auth/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { z } from 'zod';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useFirebase } from '@/lib/firebase/firebase-context';
import { PhoneIcon, ArrowRightIcon, CheckIcon, KeyIcon } from 'lucide-react';
import { isProfileComplete as checkProfileCompletion } from '@/lib/firebase/utils/user';
// Form validation schemas
const phoneSchema = z.object({
  phoneNumber: z.string().min(10, 'Enter a valid phone number').max(15),
});

const otpSchema = z.object({
  otp: z.string().min(6, 'OTP must be 6 digits').max(6),
});

export default function AuthPage() {
  const router = useRouter();
  const {
    loginWithGoogle,
    initiatePhoneLogin,
    verifyOtp,
    currentUser,
    isProfileComplete,
  } = useFirebase();

  // Form states
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verificationId, setVerificationId] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => {
    if (currentUser && !loading) {
      // Redirect based on profile completion
      if (!isProfileComplete) {
        // Call this when a new user signs up
        router.push('/profile/edit');
      } else {
        router.push('/dashboard');
      }
    }
  }, [currentUser, isProfileComplete, router, loading]);
  // Format phone number
  const formatPhoneNumber = (value: string) => {
    // Remove non-digit characters
    const phoneDigits = value.replace(/\D/g, '');

    // Make sure it starts with + if there's content
    if (phoneDigits.length > 0) {
      return `+${phoneDigits}`;
    }
    return '';
  };

  // Handle phone number change
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhoneNumber(formatPhoneNumber(e.target.value));
  };

  // Handle send OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      // Validate phone number
      phoneSchema.parse({ phoneNumber });

      // Send OTP
      const verId = await initiatePhoneLogin(phoneNumber);
      setVerificationId(verId);

      setOtpSent(true);

      toast.success('OTP sent to your phone', {
        description: 'Please enter the verification code you received',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            formattedErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(formattedErrors);
      } else if (error instanceof Error) {
        toast.error('Failed to send OTP', {
          description:
            error.message || 'Something went wrong. Please try again.',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      // Validate OTP
      otpSchema.parse({ otp });

      // Verify OTP
      const { userProfile } = await verifyOtp(verificationId, otp);

      toast.success(
        !isProfileComplete ? 'Account created successfully!' : 'Welcome back!',
        {
          description: "You've successfully logged in",
        }
      );
      if (!checkProfileCompletion(userProfile)) {
        toast.success('Account created! Please complete your profile.');
        router.push('/profile/edit');
      } else {
        toast.success('Welcome back!');
        router.push('/dashboard');
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            formattedErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(formattedErrors);
      } else if (error instanceof Error) {
        toast.error('Failed to verify OTP', {
          description: error.message || 'Invalid OTP. Please try again.',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Google login
  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const { userProfile } = await loginWithGoogle();
      toast.success("Welcome! You've successfully logged in with Google.");
      if (!checkProfileCompletion(userProfile)) {
        toast.success('Account created! Please complete your profile.');
        router.push('/profile/edit');
      } else {
        toast.success('Welcome back!');
        router.push('/dashboard');
      }
    } catch (error) {
      // Don't show error for redirect cases
      if (error instanceof Error && error.message === 'Redirect initiated') {
        toast.info('Redirecting to Google...', {
          description: 'Please complete the sign-in process in the new window.',
        });
        return;
      }

      toast.error('Login failed', {
        description:
          error instanceof Error
            ? error.message
            : 'Something went wrong. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left side decorative panel */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-primary/90 to-primary-foreground p-12 items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-4xl font-bold mb-6 text-white">
            Budget Smarter, Live Better
          </h1>
          <p className="text-lg text-white/80 mb-8">
            Take control of your financial journey with our personal finance
            app. Track expenses, set budgets, and reach your financial goals.
          </p>
          <div className="relative h-64 w-full rounded-xl overflow-hidden shadow-2xl">
            {/* Replace with your app screenshot or illustration */}
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center">
              <span className="text-white text-xl font-medium">
                App Preview
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side auth forms */}
      <div className="flex-1 p-6 md:p-12 flex items-center justify-center">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              Welcome to Zeno
            </h2>
            <p className="mt-2 text-muted-foreground">
              Your personal finance journey starts here
            </p>
          </div>

          <Tabs defaultValue="phone" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="phone">Phone Login</TabsTrigger>
              <TabsTrigger value="google">Google Login</TabsTrigger>
            </TabsList>

            <TabsContent value="phone" className="space-y-6">
              {!otpSent ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Phone Number</Label>
                    <div className="relative">
                      <Input
                        id="phoneNumber"
                        type="tel"
                        placeholder="+1234567890"
                        value={phoneNumber}
                        onChange={handlePhoneChange}
                        className={`pl-10 ${
                          errors.phoneNumber ? 'border-red-500' : ''
                        }`}
                      />
                      <PhoneIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    </div>
                    {errors.phoneNumber && (
                      <p className="text-sm text-red-500">
                        {errors.phoneNumber}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Please enter your phone number with country code (e.g., +1
                      for USA)
                    </p>
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Sending OTP...' : 'Send OTP'}
                    <ArrowRightIcon className="ml-2 h-4 w-4" />
                  </Button>

                  {/* Invisible reCAPTCHA container */}
                  <div id="recaptcha-container"></div>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="otp">Verification Code</Label>
                    <div className="relative">
                      <Input
                        id="otp"
                        type="text"
                        placeholder="123456"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        className={`pl-10 ${
                          errors.otp ? 'border-red-500' : ''
                        }`}
                        maxLength={6}
                      />
                      <KeyIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    </div>
                    {errors.otp && (
                      <p className="text-sm text-red-500">{errors.otp}</p>
                    )}
                  </div>

                  <div className="flex justify-between items-center">
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline"
                      onClick={() => setOtpSent(false)}
                    >
                      Change number
                    </button>
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Verifying...' : 'Verify & Continue'}
                    <CheckIcon className="ml-2 h-4 w-4" />
                  </Button>
                </form>
              )}
            </TabsContent>

            <TabsContent value="google" className="space-y-6">
              <div className="text-center p-6">
                <p className="mb-4">
                  Sign in with your Google account quickly and securely
                </p>
                <Button
                  type="button"
                  className="w-full"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  {loading ? 'Signing in...' : 'Sign in with Google'}
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          <div className="mt-6 text-center text-sm">
            <Link href="/" className="text-primary hover:underline">
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
