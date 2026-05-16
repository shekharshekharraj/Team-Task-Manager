'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { FolderKanban, Users, CheckSquare, Trash2, MoreVertical } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { projectsApi } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';
import type { Project } from '@/types';

interface Props {
  project: Project;
  currentUserId: string;
  userRole: string;
}

export function ProjectCard({ project, currentUserId, userRole }: Props) {
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);

  const isOwner = project.owner_id === currentUserId;
  const canDelete = userRole === 'admin' || isOwner;

  const deleteMutation = useMutation({
    mutationFn: () => projectsApi.delete(project.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      toast.success('Project deleted');
    },
    onError: () => toast.error('Failed to delete project'),
  });

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm(`Delete "${project.name}"? This will also delete all tasks.`)) {
      deleteMutation.mutate();
    }
    setMenuOpen(false);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-200 group">
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <FolderKanban className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <Link href={`/projects/${project.id}`}>
                <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                  {project.name}
                </h3>
              </Link>
              <p className="text-xs text-gray-400 mt-0.5">by {project.owner?.name ?? 'Unknown'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={project.status === 'active' ? 'success' : 'default'}>
              {project.status}
            </Badge>
            {canDelete && (
              <div className="relative">
                <button
                  onClick={(e) => { e.preventDefault(); setMenuOpen(!menuOpen); }}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 top-8 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[130px]">
                      <button
                        onClick={handleDelete}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {project.description && (
          <p className="text-sm text-gray-500 mb-4 line-clamp-2">{project.description}</p>
        )}

        <div className="flex items-center gap-4 text-xs text-gray-400 pt-3 border-t border-gray-100">
          <span className="flex items-center gap-1.5">
            <CheckSquare className="w-3.5 h-3.5" />
            {project.task_count} task{project.task_count !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            {project.members.length + 1} member{project.members.length !== 0 ? 's' : ''}
          </span>
          <span className="ml-auto">Created {formatDate(project.created_at)}</span>
        </div>
      </div>
    </div>
  );
}
