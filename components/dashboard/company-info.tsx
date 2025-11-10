"use client"

import { useState, useEffect } from "react"
import { Building2, MapPin, Users, Globe, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { api } from "@/lib/api"
import Image from "next/image"

interface CompanyInfoData {
  name: string
  industry?: string | null
  size?: string | null
  location?: string | null
  website?: string | null
  description?: string | null
  logo?: string | null
}

interface QuickStatsData {
  activeJobs: number
  totalCandidates: number
  completedAssessments: number
  avgCompletionRate: number
}

export function CompanyInfo() {
  const [companyInfo, setCompanyInfo] = useState<CompanyInfoData | null>(null)
  const [quickStats, setQuickStats] = useState<QuickStatsData>({
    activeJobs: 0,
    totalCandidates: 0,
    completedAssessments: 0,
    avgCompletionRate: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadCompanyInfo() {
      try {
        setLoading(true)
        
        // Fetch recruiter profile which includes company info
        const profileResponse = await api.get("/api/profiles/recruiter")
        const profileData = await profileResponse.json()
        
        if (profileData.success && profileData.data?.company) {
          setCompanyInfo({
            name: profileData.data.company.name || "Your Company",
            industry: profileData.data.company.industry,
            size: profileData.data.company.size,
            location: profileData.data.company.location,
            website: profileData.data.company.website,
            description: profileData.data.company.description,
            logo: profileData.data.company.logo
          })
        }

        // Fetch quick stats from sessions and assessments
        const [sessionsRes, assessmentsRes] = await Promise.all([
          api.get("/api/sessions").catch(() => ({ ok: false, json: async () => ({ success: false, data: [] }) })),
          api.get("/api/assessments").catch(() => ({ ok: false, json: async () => ({ success: false, data: [] }) }))
        ])

        const sessionsData = await sessionsRes.json()
        const assessmentsData = await assessmentsRes.json()
        
        const sessions = sessionsData.success ? (sessionsData.data || []) : []
        const assessments = assessmentsData.success ? (assessmentsData.data || []) : []

        // Calculate quick stats
        // Active Jobs: Assessments that have at least one active or pending session
        const activeJobs = new Set(
          sessions
            .filter((s: any) => s.status === 'active' || s.status === 'pending')
            .map((s: any) => s.assessmentId || s.assessment_id)
            .filter((id: any) => id !== null && id !== undefined)
        ).size

        // Total Candidates: Unique candidates from all sessions
        const uniqueCandidates = new Set(
          sessions
            .map((s: any) => s.candidateId || s.candidate_id)
            .filter((id: any) => id !== null && id !== undefined)
        )
        const totalCandidates = uniqueCandidates.size

        // Completed Assessments: Sessions with status 'submitted'
        const completedAssessments = sessions.filter((s: any) => s.status === 'submitted').length

        // Average Completion Rate: Percentage of sessions that were completed
        const avgCompletionRate = sessions.length > 0
          ? Math.round((completedAssessments / sessions.length) * 100)
          : 0

        setQuickStats({
          activeJobs,
          totalCandidates,
          completedAssessments,
          avgCompletionRate
        })
      } catch (error) {
        console.error("Error loading company info:", error)
      } finally {
        setLoading(false)
      }
    }

    loadCompanyInfo()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="border-zinc-800 bg-zinc-950">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border-zinc-800 bg-zinc-950">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 rounded-xl overflow-hidden border-2 border-zinc-700 bg-zinc-900 flex items-center justify-center flex-shrink-0">
              {companyInfo?.logo ? (
                <Image
                  src={companyInfo.logo}
                  alt={companyInfo.name || "Company"}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <Building2 className="h-8 w-8 text-zinc-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-white truncate">{companyInfo?.name || "Your Company"}</CardTitle>
              {companyInfo?.industry && (
                <p className="text-sm text-zinc-400 truncate">{companyInfo.industry}</p>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {companyInfo?.size && (
            <div className="flex items-center gap-3 text-sm">
              <Users className="h-4 w-4 text-zinc-400 flex-shrink-0" />
              <span className="text-zinc-300 truncate">{companyInfo.size}</span>
            </div>
          )}
          {companyInfo?.location && (
            <div className="flex items-center gap-3 text-sm">
              <MapPin className="h-4 w-4 text-zinc-400 flex-shrink-0" />
              <span className="text-zinc-300 truncate">{companyInfo.location}</span>
            </div>
          )}
          {companyInfo?.website && (
            <div className="flex items-center gap-3 text-sm">
              <Globe className="h-4 w-4 text-zinc-400 flex-shrink-0" />
              <a 
                href={companyInfo.website} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-zinc-300 hover:text-white truncate underline"
              >
                {companyInfo.website}
              </a>
            </div>
          )}
          {companyInfo?.description && (
            <p className="text-pretty text-sm text-zinc-400">{companyInfo.description}</p>
          )}
          {!companyInfo?.size && !companyInfo?.location && !companyInfo?.website && !companyInfo?.description && (
            <p className="text-sm text-zinc-500 italic">No company information available. Update your profile to add details.</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-zinc-800 bg-zinc-950">
        <CardHeader>
          <CardTitle className="text-white">Quick Stats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">Active Jobs</span>
            <span className="text-lg font-semibold text-white">{quickStats.activeJobs}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">Total Candidates</span>
            <span className="text-lg font-semibold text-white">{quickStats.totalCandidates}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">Completed Assessments</span>
            <span className="text-lg font-semibold text-white">{quickStats.completedAssessments}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">Avg. Completion Rate</span>
            <span className="text-lg font-semibold text-white">{quickStats.avgCompletionRate}%</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
