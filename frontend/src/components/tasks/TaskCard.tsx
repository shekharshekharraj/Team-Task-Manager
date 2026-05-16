'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, Calendar, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { tasksApi } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';
import { formatDate, isOverdue, getInitials, getAvatarColor } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { Task } from '@/types';

interface Props {
  task: Task;
  canDelete?: boolean;
  onStatusChange?: (task: Task, newStatus: string) => void;
}

export function TaskCard({ task, canDelete = false, onStatusChange }: Props) {
  const queryClient = useQueryClient();
  const overdue = isOverdue(task.due_date, task.status);

  const deleteMutation = useMutation({
    mutationFn: () => tasksApi.delete(task.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Task deleted');
    },
    onError: () => toast.error('Failed to delete task'),
  });

  const statusMutation = useMutation({
    mutationFn: (newStatus: string) => tasksApi.update(task.id, { status: newStatus }),
    onSuccess: (_, newStatus) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      if (onStatusChange) onStatusChange(task, newStatus);
    },
  });

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this task?')) deleteMutation.mutate();
  };

  const nextStatus = task.status === 'todo' ? 'in_progress' : task.status === 'in_progress' ? 'done' : null;

  return (
    <div
      className={cn(
        'bg-white rounded-xl border p-4 shadow-sm hover:shadow-md transition-all duration-200 group',
        overdue ? 'border-red-200 bg-red-50/30' : 'border-gray-200',
      )}
    >
      {/* Priority indicator */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant={
              task.priority === 'high' ? 'danger' :
              task.priority === 'medium' ? 'warning' : 'success'
            }
          >
            {task.priority}
          </Badge>
          {overdue && <Badge variant="danger">Overdue</Badge>}
        </div>
        {canDelete && (
          <button
            onClick={handleDelete}
            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Title */}
      <h4 className="text-sm font-semibold text-gray-900 mb-1 leading-snug">{task.title}</h4>
      {task.description && (
        <p className="text-xs text-gray-500 mb-3 line-clamp-2">{task.description}</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          {task.assignee ? (
            <div
              className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white',
                getAvatarColor(task.assignee.name)
              )}
              title={task.assignee.name}
            >
              {getInitials(task.assignee.name)}
            </div>
          ) : (
            <User className="w-4 h-4 text-gray-300" />
          )}
          {task.due_date && (
            <span className={cn('text-xs flex items-center gap-1', overdue ? 'text-red-500' : 'text-gray-400')}>
              <Calendar className="w-3 h-3" />
              {formatDate(task.due_date)}
            </span>
          )}
        </div>
        {nextStatus && (
          <button
            onClick={() => statusMutation.mutate(nextStatus)}
            disabled={statusMutation.isPending}
            className="text-xs text-indigo-600 hover:text-indigo-700 font-medium hover:underline transition-colors"
          >
            → {nextStatus === 'in_progress' ? 'Start' : 'Complete'}
          </button>
        )}
      </div>
    </div>
  );
}
