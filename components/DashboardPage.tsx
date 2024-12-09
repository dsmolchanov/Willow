"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";

export default function DashboardPage() {
  // Initialize all hooks at the top level
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const [isLoading, setIsLoading] = useState(true);

  // Single useEffect for all initialization logic
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      if (isLoaded && !isSignedIn) {
        await router.replace("/");
      }
      if (mounted) {
        setIsLoading(false);
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, [isLoaded, isSignedIn, router]);

  // Memoize the sign out handler
  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await signOut();
      await router.replace("/");
    } catch (error) {
      console.error('Error signing out:', error);
      setIsLoading(false);
    }
  };

  // Show loading state
  if (isLoading || !isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  // Main render
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <button 
            onClick={handleSignOut}
            disabled={isLoading}
            className={`mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isLoading ? 'Signing out...' : 'Sign Out'}
          </button>
        </div>
      </div>
    </div>
  );
}