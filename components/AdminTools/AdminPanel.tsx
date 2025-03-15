"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RecoverConversationButton } from './RecoverConversationButton';
import { UpdateTraitsButton } from './UpdateTraitsButton';
import { AlertCircle } from 'lucide-react';

/**
 * AdminPanel - A component for administrative operations
 * 
 * This panel provides access to various admin tools for managing
 * user traits, skills, and recovering from system failures.
 */
export function AdminPanel() {
  const [activeTab, setActiveTab] = useState('traits');
  
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Admin Tools</CardTitle>
        <CardDescription>
          Tools for troubleshooting and managing the application
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-4 flex items-start">
          <AlertCircle className="h-5 w-5 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-amber-800">
            <p className="font-medium mb-1">These tools are for administrative use</p>
            <p>Use these tools to recover from system failures or to manually trigger calculations. 
            Normal users should not need to use these tools as the system should handle everything automatically.</p>
          </div>
        </div>
        
        <Tabs defaultValue="traits" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="traits">Update Traits & Skills</TabsTrigger>
            <TabsTrigger value="conversation">Recover Conversation</TabsTrigger>
          </TabsList>
          
          <TabsContent value="traits" className="mt-4">
            <div className="p-4 border rounded-lg">
              <h3 className="text-lg font-medium mb-2">Update User Traits</h3>
              <p className="text-sm text-gray-600 mb-4">
                This will use your existing traits to recalculate your skills and learning paths. 
                Use this if your dashboard isn't showing the expected skills or learning paths.
              </p>
              
              <UpdateTraitsButton />
            </div>
          </TabsContent>
          
          <TabsContent value="conversation" className="mt-4">
            <RecoverConversationButton />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 