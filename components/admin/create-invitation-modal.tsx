"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/api"
import { Loader2, Copy, CheckCircle } from "lucide-react"

interface CreateInvitationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CreateInvitationModal({ open, onOpenChange, onSuccess }: CreateInvitationModalProps) {
  const [email, setEmail] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [expiresInDays, setExpiresInDays] = useState(30)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [createdInvitation, setCreatedInvitation] = useState<any>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const response = await api.post("/api/admin/invitations", {
        email: email || undefined,
        companyName: companyName || undefined,
        expiresInDays
      })

      const data = await response.json()

      if (data.success) {
        setCreatedInvitation(data.data.invitation)
        if (onSuccess) {
          onSuccess()
        }
      } else {
        setError(data.error || "Failed to create invitation")
      }
    } catch (err: any) {
      console.error("Error creating invitation:", err)
      setError(err.message || "Failed to create invitation")
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert("Copied to clipboard!")
  }

  const handleClose = () => {
    setEmail("")
    setCompanyName("")
    setExpiresInDays(30)
    setError("")
    setCreatedInvitation(null)
    onOpenChange(false)
  }

  if (createdInvitation) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <CheckCircle className="h-5 w-5 text-emerald-400" />
              Invitation Created Successfully!
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Share this invitation link with the recruiter
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-zinc-300 mb-2 block">Invitation URL</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={createdInvitation.invitationUrl}
                  readOnly
                  className="bg-zinc-900 border-zinc-800 text-white"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(createdInvitation.invitationUrl)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-zinc-300 mb-1 block text-sm">Email</Label>
                <p className="text-white">{createdInvitation.email || "Open invitation"}</p>
              </div>
              <div>
                <Label className="text-zinc-300 mb-1 block text-sm">Company</Label>
                <p className="text-white">{createdInvitation.companyName || "Not specified"}</p>
              </div>
              <div>
                <Label className="text-zinc-300 mb-1 block text-sm">Expires</Label>
                <p className="text-white">
                  {new Date(createdInvitation.expiresAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            <Button onClick={handleClose} className="w-full bg-white text-black hover:bg-zinc-200">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Create Recruiter Invitation</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Generate an invitation link for a new recruiter
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email" className="text-zinc-300">
              Email (Optional)
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="recruiter@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-zinc-900 border-zinc-800 text-white"
            />
            <p className="text-xs text-zinc-500 mt-1">
              Leave empty for an open invitation
            </p>
          </div>

          <div>
            <Label htmlFor="companyName" className="text-zinc-300">
              Company Name (Optional)
            </Label>
            <Input
              id="companyName"
              type="text"
              placeholder="Acme Inc."
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="bg-zinc-900 border-zinc-800 text-white"
            />
          </div>

          <div>
            <Label htmlFor="expiresInDays" className="text-zinc-300">
              Expires In (days)
            </Label>
            <Input
              id="expiresInDays"
              type="number"
              min="1"
              max="365"
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(parseInt(e.target.value) || 30)}
              className="bg-zinc-900 border-zinc-800 text-white"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black hover:bg-zinc-200"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Invitation"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

