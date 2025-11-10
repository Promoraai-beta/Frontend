"use client"

import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { api } from "@/lib/api"
import { AnimatedBackground } from "@/components/animated-background"
import { Users, Briefcase, FileText, Building, Mail, TrendingUp, Clock, CheckCircle } from "lucide-react"
import { CreateInvitationModal } from "@/components/admin/create-invitation-modal"
import { InvitationsList } from "@/components/admin/invitations-list"

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [inviteModalOpen, setInviteModalOpen] = useState(false)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const response = await api.get("/api/admin/stats")
      const data = await response.json()
      if (data.success) {
        setStats(data.data)
      }
    } catch (error) {
      console.error("Error loading stats:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  return (
    <ProtectedRoute requiredRole="admin">
      <div className="min-h-screen bg-black relative">
        <AnimatedBackground />
        <div className="relative z-10 container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
            <p className="text-zinc-400">Manage users, invitations, and platform insights</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="bg-zinc-950 border-zinc-800">
              <CardHeader className="pb-2">
                <CardDescription className="text-zinc-400">Total Users</CardDescription>
                <CardTitle className="text-3xl font-bold text-white">{stats?.users?.total || 0}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1 text-blue-400">
                    <Users className="h-4 w-4" />
                    <span>{stats?.users?.candidates || 0} Candidates</span>
                  </div>
                  <div className="flex items-center gap-1 text-emerald-400">
                    <Briefcase className="h-4 w-4" />
                    <span>{stats?.users?.recruiters || 0} Recruiters</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-950 border-zinc-800">
              <CardHeader className="pb-2">
                <CardDescription className="text-zinc-400">Onboarding</CardDescription>
                <CardTitle className="text-3xl font-bold text-white">
                  {stats?.users?.candidatesOnboarded || 0} / {stats?.users?.candidates || 0}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1 text-zinc-400">
                    <CheckCircle className="h-4 w-4" />
                    <span>{stats?.users?.recruitersOnboarded || 0} Recruiters</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-950 border-zinc-800">
              <CardHeader className="pb-2">
                <CardDescription className="text-zinc-400">Sessions</CardDescription>
                <CardTitle className="text-3xl font-bold text-white">{stats?.sessions?.total || 0}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1 text-green-400">
                    <CheckCircle className="h-4 w-4" />
                    <span>{stats?.sessions?.completed || 0} Completed</span>
                  </div>
                  <div className="flex items-center gap-1 text-yellow-400">
                    <Clock className="h-4 w-4" />
                    <span>{stats?.sessions?.active || 0} Active</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-950 border-zinc-800">
              <CardHeader className="pb-2">
                <CardDescription className="text-zinc-400">Assessments</CardDescription>
                <CardTitle className="text-3xl font-bold text-white">{stats?.assessments?.total || 0}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1 text-purple-400">
                    <TrendingUp className="h-4 w-4" />
                    <span>{stats?.assessments?.thisMonth || 0} This Month</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Additional Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card className="bg-zinc-950 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Companies
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">{stats?.companies?.total || 0}</div>
                <p className="text-sm text-zinc-400 mt-2">Total companies registered</p>
              </CardContent>
            </Card>

            <Card className="bg-zinc-950 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Invitations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">{stats?.invitations?.total || 0}</div>
                <div className="flex gap-4 mt-2 text-sm">
                  <span className="text-green-400">{stats?.invitations?.used || 0} Used</span>
                  <span className="text-yellow-400">{stats?.invitations?.pending || 0} Pending</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-950 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">New Users (7d)</span>
                    <span className="text-white font-bold">{stats?.activity?.recentUsers || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">New Sessions (7d)</span>
                    <span className="text-white font-bold">{stats?.activity?.recentSessions || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Invitations Section */}
          <Card className="bg-zinc-950 border-zinc-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">Invitation Management</CardTitle>
                  <CardDescription className="text-zinc-400">
                    Create and manage recruiter invitation links
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setInviteModalOpen(true)}
                  className="bg-white text-black hover:bg-zinc-200"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Create Invitation
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <InvitationsList onRefresh={loadStats} />
            </CardContent>
          </Card>
        </div>

        <CreateInvitationModal
          open={inviteModalOpen}
          onOpenChange={setInviteModalOpen}
          onSuccess={loadStats}
        />
      </div>
    </ProtectedRoute>
  )
}

