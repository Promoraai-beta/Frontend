type Props = { className?: string; size?: number }

/** Brand mark from `/Promora-Logo.svg` — white artwork rendered dark in light theme, inverted on dark. */
export function PromoraMark({ className = "", size = 28 }: Props) {
  const h = (size * 366) / 328
  return (
    <img
      src="/Promora-Logo.svg"
      alt=""
      width={size}
      height={h}
      draggable={false}
      aria-hidden
      className={`inline-block shrink-0 select-none brightness-0 dark:invert ${className}`}
    />
  )
}
