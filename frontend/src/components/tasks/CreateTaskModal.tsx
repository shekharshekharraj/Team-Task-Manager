'use client';

import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Calendar, User, ChevronDown, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { tasksApi, usersApi } from '@/lib/api';
import { getInitials, getAvatarColor, cn } from '@/lib/utils';
import type { User as UserType } from '@/types';

const schema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional(),
  assignee_id: z.string().optional(),
  status: z.enum(['todo', 'in_progress', 'done']),
  priority: z.enum(['low', 'medium', 'high']),
  due_date: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: string;
  defaultStatus?: string;
}

const PRIORITIES = [
  {
    value: 'low',
    label: 'Low',
    color: 'border-green-200 bg-green-50 text-green-700',
    active: 'border-green-500 bg-green-500 text-white shadow-lg shadow-green-200',
    dot: 'bg-green-500',
  },
  {
    value: 'medium',
    label: 'Medium',
    color: 'border-yellow-200 bg-yellow-50 text-yellow-700',
    active: 'border-yellow-500 bg-yellow-500 text-white shadow-lg shadow-yellow-200',
    dot: 'bg-yellow-500',
  },
  {
    value: 'high',
    label: 'High',
    color: 'border-red-200 bg-red-50 text-red-700',
    active: 'border-red-500 bg-red-500 text-white shadow-lg shadow-red-200',
    dot: 'bg-red-500',
  },
];

const STATUSES = [
  { value: 'todo',        label: 'To Do',       icon: '○', color: 'border-gray-200 bg-gray-50 text-gray-600',   active: 'border-gray-500 bg-gray-600 text-white' },
  { value: 'in_progress', label: 'In Progress',  icon: '◑', color: 'border-blue-200 bg-blue-50 text-blue-600',   active: 'border-blue-500 bg-blue-600 text-white'  },
  { value: 'done',        label: 'Done',         icon: '●', color: 'border-green-200 bg-green-50 text-green-600', active: 'border-green-500 bg-green-600 text-white' },
];

