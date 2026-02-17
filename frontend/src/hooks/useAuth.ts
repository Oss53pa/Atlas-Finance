import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '@/store/auth';
import { AuthService } from '@/services/auth.service';
import { LoginRequest, RegisterRequest, ChangePasswordRequest, User } from '@/types';

export const useAuth = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user, isAuthenticated, login, logout, updateUser, setLoading } = useAuthStore();

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: AuthService.login,
    onMutate: () => {
      setLoading(true);
    },
    onSuccess: (data) => {
      login(data);
      toast.success(`Welcome back, ${data.user.firstName}!`);
      // Don't navigate here - let the calling component handle navigation
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Login failed');
    },
    onSettled: () => {
      setLoading(false);
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: AuthService.register,
    onMutate: () => {
      setLoading(true);
    },
    onSuccess: (data) => {
      login(data);
      toast.success(`Welcome to BookWise, ${data.user.firstName}!`);
      navigate('/dashboard');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Registration failed');
    },
    onSettled: () => {
      setLoading(false);
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: AuthService.logout,
    onSuccess: () => {
      logout();
      queryClient.clear();
      toast.success('Logged out successfully');
      navigate('/login');
    },
    onError: () => {
      // Even if the API call fails, we should still clear local state
      logout();
      queryClient.clear();
      navigate('/login');
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: AuthService.changePassword,
    onSuccess: () => {
      toast.success('Password changed successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to change password');
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: AuthService.updateProfile,
    onSuccess: (updatedUser: User) => {
      updateUser(updatedUser);
      queryClient.setQueryData(['user', 'profile'], updatedUser);
      toast.success('Profile updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    },
  });

  // Get user profile query
  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['user', 'profile'],
    queryFn: AuthService.getProfile,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Request password reset
  const requestPasswordResetMutation = useMutation({
    mutationFn: (email: string) => AuthService.requestPasswordReset(email),
    onSuccess: () => {
      toast.success('Password reset link sent to your email');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to send password reset email');
    },
  });

  // Reset password
  const resetPasswordMutation = useMutation({
    mutationFn: ({ token, password }: { token: string; password: string }) => 
      AuthService.resetPassword(token, password),
    onSuccess: () => {
      toast.success('Password reset successfully');
      navigate('/login');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to reset password');
    },
  });

  return {
    // State
    user,
    isAuthenticated,
    isLoadingProfile,
    profile,

    // Actions
    login: (credentials: LoginRequest) => loginMutation.mutateAsync(credentials),
    register: (userData: RegisterRequest) => registerMutation.mutateAsync(userData),
    logout: () => logoutMutation.mutate(),
    changePassword: (passwordData: ChangePasswordRequest) => changePasswordMutation.mutate(passwordData),
    updateProfile: (userData: Partial<User>) => updateProfileMutation.mutate(userData),
    requestPasswordReset: (email: string) => requestPasswordResetMutation.mutate(email),
    resetPassword: (token: string, password: string) => resetPasswordMutation.mutate({ token, password }),

    // Loading states
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    isChangingPassword: changePasswordMutation.isPending,
    isUpdatingProfile: updateProfileMutation.isPending,
    isRequestingPasswordReset: requestPasswordResetMutation.isPending,
    isResettingPassword: resetPasswordMutation.isPending,
  };
};