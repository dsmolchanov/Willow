'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';

interface Recipe {
  id: number;
  title: string;
  ingredients: string[];
  instructions: string[];
}

export default function CookingPage() {
  const supabase = createClientComponentClient();
  const { user } = useUser();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const loadRecipes = async () => {
      try {
        const { data, error: recipesError } = await supabase
          .from('recipes')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (recipesError) {
          setError('Error loading recipes. Please try again later.');
          return;
        }

        setRecipes(data || []);
      } catch (err) {
        console.error('Error in loadRecipes:', err);
        setError('An unexpected error occurred while loading your recipes.');
      } finally {
        setIsLoading(false);
      }
    };

    loadRecipes();
  }, [user, supabase]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading recipes...</div>
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
      <h1 className="text-2xl font-bold mb-6">Your Recipes</h1>
      {recipes.length === 0 ? (
        <div className="text-center text-gray-500">
          No recipes available yet.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => (
            <div
              key={recipe.id}
              className="bg-white/50 dark:bg-black/50 backdrop-blur-sm p-4 rounded-lg shadow"
            >
              <h3 className="font-semibold">{recipe.title}</h3>
              <div className="mt-4">
                <h4 className="font-medium mb-2">Ingredients:</h4>
                <ul className="list-disc list-inside text-sm">
                  {recipe.ingredients.map((ingredient, index) => (
                    <li key={index}>{ingredient}</li>
                  ))}
                </ul>
              </div>
              <div className="mt-4">
                <h4 className="font-medium mb-2">Instructions:</h4>
                <ol className="list-decimal list-inside text-sm">
                  {recipe.instructions.map((instruction, index) => (
                    <li key={index}>{instruction}</li>
                  ))}
                </ol>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 