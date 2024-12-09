'use client'

import { useEffect, useState } from 'react'
import { useUser, useAuth } from '@clerk/nextjs'
import type { ConversationListItem } from '@/lib/types'
import { formatDistanceToNow, formatDuration, intervalToDuration } from 'date-fns'
import { createClerkSupabaseClient } from '@/lib/supabaseClient'

export default function ConversationsPage() {
  const { user } = useUser()
  const { getToken } = useAuth()
  const [conversations, setConversations] = useState<ConversationListItem[]>([])

  useEffect(() => {
    async function fetchConversations() {
      if (!user?.id) return

      const session = {
        getToken: getToken
      }
      
      const supabase = createClerkSupabaseClient(session)

      const { data, error } = await supabase
        .from('user_conversations')
        .select(`
          conversation_id,
          start_time,
          end_time,
          status,
          transcript
        `)
        .eq('clerk_id', user.id)
        .order('start_time', { ascending: false })

      if (error) {
        console.error('Error fetching conversations:', error)
        return
      }

      const conversationsWithMetrics = data.map(conv => {
        const duration = conv.end_time 
          ? intervalToDuration({
              start: new Date(conv.start_time),
              end: new Date(conv.end_time)
            })
          : null

        const replicsCount = conv.transcript 
          ? Array.isArray(conv.transcript) 
            ? conv.transcript.length 
            : 0
          : 0

        return {
          conversation_id: conv.conversation_id,
          start_time: conv.start_time,
          end_time: conv.end_time,
          status: conv.status,
          duration: duration ? formatDuration(duration, { format: ['minutes', 'seconds'] }) : '--:--',
          replics_number: replicsCount
        }
      })

      setConversations(conversationsWithMetrics)
    }

    fetchConversations()
  }, [user?.id, getToken])

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Conversations</h1>
      <div className="rounded-lg border border-gray-200">
        <div className="grid grid-cols-5 gap-4 border-b border-gray-200 bg-gray-50 p-4 font-medium">
          <div>Time</div>
          <div>Status</div>
          <div>Duration</div>
          <div>Replies</div>
          <div>Actions</div>
        </div>
        {conversations.map((conv) => (
          <div
            key={conv.conversation_id}
            className="grid grid-cols-5 gap-4 border-b border-gray-200 p-4 last:border-0"
          >
            <div className="flex flex-col text-gray-600">
              <span className="text-sm font-medium text-gray-900">
                {new Date(conv.start_time).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
              <span className="text-xs">
                {formatDistanceToNow(new Date(conv.start_time), { addSuffix: true })}
              </span>
            </div>
            <div>
              <span
                className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                  conv.status === 'success'
                    ? 'bg-green-100 text-green-800'
                    : conv.status === 'failed'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {conv.status}
              </span>
            </div>
            <div>{conv.duration}</div>
            <div>{conv.replics_number}</div>
            <div>
              <button className="text-blue-600 hover:text-blue-800">View Details</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 