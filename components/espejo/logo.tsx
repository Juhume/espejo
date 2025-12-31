"use client"

interface LogoProps {
  size?: number
  className?: string
}

export function Logo({ size = 32, className = "" }: LogoProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 180 180" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="mirrorGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: "#6366f1" }}/>
          <stop offset="100%" style={{ stopColor: "#8b5cf6" }}/>
        </linearGradient>
        <linearGradient id="glassGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: "#e0e7ff" }}/>
          <stop offset="50%" style={{ stopColor: "#c7d2fe" }}/>
          <stop offset="100%" style={{ stopColor: "#a5b4fc" }}/>
        </linearGradient>
      </defs>
      <rect width="180" height="180" rx="40" fill="url(#mirrorGradient)"/>
      <ellipse cx="90" cy="95" rx="52" ry="62" fill="#1e1b4b" opacity="0.3"/>
      <ellipse cx="90" cy="93" rx="48" ry="58" fill="url(#glassGradient)"/>
      <ellipse cx="70" cy="70" rx="20" ry="25" fill="white" opacity="0.4"/>
      <ellipse cx="65" cy="65" rx="8" ry="10" fill="white" opacity="0.6"/>
      <g opacity="0.5">
        <line x1="60" y1="100" x2="120" y2="100" stroke="#4338ca" strokeWidth="3" strokeLinecap="round"/>
        <line x1="65" y1="112" x2="115" y2="112" stroke="#4338ca" strokeWidth="3" strokeLinecap="round"/>
        <line x1="70" y1="124" x2="110" y2="124" stroke="#4338ca" strokeWidth="3" strokeLinecap="round"/>
      </g>
      <rect x="82" y="150" width="16" height="24" rx="4" fill="#1e1b4b"/>
      <rect x="84" y="152" width="12" height="20" rx="3" fill="#312e81"/>
    </svg>
  )
}
