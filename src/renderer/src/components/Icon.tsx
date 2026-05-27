import type { SVGProps } from 'react'

interface IconProps extends SVGProps<SVGSVGElement> {
  name: string
  size?: number
  stroke?: number
}

export const Icon = ({ name, size = 16, stroke = 1.6, ...rest }: IconProps) => {
  const sw = stroke
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: sw,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    ...rest
  }
  switch (name) {
    case "grid":     return <svg {...props}><rect x="3" y="3" width="7" height="7" rx="1.2"/><rect x="14" y="3" width="7" height="7" rx="1.2"/><rect x="3" y="14" width="7" height="7" rx="1.2"/><rect x="14" y="14" width="7" height="7" rx="1.2"/></svg>;
    case "threat":   return <svg {...props}><path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4z"/><path d="M12 9v4"/><circle cx="12" cy="16" r=".6" fill="currentColor"/></svg>;
    case "bell":     return <svg {...props}><path d="M6 8a6 6 0 0 1 12 0c0 5 2 6 2 7H4c0-1 2-2 2-7z"/><path d="M10 19a2 2 0 0 0 4 0"/></svg>;
    case "device":   return <svg {...props}><rect x="3" y="5" width="14" height="10" rx="1.5"/><path d="M10 19h10M17 15v4"/></svg>;
    case "network":  return <svg {...props}><circle cx="12" cy="12" r="3"/><circle cx="4" cy="6" r="1.6"/><circle cx="20" cy="6" r="1.6"/><circle cx="4" cy="18" r="1.6"/><circle cx="20" cy="18" r="1.6"/><path d="M5.3 6.9L9.7 11M18.7 6.9L14.3 11M5.3 17.1L9.7 13M18.7 17.1L14.3 13"/></svg>;
    case "bug":      return <svg {...props}><rect x="8" y="6" width="8" height="12" rx="4"/><path d="M9 10l-3-1M9 14H4M9 18l-3 2M15 10l3-1M15 14h5M15 18l3 2M12 4v2"/></svg>;
    case "help":     return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.7 2.2c-.7.4-1.2.8-1.2 1.6"/><circle cx="12" cy="16" r=".6" fill="currentColor"/></svg>;
    case "cog":      return <svg {...props}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.9 2.9l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.9-2.9l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.9-2.9l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.9 2.9l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.6 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.6 1z"/></svg>;
    case "search":   return <svg {...props}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>;
    case "play":     return <svg {...props} fill="currentColor" stroke="none"><path d="M7 5v14l11-7z"/></svg>;
    case "refresh":  return <svg {...props}><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>;
    case "cpu":      return <svg {...props}><rect x="6" y="6" width="12" height="12" rx="1.5"/><rect x="9.5" y="9.5" width="5" height="5"/><path d="M9 3v2M12 3v2M15 3v2M9 19v2M12 19v2M15 19v2M3 9h2M3 12h2M3 15h2M19 9h2M19 12h2M19 15h2"/></svg>;
    case "ram":      return <svg {...props}><rect x="3" y="8" width="18" height="9" rx="1.2"/><path d="M7 17v2M11 17v2M13 17v2M17 17v2"/><path d="M7 11h2M12 11h2M16 11h2"/></svg>;
    case "disk":     return <svg {...props}><ellipse cx="12" cy="6" rx="8" ry="2.5"/><path d="M4 6v6c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5V6"/><path d="M4 12v6c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5v-6"/></svg>;
    case "cloud":    return <svg {...props}><path d="M7 19a5 5 0 0 1-.5-10 6 6 0 0 1 11.4 1.6A4 4 0 0 1 17 19H7z"/></svg>;
    case "server":   return <svg {...props}><rect x="3" y="4" width="18" height="7" rx="1.2"/><rect x="3" y="13" width="18" height="7" rx="1.2"/><path d="M7 7.5h.01M7 16.5h.01"/></svg>;
    case "lock":     return <svg {...props}><rect x="5" y="11" width="14" height="9" rx="1.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>;
    case "phone":    return <svg {...props}><rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2"/></svg>;
    case "router":   return <svg {...props}><rect x="3" y="13" width="18" height="6" rx="1.2"/><path d="M7 16h.01M11 16h.01"/><path d="M12 13V8M9 5h6"/><path d="M5 8c2-3 5-3 7-3M19 8c-2-3-5-3-7-3"/></svg>;
    case "camera":   return <svg {...props}><path d="M5 8h3l1.5-2h5L16 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/></svg>;
    case "tv":       return <svg {...props}><rect x="3" y="5" width="18" height="12" rx="1.5"/><path d="M9 21h6M12 17v4"/></svg>;
    case "watch":    return <svg {...props}><rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 6V3h6v3M9 18v3h6v-3"/><path d="M12 10v2.5L13.5 14"/></svg>;
    case "speaker":  return <svg {...props}><rect x="6" y="3" width="12" height="18" rx="2"/><circle cx="12" cy="14" r="3"/><circle cx="12" cy="7" r=".6" fill="currentColor"/></svg>;
    case "plus":     return <svg {...props}><path d="M12 5v14M5 12h14"/></svg>;
    case "arrow-up": return <svg {...props}><path d="M12 19V5M5 12l7-7 7 7"/></svg>;
    case "arrow-dn": return <svg {...props}><path d="M12 5v14M5 12l7 7 7-7"/></svg>;
    case "logout":   return <svg {...props}><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17l-5-5 5-5M4 12h11"/></svg>;
    case "sparkle":  return <svg {...props}><path d="M12 3l1.8 4.7L18 9.5l-4.2 1.8L12 16l-1.8-4.7L6 9.5l4.2-1.8L12 3z"/></svg>;
    case "wifi":     return <svg {...props}><path d="M5 12a10 10 0 0 1 14 0"/><path d="M8.5 15.5a5 5 0 0 1 7 0"/><circle cx="12" cy="19" r=".8" fill="currentColor"/></svg>;
    case "chevron":  return <svg {...props}><path d="M9 6l6 6-6 6"/></svg>;
    case "x":        return <svg {...props}><path d="M6 6l12 12M18 6L6 18"/></svg>;
    case "scan":     return <svg {...props}><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M3 12h18"/></svg>;
    case "shield":   return <svg {...props}><path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4z"/><path d="M9 12l2 2 4-4"/></svg>;
    case "globe":    return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>;
    case "user":     return <svg {...props}><circle cx="12" cy="8" r="3.5"/><path d="M5 20c1-3.5 4-5 7-5s6 1.5 7 5"/></svg>;
    case "filter":   return <svg {...props}><path d="M3 5h18l-7 9v5l-4-2v-3L3 5z"/></svg>;
    case "calendar": return <svg {...props}><rect x="3" y="5" width="18" height="16" rx="1.5"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>;
    case "more":     return <svg {...props}><circle cx="6" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="18" cy="12" r="1.2" fill="currentColor"/></svg>;
    default:         return <svg {...props}><circle cx="12" cy="12" r="9"/></svg>;
  }
}
