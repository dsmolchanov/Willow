"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import { useUser } from '@clerk/nextjs';

interface UpdateTraitsButtonProps {
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  showMessage?: boolean; // Whether to show success/error messages
}

/**
 * UpdateTraitsButton - Triggers a manual update of user traits and recalculation of skills
 * 
 * This button allows users or admins to force a recalculation of skills and learning paths
 * based on the user's current traits. Useful when automatic triggers have failed.
 */
export function UpdateTraitsButton({ 
  variant = 'secondary', 
  size = 'default',
  className = '',
  showMessage = true
}: UpdateTraitsButtonProps) {
  const { user, isLoaded } = useUser();
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleUpdate = async () => {
    if (!isLoaded || !user) return;
    
    setIsUpdating(true);
    setMessage(null);
    
    try {
      const response = await fetch('/api/update-user-traits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMessage({ 
          text: 'Successfully updated traits and recalculated skills.',
          type: 'success'
        });
      } else {
        setMessage({ 
          text: data.message || 'Failed to update traits.',
          type: 'error'
        });
      }
    } catch (error) {
      setMessage({ 
        text: error instanceof Error ? error.message : 'An error occurred',
        type: 'error'
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const messageClasses = message?.type === 'success' 
    ? 'text-green-600 text-sm mt-2' 
    : 'text-red-600 text-sm mt-2';

  return (
    <div>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={handleUpdate}
        disabled={isUpdating || !isLoaded || !user}
      >
        {isUpdating ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            <span>Updating...</span>
          </>
        ) : (
          <>
            <RefreshCw className="h-4 w-4 mr-2" />
            <span>Update Traits & Skills</span>
          </>
        )}
      </Button>
      
      {showMessage && message && (
        <div className={messageClasses}>
          {message.text}
        </div>
      )}
    </div>
  );
} 