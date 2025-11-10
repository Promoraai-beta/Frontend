"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import { Copy, CheckCircle, XCircle, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"

interface InvitationsListProps {
  onRefresh?: () => void
}

export function InvitationsList({ onRefresh }: InvitationsListProps) {
  const [invitations, setInvitations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadInvitations()
  }, [])

  const loadInvitations = async () => {
    try {
      const response = await api.get("/api/admin/invitations")
      const data = await response.json()
      if (data.success) {
        setInvitations(data.data || [])
      }
    } catch (error) {
      console.error("Error loading invitations:", error)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert("Copied to clipboard!")
  }

  if (loading) {
    return <div className="text-zinc-400">Loading invitations...</div>
  }

  if (invitations.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-400">
        <p>No invitations created yet</p>
        <p className="text-sm mt-2">Create your first invitation to get started</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {invitations.map((invitation) => (
        <div
          key={invitation.id}
          className="border border-zinc-800 bg-zinc-900/50 rounded-lg p-4 flex items-center justify-between"
        >
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {invitation.usedAt ? (
                <CheckCircle className="h-4 w-4 text-green-400" />
              ) : invitation.expiresAt && new Date(invitation.expiresAt) < new Date() ? (
                <XCircle className="h-4 w-4 text-red-400" />
              ) : (
                <Clock className="h-4 w-4 text-yellow-400" />
              )}
              <span className="text-white font-medium">
                {invitation.email || "Open invitation"}
              </span>
              {invitation.companyName && (
                <span className="text-zinc-400 text-sm">• {invitation.companyName}</span>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-zinc-400">
              <span>Created: {new Date(invitation.createdAt).toLocaleDateString()}</span>
              {invitation.expiresAt && (
                <span>
                  Expires: {new Date(invitation.expiresAt).toLocaleDateString()}
                </span>
              )}
              {invitation.usedAt && (
                <span className="text-green-400">
                  Used: {new Date(invitation.usedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <code className="text-xs bg-zinc-800 px-2 py-1 rounded text-zinc-300">
              {invitation.token.substring(0, 8)}...
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(invitation.invitationUrl)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}

