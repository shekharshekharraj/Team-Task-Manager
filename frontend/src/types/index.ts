export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'member';
  created_at: string;
}

export interface ProjectMember {
  user_id: string;
  role: 'admin' | 'member';
  user?: User;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  owner_id: string;
  members: ProjectMember[];
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
  task_count: number;
  owner?: User;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  project_id: string;
  assignee_id: string | null;
  created_by: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  created_at: string;
  updated_at: string;
  assignee?: User;
  creator?: User;
}

export interface AuthTokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface DashboardStats {
  total_projects: number;
  total_tasks: number;
  todo_tasks: number;
  in_progress_tasks: number;
  done_tasks: number;
  overdue_tasks: number;
}

export interface ProjectCreate {
  name: string;
  description?: string;
}

export interface TaskCreate {
  title: string;
  description?: string;
  project_id: string;
  assignee_id?: string;
  status?: Task['status'];
  priority?: Task['priority'];
  due_date?: string;
}

export interface TaskUpdate {
  title?: string;
  description?: string;
  assignee_id?: string;
  status?: Task['status'];
  priority?: Task['priority'];
  due_date?: string;
}
