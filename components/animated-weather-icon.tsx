import React from "react"

type IconBaseProps = {
  className?: string
  size?: "sm" | "md" | "lg"
}

type AnimatedWeatherIconProps = IconBaseProps & {
  code: number
}

const sizeClasses: Record<NonNullable<IconBaseProps["size"]>, string> = {
  sm: "w-5 h-5",
  md: "w-7 h-7",
  lg: "w-10 h-10",
}

function SunIcon({ className, size = "md" }: IconBaseProps) {
  const base = `${sizeClasses[size]} ${className ?? ""}`.trim()
  return (
    <svg
      className={base}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <g style={{ animation: "sun-rotate 18s linear infinite", transformOrigin: "12px 12px" }}>
        <circle cx="12" cy="12" r="3.5" />
        <line x1="12" y1="3" x2="12" y2="6" />
        <line x1="12" y1="18" x2="12" y2="21" />
        <line x1="3" y1="12" x2="6" y2="12" />
        <line x1="18" y1="12" x2="21" y2="12" />
        <line x1="5" y1="5" x2="6.8" y2="6.8" />
        <line x1="17.2" y1="17.2" x2="19" y2="19" />
        <line x1="5" y1="19" x2="6.8" y2="17.2" />
        <line x1="17.2" y1="6.8" x2="19" y2="5" />
      </g>
    </svg>
  )
}

function CloudIcon({ className, size = "md" }: IconBaseProps) {
  const base = `${sizeClasses[size]} ${className ?? ""}`.trim()
  return (
    <svg
      className={base}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <g style={{ animation: "cloud-drift 6s ease-in-out infinite" }}>
        <path d="M6 16.5h9.5a3.5 3.5 0 0 0 0-7c-.3 0-.6 0-.9.1A4.5 4.5 0 0 0 6.5 8a4.5 4.5 0 0 0-1.3 8.8" />
      </g>
    </svg>
  )
}

function RainIcon({ className, size = "md" }: IconBaseProps) {
  const base = `${sizeClasses[size]} ${className ?? ""}`.trim()
  return (
    <svg
      className={base}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <g style={{ animation: "cloud-drift 7s ease-in-out infinite" }}>
        <path d="M6 12.5h9a3 3 0 0 0 0-6 3.7 3.7 0 0 0-.8.1A4 4 0 0 0 6.5 7 4 4 0 0 0 5 14" />
      </g>
      <g style={{ animation: "rain-fall 0.9s linear infinite" }}>
        <line x1="8" y1="14.5" x2="8" y2="18" />
        <line x1="12" y1="15.5" x2="12" y2="19" />
        <line x1="16" y1="14.5" x2="16" y2="18" />
      </g>
    </svg>
  )
}

function SnowIcon({ className, size = "md" }: IconBaseProps) {
  const base = `${sizeClasses[size]} ${className ?? ""}`.trim()
  return (
    <svg
      className={base}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <g style={{ animation: "cloud-drift 7s ease-in-out infinite" }}>
        <path d="M6 12.5h9a3 3 0 0 0 0-6 3.7 3.7 0 0 0-.8.1A4 4 0 0 0 6.5 7 4 4 0 0 0 5 14" />
      </g>
      <g style={{ animation: "snow-fall 1.8s linear infinite" }}>
        <circle cx="8" cy="16" r="0.8" />
        <circle cx="12" cy="17" r="0.8" />
        <circle cx="16" cy="16" r="0.8" />
      </g>
    </svg>
  )
}

function ThunderIcon({ className, size = "md" }: IconBaseProps) {
  const base = `${sizeClasses[size]} ${className ?? ""}`.trim()
  return (
    <svg
      className={base}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <g style={{ animation: "cloud-drift 6s ease-in-out infinite" }}>
        <path d="M6 12.5h9a3 3 0 0 0 0-6 3.7 3.7 0 0 0-.8.1A4 4 0 0 0 6.5 7 4 4 0 0 0 5 14" />
      </g>
      <g style={{ animation: "thunder-flash 1.6s ease-in-out infinite" }}>
        <path d="M11 13.5 9 18l3-0.5L11 21l4-4.5-3 0.5 2-3.5z" />
      </g>
    </svg>
  )
}

export function AnimatedWeatherIcon({ code, className, size = "md" }: AnimatedWeatherIconProps) {
  const mergedClassName = `${className ?? ""}`.trim()

  // WMO weather codes grouping
  if (code === 0 || code === 1) {
    return <SunIcon size={size} className={mergedClassName} />
  }

  if (code === 2 || code === 3 || code === 45 || code === 48) {
    return <CloudIcon size={size} className={mergedClassName} />
  }

  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) {
    return <RainIcon size={size} className={mergedClassName} />
  }

  if ([71, 73, 75].includes(code)) {
    return <SnowIcon size={size} className={mergedClassName} />
  }

  if (code === 95) {
    return <ThunderIcon size={size} className={mergedClassName} />
  }

  // Fallback ― просто хмарка
  return <CloudIcon size={size} className={mergedClassName} />
}


