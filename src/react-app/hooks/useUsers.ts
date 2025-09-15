import { useState, useEffect, useCallback } from 'react';
import { useApi } from './useApi';
import { AppUser } from '@/shared/types';

export function useUsers() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const { request, loading, error } = useApi();

  const fetchUsers = useCallback(async () => {
    try {
      const data = await request('/api/users');
      setUsers(data.users);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  }, [request]);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const data = await request('/api/users/me');
      setCurrentUser(data.app_user);
    } catch (err) {
      console.error('Failed to fetch current user:', err);
    }
  }, [request]);

  const createUser = useCallback(async (userData: { email: string; name?: string; role: string }) => {
    try {
      const data = await request('/api/users', {
        method: 'POST',
        body: userData,
      });
      await fetchUsers(); // Refresh the list
      return data.user;
    } catch (err) {
      console.error('Failed to create user:', err);
      throw err;
    }
  }, [request, fetchUsers]);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  return {
    users,
    currentUser,
    loading,
    error,
    fetchUsers,
    fetchCurrentUser,
    createUser,
  };
}
