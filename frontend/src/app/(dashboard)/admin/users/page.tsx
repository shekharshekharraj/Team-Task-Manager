'use client';

import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Shield, Crown, Users, Mail, Calendar } from 'lucide-react';
import { usersApi } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/context/AuthContext';
import { getInitials, getAvatarColor, formatDate, cn } from '@/lib/utils';
import type { User } from '@/types';

export default function AdminUsersPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Redirect non-admins away
  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.replace('/dashboard');
    }
  }, [user, router]);

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => usersApi.list().then((r) => r.data),
    enabled: user?.role === 'admin',
  });

  if (user?.role !== 'admin') return null;

  const admins  = users?.filter((u) => u.role === 'admin')  ?? [];
  const members = users?.filter((u) => u.role === 'member') ?? [];

  return (
    <>
      <Header
        title="User Management"
        subtitle="All registered users across the system"
      />
      <div className="flex-1 p-6 space-y-6">

        {/* Admin-only notice */}
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-800">Admin-only page</p>
            <p className="text-xs text-amber-600 mt-0.5">
              This page is only visible to users with the Admin role. Members cannot access this page.
            </p>
          </div>
          <Badge variant="warning" className="ml-auto shrink-0">Admin</Badge>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{users?.length ?? '—'}</p>
              <p className="text-sm text-gray-500">Total Users</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-amber-200 shadow-sm p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-amber-500 flex items-center justify-center shrink-0">
              <Crown className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{admins.length}</p>
              <p className="text-sm text-gray-500">Administrators</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-blue-200 shadow-sm p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-blue-500 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{members.length}</p>
              <p className="text-sm text-gray-500">Members</p>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">All Users</h3>
            <span className="text-xs text-gray-400">{users?.length ?? 0} total</span>
          </div>

          {isLoading ? (
            <div className="divide-y divide-gray-50">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="px-6 py-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gray-100 animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-100 rounded animate-pulse w-1/3" />
                    <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {users?.map((u) => (
                <div
                  key={u.id}
                  className={cn(
                    'px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors',
                    u.id === user.id && 'bg-indigo-50/50'
                  )}
                >
                  {/* Avatar */}
                  <div className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0',
                    getAvatarColor(u.name)
                  )}>
                    {getInitials(u.name)}
                  </div>

                  {/* Name + Email */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      {u.name}
                      {u.id === user.id && (
                        <span className="text-xs text-indigo-500 font-medium">(you)</span>
                      )}
                      {u.role === 'admin' && (
                        <Crown className="w-3.5 h-3.5 text-amber-500" />
                      )}
                    </p>
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                      <Mail className="w-3 h-3" />
                      {u.email}
                    </p>
                  </div>

                  {/* Joined */}
                  <div className="hidden sm:flex items-center gap-1 text-xs text-gray-400">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(u.created_at)}
                  </div>

                  {/* Role Badge */}
                  <Badge variant={u.role === 'admin' ? 'warning' : 'info'}>
                    {u.role}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
