'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  FolderKanban, CheckSquare, Clock, AlertCircle,
  ArrowRight, Shield, Lock, Crown,
} from 'lucide-react';
import { tasksApi, projectsApi, usersApi } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { TaskStatusChart } from '@/components/dashboard/TaskStatusChart';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/context/AuthContext';
import { formatDate, isOverdue, getStatusLabel, getInitials, getAvatarColor, cn } from '@/lib/utils';
import type { DashboardStats, Task, Project, User } from '@/types';

export default function DashboardPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['stats'],
    queryFn: () => tasksApi.stats().then((r) => r.data),
  });

  const { data: recentTasks } = useQuery<Task[]>({
    queryKey: ['tasks', 'recent'],
    queryFn: () => tasksApi.list().then((r) => r.data.slice(0, 5)),
  });

  const { data: projects } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list().then((r) => r.data),
  });

  const { data: allUsers } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => usersApi.list().then((r) => r.data),
    enabled: isAdmin,
  });

  return (
    <>
      <Header
        title={`Welcome back, ${user?.name?.split(' ')[0]}`}
        subtitle={isAdmin ? 'Administrator — full system access' : 'Member — viewing your assigned workspace'}
      />
      <div className="flex-1 p-6 space-y-6">

        {/* Role Context Banner */}
        <div className={cn(
          'flex items-center gap-4 rounded-xl px-5 py-4 border',
          isAdmin
            ? 'bg-amber-50 border-amber-200'
            : 'bg-blue-50 border-blue-200'
        )}>
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', isAdmin ? 'bg-amber-500' : 'bg-blue-500')}>
            {isAdmin ? <Shield className="w-5 h-5 text-white" /> : <Lock className="w-5 h-5 text-white" />}
          </div>
          <div className="flex-1">
            <p className={cn('font-semibold text-sm', isAdmin ? 'text-amber-800' : 'text-blue-800')}>
              {isAdmin ? 'You are logged in as Admin' : 'You are logged in as Member'}
            </p>
            <p className={cn('text-xs mt-0.5', isAdmin ? 'text-amber-600' : 'text-blue-600')}>
              {isAdmin
                ? 'You can see and manage all projects, tasks, and users across the system.'
                : 'You can view and work on projects you have been added to. Contact an admin to join more projects.'}
            </p>
          </div>
          <Badge variant={isAdmin ? 'warning' : 'info'}>
            {isAdmin ? 'Admin' : 'Member'}
          </Badge>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatsCard
            title={isAdmin ? 'All Projects' : 'My Projects'}
            value={statsLoading ? '—' : (stats?.total_projects ?? 0)}
            icon={<FolderKanban className="w-6 h-6" />}
            color="indigo"
            subtitle={isAdmin ? 'System-wide' : 'You are a member of'}
          />
          <StatsCard
            title={isAdmin ? 'All Tasks' : 'Accessible Tasks'}
            value={statsLoading ? '—' : (stats?.total_tasks ?? 0)}
            icon={<CheckSquare className="w-6 h-6" />}
            color="blue"
            subtitle={`${stats?.done_tasks ?? 0} completed`}
          />
          <StatsCard
            title="In Progress"
            value={statsLoading ? '—' : (stats?.in_progress_tasks ?? 0)}
            icon={<Clock className="w-6 h-6" />}
            color="yellow"
            subtitle="Being worked on"
          />
          <StatsCard
            title="Overdue"
            value={statsLoading ? '—' : (stats?.overdue_tasks ?? 0)}
            icon={<AlertCircle className="w-6 h-6" />}
            color="red"
            subtitle="Need attention"
          />
        </div>

        {/* Charts */}
        {stats && <TaskStatusChart stats={stats} />}

        {/* Admin-only: User Overview panel */}
        {isAdmin && allUsers && (
          <div className="bg-white rounded-xl border border-amber-200 shadow-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-amber-100 bg-amber-50 rounded-t-xl">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-600" />
                <h3 className="font-semibold text-amber-800">Admin — User Overview</h3>
                <Badge variant="warning">{allUsers.length} users</Badge>
              </div>
              <span className="text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded-full font-medium">Admin only</span>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {allUsers.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                    <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0', getAvatarColor(u.name))}>
                      {getInitials(u.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-800 truncate flex items-center gap-1">
                        {u.name}
                        {u.role === 'admin' && <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{u.email}</p>
                    </div>
                    <Badge variant={u.role === 'admin' ? 'warning' : 'info'}>{u.role}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Bottom Row: Recent Tasks + Projects */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Tasks */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Recent Tasks</h3>
              <Link href="/tasks" className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-medium">
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {!recentTasks || recentTasks.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-400 text-sm">No tasks yet.</div>
              ) : (
                recentTasks.map((task) => (
                  <div key={task.id} className="px-6 py-3.5 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Due {formatDate(task.due_date)}
                        {isOverdue(task.due_date, task.status) && <span className="text-red-500 ml-1">• Overdue</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={task.priority === 'high' ? 'danger' : task.priority === 'medium' ? 'warning' : 'success'}>
                        {task.priority}
                      </Badge>
                      <Badge variant={task.status === 'done' ? 'success' : task.status === 'in_progress' ? 'info' : 'default'}>
                        {getStatusLabel(task.status)}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Projects */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900">{isAdmin ? 'All Projects' : 'My Projects'}</h3>
                {isAdmin && <Shield className="w-3.5 h-3.5 text-amber-500" />}
              </div>
              <Link href="/projects" className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-medium">
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {!projects || projects.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-400 text-sm">No projects yet.</div>
              ) : (
                projects.slice(0, 5).map((project) => (
                  <Link key={project.id} href={`/projects/${project.id}`}
                    className="px-6 py-3.5 flex items-center gap-3 hover:bg-gray-50 transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                      <FolderKanban className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                        {project.name}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {project.task_count} tasks · {project.members.length + 1} members
                        {isAdmin && project.owner_id !== user?.id && (
                          <span className="ml-1 text-amber-500">· not your project</span>
                        )}
                      </p>
                    </div>
                    <Badge variant={project.status === 'active' ? 'success' : 'default'}>{project.status}</Badge>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
