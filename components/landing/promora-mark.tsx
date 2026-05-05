type Props = {
  className?: string
  size?: number
  /**
   * `default`: black mark on light UI, inverts on global dark theme.
   * `onDark`: white artwork on dark sections (e.g. ink footer) even when the site theme is still light.
   */
  variant?: "default" | "onDark"
}

/** Brand mark from `/Promora-Logo.svg` — white artwork; CSS filters adapt for light vs dark surfaces. */
export function PromoraMark({
  className = "",
  size = 28,
  variant = "default",
}: Props) {
  const h = (size * 366) / 328
  const filterClass =
    variant === "onDark" ? "opacity-95" : "brightness-0 dark:invert"
  return (
    <img
      src="/Promora-Logo.svg"
      alt=""
      width={size}
      height={h}
      draggable={false}
      aria-hidden
      className={`inline-block shrink-0 select-none ${filterClass} ${className}`}
    />
  )
}
