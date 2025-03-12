// app/(protected)/profile/edit/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useFirebase } from '@/lib/firebase/firebase-context';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserProfile } from '@/types';
import {
  User,
  Mail,
  Phone,
  Save,
  ChevronRight,
  Home,
  Briefcase,
  Calendar,
} from 'lucide-react';

// Form validation schema
const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z
    .string()
    .email('Please enter a valid email')
    .optional()
    .or(z.literal('')),
  phoneNumber: z
    .string()
    .min(10, 'Phone number must be at least 10 digits')
    .optional()
    .or(z.literal('')),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfileEditPage() {
  const router = useRouter();
  const { userProfile, updateProfile, isProfileComplete, currentUser } =
    useFirebase();
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  // Initialize form with user profile data
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: userProfile?.name || '',
      email: userProfile?.email || '',
      phoneNumber: userProfile?.phoneNumber || '',
    },
  });

  // Update form values when user profile loads
  useEffect(() => {
    if (userProfile) {
      setValue('name', userProfile.name || '');
      setValue('email', userProfile.email || '');
      setValue('phoneNumber', userProfile.phoneNumber || '');
    }
  }, [userProfile, setValue]);

  const onSubmit = async (data: ProfileFormValues) => {
    setLoading(true);
    try {
      // First, check if this is a new user or an existing one with an incomplete profile
      const isNewUserProfile =
        !userProfile?.id || Object.keys(userProfile).length === 0;

      // Update or create the user profile in Firestore
      await updateProfile({
        ...data,
        // Include any additional metadata needed for new users
        ...(isNewUserProfile && {
          createdAt: Date.now(),
          authMethods:
            currentUser?.providerData?.map((provider) => ({
              authMethod: provider.providerId.includes('google')
                ? 'google'
                : 'phone',
              uid: provider.uid,
              linkedAt: Date.now(),
            })) || [],
        }),
      } as Partial<UserProfile>);

      toast.success('Profile updated successfully');

      // If profile is now complete, redirect to dashboard
      if (isProfileComplete) {
        setRedirecting(true);
        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);
      }
    } catch (error) {
      toast.error('Failed to update profile', {
        description:
          error instanceof Error
            ? error.message
            : 'Something went wrong. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <div className="max-w-2xl mx-auto py-10 animate-in">
      <div className="flex flex-col items-center mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Complete Your Profile</h1>
        <p className="text-muted-foreground mb-6 max-w-md">
          Please provide your details so we can personalize your experience
        </p>
        <Avatar className="w-24 h-24 mb-4">
          <AvatarImage
            src={userProfile?.photoURL || ''}
            alt={userProfile?.name || 'User'}
          />
          <AvatarFallback className="text-xl bg-primary text-primary-foreground">
            {userProfile?.name ? getInitials(userProfile.name) : 'U'}
          </AvatarFallback>
        </Avatar>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Update your personal details</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center">
                <User className="w-4 h-4 mr-2" />
                Full Name <span className="text-red-500 ml-1">*</span>
              </Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="John Doe"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center">
                <Mail className="w-4 h-4 mr-2" />
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="your@email.com"
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber" className="flex items-center">
                <Phone className="w-4 h-4 mr-2" />
                Phone Number
              </Label>
              <Input
                id="phoneNumber"
                {...register('phoneNumber')}
                placeholder="+1234567890"
                className={errors.phoneNumber ? 'border-red-500' : ''}
              />
              {errors.phoneNumber && (
                <p className="text-sm text-red-500">
                  {errors.phoneNumber.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Please include country code (e.g., +1 for USA)
              </p>
            </div>

            {/* Future expansion - optional fields */}
            <div className="pt-4 border-t">
              <h3 className="text-sm font-medium mb-4">
                Additional Information (Optional)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" className="justify-start" disabled>
                  <Home className="w-4 h-4 mr-2" />
                  <span>Add Address</span>
                  <ChevronRight className="w-4 h-4 ml-auto" />
                </Button>

                <Button variant="outline" className="justify-start" disabled>
                  <Briefcase className="w-4 h-4 mr-2" />
                  <span>Occupation Details</span>
                  <ChevronRight className="w-4 h-4 ml-auto" />
                </Button>

                <Button variant="outline" className="justify-start" disabled>
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>Date of Birth</span>
                  <ChevronRight className="w-4 h-4 ml-auto" />
                </Button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="flex items-center justify-between w-full">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  router.push(isProfileComplete ? '/dashboard' : '/')
                }
              >
                {isProfileComplete ? 'Skip for now' : 'Cancel'}
              </Button>
              <Button type="submit" disabled={loading || redirecting}>
                {loading
                  ? 'Saving...'
                  : redirecting
                  ? 'Redirecting...'
                  : 'Save Profile'}
                <Save className="ml-2 h-4 w-4" />
              </Button>
            </div>

            {redirecting && (
              <p className="text-sm text-center text-muted-foreground animate-pulse">
                Profile complete! Redirecting to dashboard...
              </p>
            )}
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
