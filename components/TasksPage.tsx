"use client";

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface Task {
  id: number;
  title: string;
  description: string;
  status: string;
}

export default function TasksPage() {
  const supabase = createClientComponentClient();
  const { user } = useUser();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const loadTasks = async () => {
      try {
        const { data, error: tasksError } = await supabase
          .from('tasks')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (tasksError) {
          setError('Error loading tasks. Please try again later.');
          return;
        }

        setTasks(data || []);
      } catch (err) {
        console.error('Error in loadTasks:', err);
        setError('An unexpected error occurred while loading your tasks.');
      } finally {
        setIsLoading(false);
      }
    };

    loadTasks();
  }, [user, supabase]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading tasks...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <h1 className="text-2xl font-bold mb-6">Your Tasks</h1>
      {tasks.length === 0 ? (
        <div className="text-center text-gray-500">
          No tasks available. Complete some conversations to get tasks.
        </div>
      ) : (
        <div className="grid gap-4">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="bg-white/50 dark:bg-black/50 backdrop-blur-sm p-4 rounded-lg shadow"
            >
              <h3 className="font-semibold">{task.title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                {task.description}
              </p>
              <div className="mt-2">
                <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded">
                  {task.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
