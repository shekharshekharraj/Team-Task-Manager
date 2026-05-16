'use client';

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { TaskCard } from './TaskCard';
import { CreateTaskModal } from './CreateTaskModal';
import { Button } from '@/components/ui/Button';
import type { Task } from '@/types';

interface Column {
  key: Task['status'];
  label: string;
  color: string;
  dot: string;
}

const COLUMNS: Column[] = [
  { key: 'todo', label: 'To Do', color: 'bg-gray-100 border-gray-200', dot: 'bg-gray-400' },
  { key: 'in_progress', label: 'In Progress', color: 'bg-blue-50 border-blue-200', dot: 'bg-blue-500' },
  { key: 'done', label: 'Done', color: 'bg-green-50 border-green-200', dot: 'bg-green-500' },
];

interface Props {
  tasks: Task[];
  projectId: string;
  canCreate?: boolean;
  canDelete?: boolean;
}

export function TaskKanban({ tasks, projectId, canCreate = true, canDelete = false }: Props) {
  const [createModal, setCreateModal] = useState<{ open: boolean; status: string }>({
    open: false,
    status: 'todo',
  });

  const getColumnTasks = (status: Task['status']) =>
    tasks.filter((t) => t.status === status);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUMNS.map((col) => {
          const colTasks = getColumnTasks(col.key);
          return (
            <div key={col.key} className={`rounded-xl border ${col.color} p-4`}>
              {/* Column Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
                  <span className="text-sm font-semibold text-gray-700">{col.label}</span>
                  <span className="text-xs bg-white border border-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full font-medium">
                    {colTasks.length}
                  </span>
                </div>
                {canCreate && (
                  <button
                    onClick={() => setCreateModal({ open: true, status: col.key })}
                    className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Tasks */}
              <div className="space-y-3 min-h-[100px]">
                {colTasks.length === 0 ? (
                  <div className="flex items-center justify-center h-20 border-2 border-dashed border-gray-200 rounded-lg">
                    <p className="text-xs text-gray-400">No tasks</p>
                  </div>
                ) : (
                  colTasks.map((task) => (
                    <TaskCard key={task.id} task={task} canDelete={canDelete} />
                  ))
                )}
              </div>

              {/* Add task button */}
              {canCreate && (
                <button
                  onClick={() => setCreateModal({ open: true, status: col.key })}
                  className="mt-3 w-full flex items-center gap-2 text-xs text-gray-400 hover:text-indigo-600 py-2 px-3 hover:bg-white rounded-lg transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add task
                </button>
              )}
            </div>
          );
        })}
      </div>

      <CreateTaskModal
        open={createModal.open}
        onClose={() => setCreateModal({ open: false, status: 'todo' })}
        projectId={projectId}
        defaultStatus={createModal.status}
      />
    </>
  );
}
