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
      className={`group relative cursor-pointer rounded-2xl border bg-card transition-all duration-200 hover:border-accent/35 hover:shadow-[0_12px_40px_-24px_hsl(var(--accent)/0.35)] ${
        isSelected ? "border-accent/40 ring-1 ring-accent/20" : "border-border"
      } ${!isActive ? "opacity-[0.72]" : ""}`}
    >
      {/* Top row */}
      <div className="flex items-start justify-between p-4 pb-3">
        <div className="flex-1 min-w-0 pr-2">
          <h3 className="truncate text-sm font-semibold text-foreground">{job.title}</h3>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge
            className={`border px-2 py-0 text-[10px] font-medium ${
              isActive
                ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                : "border-border bg-muted/80 text-muted-foreground"
            }`}
          >
            <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${isActive ? "bg-emerald-500 dark:bg-emerald-400" : "bg-muted-foreground/60"}`} />
            {isActive ? "Active" : "Inactive"}
          </Badge>
          {(onToggleStatus || onDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground opacity-0 hover:bg-muted hover:text-foreground group-hover:opacity-100">
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onToggleStatus && (
                  <DropdownMenuItem onClick={handleToggleStatus} className="cursor-pointer text-sm">
                    {isActive ? <><PowerOff className="h-3.5 w-3.5 mr-2" />Deactivate</> : <><Power className="h-3.5 w-3.5 mr-2" />Activate</>}
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem onClick={handleDelete} className="cursor-pointer text-sm text-red-600 focus:text-red-600 dark:text-red-400">
                    <Trash2 className="h-3.5 w-3.5 mr-2" />Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Chips row */}
      <div className="flex flex-wrap items-center gap-2 px-4 pb-4">
        <span className="flex items-center gap-1 rounded-full bg-muted/80 px-2 py-0.5 text-[11px] text-muted-foreground">
          <Users className="h-3 w-3" />
          {job.candidatesSelected}
        </span>
        {job.department && (
          <span className="rounded-full bg-muted/80 px-2 py-0.5 text-[11px] text-muted-foreground">
            {job.department}
          </span>
        )}
        <span className="flex items-center gap-1 rounded-full bg-muted/80 px-2 py-0.5 text-[11px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          {timeAgo(job.createdAt)}
        </span>
      </div>

      {/* Coverage section */}
      <div className="border-t border-border px-4 pb-3 pt-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="eyebrow text-[10px] tracking-[0.14em] text-muted-foreground">Coverage</span>
          <span className="text-[11px] font-semibold tabular-nums text-foreground">
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
                    isComp
                      ? "bg-accent"
                      : isInProg
                        ? "bg-muted-foreground/50"
                        : "bg-muted"
                  }`}
                />
              )
            })}
            {job.candidatesSelected > 8 && (
              <span className="ml-1 text-[10px] text-muted-foreground">+{job.candidatesSelected - 8}</span>
            )}
          </div>
        ) : (
          <div className="flex gap-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex-1 h-1.5 rounded-full bg-muted" />
            ))}
          </div>
        )}
      </div>

      {/* View link + avg score */}
      <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
        {avgScore !== undefined && avgScore > 0 ? (
          <span className="text-xs text-muted-foreground">
            Avg IQ <span className="font-semibold tabular-nums text-foreground">{avgScore}</span>
          </span>
        ) : (
          <span />
        )}
        <span className="flex items-center gap-1 text-xs text-muted-foreground transition-colors group-hover:text-accent">
          View <ChevronRight className="h-3 w-3" />
        </span>
      </div>
    </motion.div>
  )
}
