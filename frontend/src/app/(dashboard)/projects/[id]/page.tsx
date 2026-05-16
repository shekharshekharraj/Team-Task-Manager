'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Users, UserPlus, Trash2,
  Crown, Kanban, Shield, Lock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { projectsApi, tasksApi, usersApi } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { TaskKanban } from '@/components/tasks/TaskKanban';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Input';
import { useAuth } from '@/context/AuthContext';
import { getInitials, getAvatarColor, cn } from '@/lib/utils';
import type { Project, Task, User } from '@/types';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('member');

  const { data: project, isLoading } = useQuery<Project>({
    queryKey: ['project', id],
    queryFn: () => projectsApi.get(id).then((r) => r.data),
  });

  const { data: tasks } = useQuery<Task[]>({
    queryKey: ['tasks', id],
    queryFn: () => tasksApi.list({ project_id: id }).then((r) => r.data),
  });

  const { data: allUsers } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => usersApi.list().then((r) => r.data),
    enabled: addMemberOpen,
  });

  const addMemberMutation = useMutation({
    mutationFn: () => projectsApi.addMember(id, selectedUserId, selectedRole),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      toast.success('Member added!');
      setAddMemberOpen(false);
      setSelectedUserId('');
    },
    onError: () => toast.error('Failed to add member'),
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => projectsApi.removeMember(id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      toast.success('Member removed');
    },
    onError: () => toast.error('Failed to remove member'),
  });

  if (isLoading) {
    return (
      <>
        <Header title="Loading..." />
        <div className="flex-1 p-6 space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </>
    );
  }

  if (!project) return null;

  const currentUserId = user?.id ?? '';
  const isOwner = project.owner_id === currentUserId;
  const isGlobalAdmin = user?.role === 'admin';
  const isProjectAdmin = isOwner || isGlobalAdmin ||
    project.members.some((m) => m.user_id === currentUserId && m.role === 'admin');
  const isJustMember = !isProjectAdmin;

  const existingIds = new Set([project.owner_id, ...project.members.map((m) => m.user_id)]);
  const availableUsers = allUsers?.filter((u) => !existingIds.has(u.id)) ?? [];

  const allMembers = [
    { user_id: project.owner_id, role: 'owner' as const, user: project.owner },
    ...project.members,
  ];

  return (
    <>
      <Header title={project.name} subtitle={project.description || 'No description'} />
      <div className="flex-1 p-6 space-y-5">

        {/* Back + Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <button
            onClick={() => router.push('/projects')}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors w-fit"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Projects
          </button>
          <div className="flex items-center gap-2">
            <Badge variant={project.status === 'active' ? 'success' : 'default'}>{project.status}</Badge>
            {isProjectAdmin ? (
              <button
                onClick={() => setAddMemberOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
              >
                <Shield className="w-3.5 h-3.5" />
                <UserPlus className="w-3.5 h-3.5" />
                Add Member
                <span className="bg-amber-400/50 text-amber-100 text-xs px-1.5 py-0.5 rounded-full ml-1">Admin</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-400 text-xs font-medium rounded-lg border border-gray-200">
                <Lock className="w-3.5 h-3.5" />
                Member View
              </div>
            )}
          </div>
        </div>

        {/* Team Panel */}
        <div className={cn(
          'bg-white rounded-xl border shadow-sm p-5',
          isProjectAdmin ? 'border-amber-200' : 'border-gray-200'
        )}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-400" />
              <h3 className="font-semibold text-gray-900">Team ({allMembers.length})</h3>
            </div>
            {isProjectAdmin && (
              <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full font-medium">
                <Shield className="w-3 h-3" /> Admin controls active
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            {allMembers.map((member) => {
              const isMe = member.user_id === currentUserId;
              return (
                <div
                  key={member.user_id}
                  className={cn(
                    'flex items-center gap-2.5 rounded-xl px-3 py-2 border',
                    isMe
                      ? 'bg-indigo-50 border-indigo-200'
                      : member.role === 'owner'
                      ? 'bg-amber-50 border-amber-200'
                      : 'bg-gray-50 border-gray-200'
                  )}
                >
                  <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0', member.user ? getAvatarColor(member.user.name) : 'bg-gray-400')}>
                    {member.user ? getInitials(member.user.name) : '?'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 flex items-center gap-1">
                      {member.user?.name ?? member.user_id}
                      {isMe && <span className="text-xs text-indigo-500">(you)</span>}
                      {member.role === 'owner' && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                      {member.role === 'admin' && <Shield className="w-3.5 h-3.5 text-amber-400" />}
                    </p>
                    <p className={cn(
                      'text-xs capitalize font-medium',
                      member.role === 'owner' ? 'text-amber-600' :
                      member.role === 'admin' ? 'text-amber-500' : 'text-gray-400'
                    )}>
                      {member.role}
                    </p>
                  </div>
                  {/* Only admins see remove button; members see nothing */}
                  {isProjectAdmin && member.role !== 'owner' && !isMe ? (
                    <button
                      onClick={() => { if (confirm('Remove this member?')) removeMemberMutation.mutate(member.user_id); }}
                      className="ml-1 p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove member (Admin only)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  ) : !isProjectAdmin && !isMe ? (
                    <Lock className="w-3 h-3 text-gray-300 ml-1" />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        {/* Kanban */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Kanban className="w-5 h-5 text-gray-400" />
              <h3 className="font-semibold text-gray-900">Tasks ({tasks?.length ?? 0})</h3>
            </div>
            {isJustMember && (
              <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg">
                <Lock className="w-3 h-3" />
                You can create tasks · delete is admin-only
              </div>
            )}
            {isProjectAdmin && (
              <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
                <Shield className="w-3 h-3" />
                Admin — can delete any task
              </div>
            )}
          </div>
          <TaskKanban
            tasks={tasks ?? []}
            projectId={id}
            canCreate={true}
            canDelete={isProjectAdmin}
          />
        </div>
      </div>

      {/* Add Member Modal */}
      <Modal
        open={addMemberOpen}
        onClose={() => setAddMemberOpen(false)}
        title="Add Team Member"
        subtitle="Admin action — choose a user and assign their project role"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
            <Shield className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-xs text-amber-700">
              <strong>Admin:</strong> can manage members and delete tasks. <strong>Member:</strong> can create and update their own tasks.
            </p>
          </div>
          <Select
            label="Select user"
            options={[
              { value: '', label: 'Choose a user...' },
              ...availableUsers.map((u) => ({ value: u.id, label: `${u.name} (${u.email})` })),
            ]}
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
          />
          <Select
            label="Role in project"
            options={[
              { value: 'member', label: 'Member — can create & update own tasks' },
              { value: 'admin',  label: 'Admin — can manage members & delete tasks' },
            ]}
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
          />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setAddMemberOpen(false)}>Cancel</Button>
            <Button
              className="flex-1"
              disabled={!selectedUserId}
              loading={addMemberMutation.isPending}
              onClick={() => addMemberMutation.mutate()}
            >
              Add Member
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
