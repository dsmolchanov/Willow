export type CallStatus = 'unknown' | 'success' | 'failed'

export interface Conversation {
  conversation_id: number
  clerk_id: string | null
  agent_id: string
  elevenlabs_conversation_id: string | null
  start_time: string
  end_time: string | null
  status: CallStatus
  transcript: any | null
  metadata: any | null
  analysis: any | null
  data_collection_results: any | null
}

export interface ConversationListItem {
  conversation_id: number
  start_time: string
  end_time: string | null
  status: CallStatus
  duration: string
  replics_number: number
} 