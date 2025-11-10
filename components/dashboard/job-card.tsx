"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, Users, CheckCircle2, Clock, TrendingUp, Building2, Power, PowerOff, Trash2, MoreVertical } from "lucide-react"
import type { Job } from "@/lib/mock-data"
import { motion } from "framer-motion"
import Image from "next/image"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface JobCardProps {
  job: Job & {
    company?: string
    companyLogo?: string | null
    isActive?: boolean
  }
  onClick: () => void
  isSelected: boolean
  onToggleStatus?: (assessmentId: string, currentStatus: boolean) => void
  onDelete?: (assessmentId: string) => void
}

export function JobCard({ job, onClick, isSelected, onToggleStatus, onDelete }: JobCardProps) {
  const completionRate = job.candidatesSelected > 0 
    ? Math.round((job.candidatesCompleted / job.candidatesSelected) * 100) 
    : 0
  const isActive = job.isActive !== undefined ? job.isActive : job.status === 'active'

  const handleToggleStatus = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onToggleStatus && job.id) {
      onToggleStatus(job.id, isActive)
    }
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onDelete && job.id) {
      onDelete(job.id)
    }
  }

  return (
    <motion.div whileHover={{ scale: 1.02, y: -4 }} transition={{ duration: 0.2 }}>
      <Card
        onClick={onClick}
        className={`group relative cursor-pointer overflow-hidden border-zinc-800 bg-zinc-950/50 backdrop-blur-sm transition-all hover:border-zinc-600 hover:bg-zinc-900/50 hover:shadow-lg hover:shadow-white/5 ${
          isSelected ? "border-white" : ""
        } ${!isActive ? "opacity-75" : ""}`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

        <CardHeader className="relative">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              {/* Company Logo */}
              <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-zinc-700 bg-zinc-900 flex-shrink-0 flex items-center justify-center">
                {job.companyLogo ? (
                  <Image
                    src={job.companyLogo}
                    alt={job.company || "Company"}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <Building2 className="h-6 w-6 text-zinc-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg text-white group-hover:text-white truncate">{job.title}</CardTitle>
                <p className="mt-1 text-sm text-zinc-400">{job.department}</p>
                {job.company && (
                  <p className="mt-0.5 text-xs text-zinc-500 truncate">{job.company}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={isActive ? "default" : "secondary"}
                className={isActive 
                  ? "bg-green-500/10 text-green-500 border border-green-500/20 flex-shrink-0" 
                  : "bg-zinc-500/10 text-zinc-500 border border-zinc-500/20 flex-shrink-0"}
              >
                {isActive ? "Active" : "Inactive"}
              </Badge>
              {(onToggleStatus || onDelete) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-zinc-400 hover:text-white"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                    {onToggleStatus && (
                      <DropdownMenuItem
                        onClick={handleToggleStatus}
                        className="text-white hover:bg-zinc-800 cursor-pointer"
                      >
                        {isActive ? (
                          <>
                            <PowerOff className="h-4 w-4 mr-2" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <Power className="h-4 w-4 mr-2" />
                            Activate
                          </>
                        )}
                      </DropdownMenuItem>
                    )}
                    {onDelete && (
                      <DropdownMenuItem
                        onClick={handleDelete}
                        className="text-red-400 hover:bg-red-500/10 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="relative space-y-4">
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <MapPin className="h-4 w-4" />
            <span>{job.location}</span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1 rounded-lg border border-zinc-800 bg-black/50 p-3">
              <div className="flex items-center gap-1 text-xs text-zinc-500">
                <Users className="h-3 w-3" />
                <span>Selected</span>
              </div>
              <p className="text-xl font-bold text-white">{job.candidatesSelected}</p>
            </div>
            <div className="space-y-1 rounded-lg border border-zinc-800 bg-black/50 p-3">
              <div className="flex items-center gap-1 text-xs text-zinc-500">
                <Clock className="h-3 w-3" />
                <span>Attempted</span>
              </div>
              <p className="text-xl font-bold text-white">{job.candidatesAttempted}</p>
            </div>
            <div className="space-y-1 rounded-lg border border-zinc-800 bg-black/50 p-3">
              <div className="flex items-center gap-1 text-xs text-zinc-500">
                <CheckCircle2 className="h-3 w-3" />
                <span>Completed</span>
              </div>
              <p className="text-xl font-bold text-white">{job.candidatesCompleted}</p>
            </div>
          </div>

          <div className="space-y-2 rounded-lg border border-zinc-800 bg-black/50 p-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-zinc-400" />
                <span className="text-zinc-400">Completion Rate</span>
              </div>
              <span className="font-semibold text-white">{completionRate}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${completionRate}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-white to-zinc-400"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 text-xs text-zinc-500">
            <span>{job.assessmentType}</span>
            <span>{new Date(job.createdAt).toLocaleDateString()}</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
