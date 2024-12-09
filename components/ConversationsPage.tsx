"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"

export default function ConversationsPage() {
  const router = useRouter()
  const { isLoaded, isSignedIn } = useUser()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace("/")
    }
    setIsLoading(false)
  }, [isLoaded, isSignedIn, router])

  if (isLoading || !isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900">Conversations</h1>
          {/* Add your conversations content here */}
        </div>
      </div>
    </div>
  )
} 