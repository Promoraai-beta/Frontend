"use client"

import { Badge } from "@/components/ui/badge"
import { Users, Clock, ChevronRight, MoreVertical, Power, PowerOff, Trash2 } from "lucide-react"
import type { Job } from "@/lib/mock-data"
import { motion } from "framer-motion"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

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
  avgScore?: number
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  const hrs = Math.floor(mins / 60)
  const days = Math.floor(hrs / 24)
  if (days > 0) return `${days}d ago`
  if (hrs > 0) return `${hrs}h ago`
  return `${mins}m ago`
}

export function JobCard({ job, onClick, isSelected, onToggleStatus, onDelete, avgScore }: JobCardProps) {
  const isActive = job.isActive !== undefined ? job.isActive : job.status === 'active'
  const total = Math.max(job.candidatesSelected, 1)
  const completed = job.candidatesCompleted
  const inProgress = job.candidatesAttempted - completed

  const handleToggleStatus = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onToggleStatus && job.id) onToggleStatus(job.id, isActive)
  }
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onDelete && job.id) onDelete(job.id)
  }

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      onClick={onClick}
      className={`group relative cursor-pointer rounded-xl border bg-zinc-950/60 backdrop-blur-sm transition-all duration-200 hover:bg-zinc-900/60 ${
        isSelected ? "border-white/30" : "border-zinc-800/70 hover:border-zinc-700"
      } ${!isActive ? "opacity-60" : ""}`}
    >
      {/* Top row */}
      <div className="flex items-start justify-between p-4 pb-3">
        <div className="flex-1 min-w-0 pr-2">
          <h3 className="text-sm font-semibold text-white truncate">{job.title}</h3>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge
            className={`text-[10px] px-2 py-0 ${
              isActive
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "bg-zinc-700/50 text-zinc-400 border border-zinc-600/20"
            }`}
          >
            <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${isActive ? "bg-emerald-400" : "bg-zinc-500"}`} />
            {isActive ? "Active" : "Inactive"}
          </Badge>
          {(onToggleStatus || onDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-zinc-500 hover:text-white opacity-0 group-hover:opacity-100">
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                {onToggleStatus && (
                  <DropdownMenuItem onClick={handleToggleStatus} className="text-white hover:bg-zinc-800 cursor-pointer text-sm">
                    {isActive ? <><PowerOff className="h-3.5 w-3.5 mr-2" />Deactivate</> : <><Power className="h-3.5 w-3.5 mr-2" />Activate</>}
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem onClick={handleDelete} className="text-red-400 hover:bg-red-500/10 cursor-pointer text-sm">
                    <Trash2 className="h-3.5 w-3.5 mr-2" />Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Chips row */}
      <div className="flex items-center gap-2 px-4 pb-4 flex-wrap">
        <span className="flex items-center gap-1 rounded-md bg-zinc-800/60 px-2 py-0.5 text-[11px] text-zinc-400">
          <Users className="h-3 w-3" />
          {job.candidatesSelected}
        </span>
        {job.department && (
          <span className="rounded-md bg-zinc-800/60 px-2 py-0.5 text-[11px] text-zinc-400">
            {job.department}
          </span>
        )}
        <span className="flex items-center gap-1 rounded-md bg-zinc-800/60 px-2 py-0.5 text-[11px] text-zinc-400">
          <Clock className="h-3 w-3" />
          {timeAgo(job.createdAt)}
        </span>
      </div>

      {/* Coverage section */}
      <div className="border-t border-zinc-800/60 px-4 pt-3 pb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-medium tracking-widest text-zinc-500 uppercase">Coverage</span>
          <span className="text-[11px] font-semibold tabular-nums text-zinc-300">
            {completed}/{job.candidatesSelected || 0}
          </span>
        </div>
        {job.candidatesSelected > 0 ? (
          <div className="flex gap-1">
            {Array.from({ length: Math.min(job.candidatesSelected, 8) }).map((_, i) => {
              const isComp = i < completed
              const isInProg = !isComp && i < (completed + inProgress)
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scaleX: 0 }}
                  animate={{ opacity: 1, scaleX: 1 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  style={{ originX: 0 }}
                  className={`flex-1 h-1.5 rounded-full ${
                    isComp ? "bg-white" : isInProg ? "bg-zinc-400" : "bg-zinc-700"
                  }`}
                />
              )
            })}
            {job.candidatesSelected > 8 && (
              <span className="text-[10px] text-zinc-500 ml-1">+{job.candidatesSelected - 8}</span>
            )}
          </div>
        ) : (
          <div className="flex gap-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex-1 h-1.5 rounded-full bg-zinc-800" />
            ))}
          </div>
        )}
      </div>

      {/* View link + avg score */}
      <div className="border-t border-zinc-800/60 px-4 py-2.5 flex items-center justify-between">
        {avgScore !== undefined && avgScore > 0 ? (
          <span className="text-xs text-zinc-500">
            Avg IQ <span className="font-semibold text-zinc-300">{avgScore}</span>
          </span>
        ) : (
          <span />
        )}
        <span className="flex items-center gap-1 text-xs text-zinc-500 group-hover:text-zinc-300 transition-colors">
          View <ChevronRight className="h-3 w-3" />
        </span>
      </div>
    </motion.div>
  )
}
