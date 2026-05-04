"use client"

export function EditorialAvatarInitials({
  name,
  size = "md",
  className,
}: {
  name: string
  size?: "sm" | "md" | "lg"
  className?: string
}) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const initialsRaw =
    parts.length >= 2 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : (parts[0]?.slice(0, 2) ?? "?")
  const initials = initialsRaw.toUpperCase()

  const dim =
    size === "sm"
      ? "h-8 w-8 text-[11px]"
      : size === "lg"
        ? "h-12 w-12 text-sm"
        : "h-9 w-9 text-xs"

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-accent/15 font-mono font-medium uppercase tracking-wide text-accent ring-1 ring-accent/30 ${dim} ${className ?? ""}`}
    >
      {initials}
    </div>
  )
}
