'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { FolderKanban, Rocket, Globe, Zap, ShoppingBag, Code2, Megaphone, Lightbulb } from 'lucide-react';
import { projectsApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const schema = z.object({
  name: z.string().min(1, 'Project name is required').max(80),
  description: z.string().max(500).optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
}

const PROJECT_ICONS = [
  { icon: Rocket,      color: 'bg-indigo-500',  label: 'Launch'    },
  { icon: Globe,       color: 'bg-blue-500',    label: 'Web'       },
  { icon: Code2,       color: 'bg-violet-500',  label: 'Dev'       },
  { icon: Megaphone,   color: 'bg-pink-500',    label: 'Marketing' },
  { icon: ShoppingBag, color: 'bg-orange-500',  label: 'Commerce'  },
  { icon: Lightbulb,   color: 'bg-yellow-500',  label: 'Ideas'     },
  { icon: Zap,         color: 'bg-green-500',   label: 'Fast'      },
  { icon: FolderKanban,color: 'bg-teal-500',    label: 'General'   },
];

export function CreateProjectModal({ open, onClose }: Props) {
  const queryClient = useQueryClient();
  const [selectedIcon, setSelectedIcon] = useState(0);
  const [descLen, setDescLen] = useState(0);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: (data: FormData) => projectsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      toast.success('Project created successfully!');
      reset();
      setDescLen(0);
      setSelectedIcon(0);
      onClose();
    },
    onError: () => toast.error('Failed to create project. Please try again.'),
  });

  if (!open) return null;

  const SelectedIconComponent = PROJECT_ICONS[selectedIcon].icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* Gradient Header */}
        <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 px-6 pt-6 pb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', PROJECT_ICONS[selectedIcon].color)}>
                <SelectedIconComponent className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">New Project</h2>
                <p className="text-indigo-200 text-xs">Set up your workspace</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-indigo-300 hover:text-white transition-colors text-xl leading-none font-light"
            >✕</button>
          </div>

          {/* Icon Picker */}
          <div>
            <p className="text-xs font-medium text-indigo-200 mb-2 uppercase tracking-wider">Choose an icon</p>
            <div className="flex gap-2 flex-wrap">
              {PROJECT_ICONS.map((item, i) => {
                const Icon = item.icon;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedIcon(i)}
                    title={item.label}
                    className={cn(
                      'w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150',
                      item.color,
                      selectedIcon === i
                        ? 'ring-2 ring-white ring-offset-2 ring-offset-indigo-700 scale-110'
                        : 'opacity-60 hover:opacity-90'
                    )}
                  >
                    <Icon className="w-4 h-4 text-white" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-5">

            {/* Project Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Project Name <span className="text-red-400">*</span>
              </label>
              <input
                {...register('name')}
                placeholder="e.g. Marketing Website Redesign"
                className={cn(
                  'w-full px-4 py-2.5 rounded-xl border text-sm text-gray-900 placeholder:text-gray-400',
                  'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all',
                  errors.name ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50 focus:bg-white'
                )}
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <span>⚠</span> {errors.name.message}
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold text-gray-700">Description</label>
                <span className={cn('text-xs', descLen > 450 ? 'text-red-400' : 'text-gray-400')}>
                  {descLen}/500
                </span>
              </div>
              <textarea
                {...register('description', {
                  onChange: (e) => setDescLen(e.target.value.length),
                })}
                placeholder="What is this project about? What are the goals?"
                rows={3}
                className={cn(
                  'w-full px-4 py-2.5 rounded-xl border text-sm text-gray-900 placeholder:text-gray-400',
                  'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
                  'resize-none transition-all bg-gray-50 focus:bg-white border-gray-200'
                )}
              />
            </div>

            {/* Info strip */}
            <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
              <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                <FolderKanban className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-xs text-indigo-700">
                You will be set as the project <strong>owner</strong> and can add team members after creation.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={mutation.isPending}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold hover:from-indigo-700 hover:to-violet-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-70 flex items-center justify-center gap-2"
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
                  <>
                    <SelectedIconComponent className="w-4 h-4" />
                    Create Project
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
