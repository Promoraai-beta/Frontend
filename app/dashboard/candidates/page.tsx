"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Search, Filter, MapPin, TrendingUp, Award, Eye, Mail } from "lucide-react"
import Link from "next/link"
import { publicCandidates } from "@/lib/profile-mock-data"
import { RecruiterNavbar } from "@/components/dashboard/recruiter-navbar"
import { ProtectedRoute } from "@/components/protected-route"
import { AnimatedBackground } from "@/components/animated-background"
import { InviteCandidateModal } from "@/components/dashboard/invite-candidate-modal"

export default function CandidateSearch() {
  const [searchQuery, setSearchQuery] = useState("")
  const [minPromptIQ, setMinPromptIQ] = useState(0)
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [selectedCandidate, setSelectedCandidate] = useState<{ id?: string; name: string; email: string } | null>(null)

  const filteredCandidates = publicCandidates.filter((candidate) => {
    const matchesSearch =
      candidate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.skills.some((skill) => skill.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesPromptIQ = candidate.promptIQScore >= minPromptIQ

    return matchesSearch && matchesPromptIQ
  })

  const handleInviteCandidate = (candidate: any) => {
    setSelectedCandidate({
      id: candidate.id,
      name: candidate.name,
      email: candidate.email || `${candidate.name.toLowerCase().replace(/\s+/g, '.')}@example.com`
    })
    setInviteModalOpen(true)
  }

  return (
    <ProtectedRoute requiredRole="recruiter">
      <div className="relative min-h-screen bg-black">
        <AnimatedBackground />

        <RecruiterNavbar />

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8 pt-20 md:pt-24 lg:pt-28">
          {/* Hero */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 text-center">
            <h1 className="mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-4xl font-bold text-transparent">
              Find Top AI-Fluent Candidates
            </h1>
            <p className="text-lg text-zinc-400">
              Search public profiles and discover candidates with proven PromptIQ scores
            </p>
          </motion.div>

          {/* Search and Filters */}
          <div className="mb-8 space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search by name, role, or skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/40 py-3 pl-12 pr-4 text-white placeholder-zinc-500 backdrop-blur-sm focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>

            {/* Simplified Filters */}
            <div className="rounded-xl border border-white/10 bg-black/40 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="h-4 w-4 text-zinc-400" />
                <span className="text-sm font-medium text-zinc-300">Filters</span>
              </div>

              <div className="space-y-4">
                {/* PromptIQ Filter */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-zinc-300">Minimum PromptIQ Score</label>
                    <span className="text-sm font-bold text-white bg-blue-500/20 px-2 py-1 rounded">{minPromptIQ}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-500">0</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={minPromptIQ}
                      onChange={(e) => setMinPromptIQ(Number.parseInt(e.target.value))}
                      className="flex-1 h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                    <span className="text-xs text-zinc-500">100</span>
                  </div>
                </div>

                {/* Info text about search */}
                <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3">
                  <p className="text-xs text-zinc-300">
                    💡 <strong>Tip:</strong> Use the search bar above to find candidates by name, role, or specific skills. Skills are searchable but not shown as filters since they're dynamic and user-generated.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Results Count */}
          <div className="mb-6 text-sm text-zinc-400">Found {filteredCandidates.length} candidates</div>

          {/* Candidates Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredCandidates.map((candidate, index) => (
              <motion.div
                key={candidate.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className="group relative overflow-hidden rounded-xl border border-white/10 bg-black/40 p-6 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-black/60"
              >
                {/* Profile Header */}
                <div className="mb-4 flex items-start gap-4">
                  <img
                    src={candidate.avatar || "/placeholder.svg"}
                    alt={candidate.name}
                    className="h-16 w-16 rounded-full border-2 border-white/20"
                  />
                  <div className="flex-1">
                    <h3 className="mb-1 text-lg font-bold text-white">{candidate.name}</h3>
                    <p className="mb-2 text-sm text-zinc-400">{candidate.title}</p>
                    <div className="flex items-center gap-1 text-xs text-zinc-500">
                      <MapPin className="h-3 w-3" />
                      {candidate.location}
                    </div>
                  </div>
                </div>

                {/* Stats with numbers on top */}
                <div className="mb-4 grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-blue-500/10 p-3 text-center">
                    <p className="mb-1 text-2xl font-bold text-white">{candidate.promptIQScore}</p>
                    <p className="text-xs text-zinc-400">PromptIQ</p>
                  </div>
                  <div className="rounded-lg bg-yellow-500/10 p-3 text-center">
                    <p className="mb-1 text-2xl font-bold text-white">{(candidate.totalPoints / 1000).toFixed(1)}k</p>
                    <p className="text-xs text-zinc-400">Points</p>
                  </div>
                  <div className="rounded-lg bg-purple-500/10 p-3 text-center">
                    <p className="mb-1 text-2xl font-bold text-white">{candidate.assessmentsCompleted}</p>
                    <p className="text-xs text-zinc-400">Tests</p>
                  </div>
                </div>

                {/* Skills */}
                <div className="mb-4 flex flex-wrap gap-2">
                  {candidate.skills.slice(0, 3).map((skill) => (
                    <span key={skill} className="rounded-full bg-white/5 px-2 py-1 text-xs text-zinc-400">
                      {skill}
                    </span>
                  ))}
                  {candidate.skills.length > 3 && (
                    <span className="rounded-full bg-white/5 px-2 py-1 text-xs text-zinc-400">
                      +{candidate.skills.length - 3}
                    </span>
                  )}
                </div>

                {/* Career Goal */}
                <div className="mb-4 rounded-lg border border-purple-500/20 bg-purple-500/5 p-3">
                  <div className="mb-1 flex items-center gap-1 text-xs text-purple-400">
                    <TrendingUp className="h-3 w-3" />
                    Career Goal
                  </div>
                  <p className="text-xs text-zinc-300">{candidate.targetRole}</p>
                </div>

                {/* Achievements */}
                <div className="mb-4 flex flex-wrap gap-1">
                  {candidate.achievements.map((achievement) => (
                    <span
                      key={achievement}
                      className="flex items-center gap-1 rounded-full bg-yellow-500/10 px-2 py-1 text-xs text-yellow-400"
                    >
                      <Award className="h-3 w-3" />
                      {achievement}
                    </span>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleInviteCandidate(candidate)}
                    className="flex items-center justify-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-4 py-2 text-sm font-medium text-emerald-300 transition-all hover:bg-emerald-500/20 flex-1"
                  >
                    <Mail className="h-4 w-4" />
                    Invite to Assessment
                  </button>
                  <Link
                    href={`/dashboard/candidates/${candidate.id}`}
                    className="flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition-all hover:bg-zinc-200"
                  >
                    <Eye className="h-4 w-4" />
                    View
                  </Link>
                </div>

                {/* Hover effect */}
                <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 opacity-0 transition-opacity group-hover:opacity-100" />
              </motion.div>
            ))}
          </div>

          {/* Empty State */}
          {filteredCandidates.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-16 text-center">
              <p className="mb-4 text-xl text-zinc-400">No candidates found</p>
              <p className="text-sm text-zinc-500">Try adjusting your filters or search query</p>
            </motion.div>
          )}
        </main>

        {/* Invite Candidate Modal */}
        {selectedCandidate && (
          <InviteCandidateModal
            open={inviteModalOpen}
            onOpenChange={setInviteModalOpen}
            candidate={selectedCandidate}
            onSuccess={() => {
              setInviteModalOpen(false)
              setSelectedCandidate(null)
            }}
          />
        )}
      </div>
    </ProtectedRoute>
  )
}
