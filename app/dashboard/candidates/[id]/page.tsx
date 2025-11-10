"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowLeft, MapPin, TrendingUp, Award, Mail, Calendar, Star, BarChart3, Sparkles } from "lucide-react"
import { publicCandidates } from "@/lib/profile-mock-data"
import { RecruiterNavbar } from "@/components/dashboard/recruiter-navbar"
import { ProtectedRoute } from "@/components/protected-route"
import { AnimatedBackground } from "@/components/animated-background"
import { InviteCandidateModal } from "@/components/dashboard/invite-candidate-modal"
import { GenerateAssessmentForCandidateModal } from "@/components/dashboard/generate-assessment-for-candidate-modal"
import { Button } from "@/components/ui/button"

export default function CandidateDetailPage() {
  const params = useParams()
  const router = useRouter()
  const candidateId = params.id as string
  const [candidate, setCandidate] = useState<any>(null)
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [generateAssessmentModalOpen, setGenerateAssessmentModalOpen] = useState(false)

  useEffect(() => {
    // Find candidate from mock data
    const foundCandidate = publicCandidates.find((c) => c.id === candidateId)
    if (foundCandidate) {
      setCandidate(foundCandidate)
    }
  }, [candidateId])

  if (!candidate) {
    return (
      <ProtectedRoute requiredRole="recruiter">
        <div className="relative min-h-screen bg-black">
          <AnimatedBackground />
          <RecruiterNavbar />
          <main className="container mx-auto px-4 py-8 pt-20 md:pt-24 lg:pt-28">
            <div className="text-center py-16">
              <p className="text-xl text-zinc-400 mb-4">Candidate not found</p>
              <Button
                onClick={() => router.push("/dashboard/candidates")}
                variant="default"
                className="bg-white text-black hover:bg-zinc-200"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Candidates
              </Button>
            </div>
          </main>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredRole="recruiter">
      <div className="relative min-h-screen bg-black">
        <AnimatedBackground />

        <RecruiterNavbar />

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8 pt-20 md:pt-24 lg:pt-28">
          {/* Back Button */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Button
              onClick={() => router.push("/dashboard/candidates")}
              variant="ghost"
              className="text-zinc-400 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Candidates
            </Button>
          </motion.div>

          {/* Candidate Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 rounded-xl border border-white/10 bg-black/40 p-6 backdrop-blur-sm"
          >
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
              {/* Avatar */}
              <img
                src={candidate.avatar || "/placeholder.svg"}
                alt={candidate.name}
                className="h-24 w-24 rounded-full border-2 border-white/20"
              />

              {/* Info */}
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-white mb-2">{candidate.name}</h1>
                <p className="text-xl text-zinc-400 mb-4">{candidate.title}</p>

                <div className="flex flex-wrap gap-4 text-sm text-zinc-400 mb-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{candidate.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Joined {new Date(candidate.joinedDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-400" />
                    <span className="text-yellow-400">{candidate.level}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => setGenerateAssessmentModalOpen(true)}
                    className="bg-purple-500/10 border border-purple-500/30 text-purple-300 hover:bg-purple-500/20"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Assessment
                  </Button>
                  <Button
                    onClick={() => setInviteModalOpen(true)}
                    className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Invite to Assessment
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-xl border border-white/10 bg-black/40 p-6 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="rounded-lg bg-blue-500/10 p-3">
                  <BarChart3 className="h-6 w-6 text-blue-400" />
                </div>
              </div>
              <p className="text-3xl font-bold text-white mb-1">{candidate.promptIQScore}</p>
              <p className="text-sm text-zinc-400">PromptIQ Score</p>
              <div className="mt-4 h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                  style={{ width: `${candidate.promptIQScore}%` }}
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-xl border border-white/10 bg-black/40 p-6 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="rounded-lg bg-yellow-500/10 p-3">
                  <Star className="h-6 w-6 text-yellow-400" />
                </div>
              </div>
              <p className="text-3xl font-bold text-white mb-1">
                {(candidate.totalPoints / 1000).toFixed(1)}k
              </p>
              <p className="text-sm text-zinc-400">Total Points</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-xl border border-white/10 bg-black/40 p-6 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="rounded-lg bg-purple-500/10 p-3">
                  <Award className="h-6 w-6 text-purple-400" />
                </div>
              </div>
              <p className="text-3xl font-bold text-white mb-1">{candidate.assessmentsCompleted}</p>
              <p className="text-sm text-zinc-400">Assessments Completed</p>
            </motion.div>
          </div>

          {/* Bio Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-8 rounded-xl border border-white/10 bg-black/40 p-6 backdrop-blur-sm"
          >
            <h2 className="text-xl font-bold text-white mb-4">About</h2>
            <p className="text-zinc-300 leading-relaxed">{candidate.bio}</p>
          </motion.div>

          {/* Skills Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-8 rounded-xl border border-white/10 bg-black/40 p-6 backdrop-blur-sm"
          >
            <h2 className="text-xl font-bold text-white mb-4">Skills</h2>
            <div className="flex flex-wrap gap-2">
              {candidate.skills.map((skill: string) => (
                <span
                  key={skill}
                  className="rounded-full bg-white/5 border border-white/10 px-4 py-2 text-sm text-zinc-300"
                >
                  {skill}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Career Goal */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mb-8 rounded-xl border border-purple-500/20 bg-purple-500/5 p-6 backdrop-blur-sm"
          >
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-purple-400" />
              <h2 className="text-xl font-bold text-white">Career Goal</h2>
            </div>
            <p className="text-zinc-300">{candidate.targetRole}</p>
          </motion.div>

          {/* Achievements */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mb-8 rounded-xl border border-white/10 bg-black/40 p-6 backdrop-blur-sm"
          >
            <h2 className="text-xl font-bold text-white mb-4">Achievements</h2>
            <div className="flex flex-wrap gap-2">
              {candidate.achievements.map((achievement: string) => (
                <span
                  key={achievement}
                  className="flex items-center gap-2 rounded-full bg-yellow-500/10 border border-yellow-500/20 px-4 py-2 text-sm text-yellow-400"
                >
                  <Award className="h-4 w-4" />
                  {achievement}
                </span>
              ))}
            </div>
          </motion.div>
        </main>

        {/* Invite Candidate Modal */}
        <InviteCandidateModal
          open={inviteModalOpen}
          onOpenChange={setInviteModalOpen}
          candidate={{
            id: candidate.id,
            name: candidate.name,
            email: candidate.email || `${candidate.name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
          }}
          onSuccess={() => {
            setInviteModalOpen(false)
          }}
        />

        {/* Generate Assessment for Candidate Modal */}
        <GenerateAssessmentForCandidateModal
          open={generateAssessmentModalOpen}
          onOpenChange={setGenerateAssessmentModalOpen}
          candidate={{
            id: candidate.id,
            name: candidate.name,
            email: candidate.email || `${candidate.name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
            title: candidate.title,
            skills: candidate.skills,
            targetRole: candidate.targetRole,
            level: candidate.level,
            bio: candidate.bio,
          }}
          onSuccess={() => {
            setGenerateAssessmentModalOpen(false)
          }}
        />
      </div>
    </ProtectedRoute>
  )
}

