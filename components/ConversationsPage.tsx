"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/lib/database.types"

type UserConversation = Database['public']['Tables']['user_conversations']['Row']

export default function ConversationsPage() {
  const router = useRouter()
  const { isLoaded, isSignedIn, user } = useUser()
  const [conversations, setConversations] = useState<UserConversation[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const supabase = createClientComponentClient<Database>()

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace("/")
    }
  }, [isLoaded, isSignedIn, router])

  useEffect(() => {
    async function fetchConversations() {
      if (!user?.id) return

      try {
        const { data, error } = await supabase
          .from('user_conversations')
          .select('*')
          .eq('clerk_id', user.id)
          .order('start_time', { ascending: false })

        if (error) throw error
        setConversations(data || [])
      } catch (error) {
        console.error('Error fetching conversations:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (user) {
      fetchConversations()
    }
  }, [user, supabase])

  if (!isLoaded || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading conversations...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Conversations</h1>
          {conversations.length === 0 ? (
            <p className="text-gray-600">No conversations yet.</p>
          ) : (
            <div className="space-y-4">
              {conversations.map((conversation) => (
                <div
                  key={conversation.conversation_id}
                  className="bg-white shadow rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        Conversation with {conversation.agent_id}
                      </h3>
                      <p className="text-gray-500 text-sm mt-1">
                        {new Date(conversation.start_time).toLocaleString()}
                      </p>
                      <p className="text-gray-600 text-sm mt-2">
                        Status: <span className="capitalize">{conversation.status}</span>
                      </p>
                      {conversation.duration > 0 && (
                        <p className="text-gray-600 text-sm">
                          Duration: {Math.floor(conversation.duration / 60)}m {conversation.duration % 60}s
                        </p>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {conversation.replics_number} replies
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 