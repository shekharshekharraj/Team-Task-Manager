'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  LogOut,
  Zap,
  ChevronRight,
  Shield,
  Users,
  Lock,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn, getInitials, getAvatarColor } from '@/lib/utils';

const memberNav = [
  { href: '/dashboard', label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/projects',  label: 'Projects',   icon: FolderKanban    },
  { href: '/tasks',     label: 'My Tasks',   icon: CheckSquare     },
];

const adminNav = [
  { href: '/dashboard', label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/projects',  label: 'All Projects', icon: FolderKanban  },
  { href: '/tasks',     label: 'All Tasks',  icon: CheckSquare     },
  { href: '/admin/users', label: 'User Management', icon: Users, adminOnly: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'admin';
  const navItems = isAdmin ? adminNav : memberNav;

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 flex flex-col bg-[#1e1b4b] text-white z-40">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
        <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="font-bold text-lg tracking-tight">TaskFlow</span>
          <p className="text-xs text-indigo-300 -mt-0.5">Project Manager</p>
        </div>
      </div>

      {/* Role Banner */}
      {isAdmin ? (
        <div className="mx-3 mt-4 flex items-center gap-2 bg-amber-500/15 border border-amber-500/30 rounded-lg px-3 py-2">
          <Shield className="w-4 h-4 text-amber-400 shrink-0" />
          <div>
            <p className="text-xs font-bold text-amber-300">Administrator</p>
            <p className="text-xs text-amber-400/70">Full system access</p>
          </div>
        </div>
      ) : (
        <div className="mx-3 mt-4 flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2">
          <Lock className="w-4 h-4 text-blue-400 shrink-0" />
          <div>
            <p className="text-xs font-bold text-blue-300">Member</p>
            <p className="text-xs text-blue-400/70">Project-scoped access</p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 mt-2">
        <p className="text-xs font-semibold text-indigo-400 uppercase tracking-widest px-3 mb-3">
          Navigation
        </p>
        {navItems.map(({ href, label, icon: Icon, adminOnly }: { href: string; label: string; icon: React.ElementType; adminOnly?: boolean }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group',
                active
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40'
                  : 'text-indigo-200 hover:bg-white/10 hover:text-white'
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="flex-1">{label}</span>
              {adminOnly && !active && (
                <Shield className="w-3.5 h-3.5 text-amber-400 opacity-80" />
              )}
              {active && <ChevronRight className="w-4 h-4 opacity-60" />}
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="px-3 pb-4 border-t border-white/10 pt-4">
        <div className="flex items-center gap-3 px-3 py-3 rounded-lg bg-white/5">
          <div
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0',
              user ? getAvatarColor(user.name) : 'bg-indigo-500'
            )}
          >
            {user ? getInitials(user.name) : '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <div className="flex items-center gap-1 mt-0.5">
              {isAdmin
                ? <Shield className="w-3 h-3 text-amber-400" />
                : <Lock className="w-3 h-3 text-blue-400" />
              }
              <p className="text-xs text-indigo-300 capitalize">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="text-indigo-300 hover:text-white transition-colors p-1 rounded"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