export function CreateTaskModal({ open, onClose, projectId, defaultStatus = 'todo' }: Props) {
  const queryClient = useQueryClient();
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const [descLen, setDescLen] = useState(0);

  const { data: users } = useQuery<UserType[]>({
    queryKey: ['users'],
    queryFn: () => usersApi.list().then((r) => r.data),
    enabled: open,
  });

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      status: defaultStatus as 'todo' | 'in_progress' | 'done',
      priority: 'medium',
      assignee_id: '',
    },
  });

  const watchedAssignee = watch('assignee_id');
  const watchedPriority = watch('priority');
  const watchedStatus = watch('status');
  const selectedUser = users?.find((u) => u.id === watchedAssignee);

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      tasksApi.create({
        ...data,
        project_id: projectId,
        assignee_id: data.assignee_id || undefined,
        due_date: data.due_date || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Task created!');
      reset();
      setDescLen(0);
      onClose();
    },
    onError: () => toast.error('Failed to create task'),
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Create New Task</h2>
              <p className="text-slate-400 text-xs mt-0.5">Fill in the details to add a task to this project</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors text-xl leading-none">✕</button>
          </div>
        </div>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))}>
          <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">

            {/* Task Title */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Task Title <span className="text-red-400">*</span>
              </label>
              <input
                {...register('title')}
                placeholder="What needs to be done?"
                autoFocus
                className={cn(
                  'w-full px-4 py-2.5 rounded-xl border text-sm text-gray-900 placeholder:text-gray-400',
                  'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all',
                  errors.title ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50 focus:bg-white'
                )}
              />
              {errors.title && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.title.message}
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold text-gray-700">Description</label>
                <span className={cn('text-xs', descLen > 900 ? 'text-red-400' : 'text-gray-400')}>
                  {descLen}/1000
                </span>
              </div>
              <textarea
                {...register('description', { onChange: (e) => setDescLen(e.target.value.length) })}
                placeholder="Add more context, steps, or acceptance criteria..."
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none transition-all"
              />
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Priority</label>
              <Controller
                name="priority"
                control={control}
                render={({ field }) => (
                  <div className="flex gap-2">
                    {PRIORITIES.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => field.onChange(p.value)}
                        className={cn(
                          'flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-sm font-semibold transition-all duration-150',
                          field.value === p.value ? p.active : p.color
                        )}
                      >
                        <span className={cn('w-2 h-2 rounded-full', field.value === p.value ? 'bg-white' : p.dot)} />
                        {p.label}
                      </button>
                    ))}
                  </div>
                )}
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <div className="flex gap-2">
                    {STATUSES.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => field.onChange(s.value)}
                        className={cn(
                          'flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-sm font-semibold transition-all duration-150',
                          field.value === s.value ? s.active : s.color
                        )}
                      >
                        <span className="text-base leading-none">{s.icon}</span>
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
              />
            </div>

            {/* Assignee + Due Date */}
            <div className="grid grid-cols-2 gap-4">

              {/* Assignee Picker */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Assign To</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setAssigneeOpen(!assigneeOpen)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-white hover:border-indigo-300 transition-all text-sm"
                  >
                    {selectedUser ? (
                      <>
                        <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0', getAvatarColor(selectedUser.name))}>
                          {getInitials(selectedUser.name)}
                        </div>
                        <span className="flex-1 text-left text-gray-800 font-medium truncate">{selectedUser.name}</span>
                      </>
                    ) : (
                      <>
                        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                          <User className="w-3.5 h-3.5 text-gray-400" />
                        </div>
                        <span className="flex-1 text-left text-gray-400">Unassigned</span>
                      </>
                    )}
                    <ChevronDown className={cn('w-4 h-4 text-gray-400 transition-transform', assigneeOpen && 'rotate-180')} />
                  </button>

                  {assigneeOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setAssigneeOpen(false)} />
                      <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                        <button
                          type="button"
                          onClick={() => { setValue('assignee_id', ''); setAssigneeOpen(false); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-500 hover:bg-gray-50 transition-colors border-b border-gray-100"
                        >
                          <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                            <User className="w-3.5 h-3.5 text-gray-400" />
                          </div>
                          Unassigned
                        </button>
                        {users?.map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => { setValue('assignee_id', u.id); setAssigneeOpen(false); }}
                            className={cn(
                              'w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-indigo-50 transition-colors',
                              watchedAssignee === u.id && 'bg-indigo-50'
                            )}
                          >
                            <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0', getAvatarColor(u.name))}>
                              {getInitials(u.name)}
                            </div>
                            <div className="text-left min-w-0">
                              <p className="font-medium text-gray-800 truncate">{u.name}</p>
                              <p className="text-xs text-gray-400 truncate">{u.email}</p>
                            </div>
                            {watchedAssignee === u.id && <CheckCircle2 className="w-4 h-4 text-indigo-500 ml-auto shrink-0" />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Due Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="date"
                    {...register('due_date')}
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Summary strip */}
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
              <div className={cn('w-2.5 h-2.5 rounded-full shrink-0', PRIORITIES.find(p => p.value === watchedPriority)?.dot ?? 'bg-gray-400')} />
              <p className="text-xs text-slate-500 flex-1">
                <span className="font-medium text-slate-700 capitalize">{watchedPriority} priority</span>
                {' · '}
                <span className="capitalize">{watchedStatus?.replace('_', ' ')}</span>
                {selectedUser && <> · Assigned to <span className="font-medium text-slate-700">{selectedUser.name}</span></>}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-slate-800 to-indigo-700 text-white text-sm font-semibold hover:from-slate-900 hover:to-indigo-800 transition-all shadow-lg disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {mutation.isPending ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Creating...
                </>
              ) : (
                <>Create Task <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
