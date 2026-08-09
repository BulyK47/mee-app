import type { ReactNode, CSSProperties } from 'react'

export type IconName =
  | 'bolt' | 'coin' | 'flame' | 'heart' | 'settings' | 'learn' | 'lab' | 'recap' | 'mistakes' | 'share' | 'check' | 'close' | 'lock' | 'star'
  | 'ruler' | 'target' | 'gauge' | 'digits' | 'wave' | 'bridge' | 'sensor' | 'loop'
  | 'leads' | 'breadboard' | 'voltmeter' | 'dcsupply' | 'dmm' | 'fgen' | 'scope' | 'lcr' | 'trophy'
  | 'spectrum' | 'reference' | 'daq'
  | 'ammeter' | 'clamp' | 'mcu' | 'eload' | 'emeter'
  | 'ct' | 'vt' | 'acsupply' | 'pv' | 'rlcload' | 'shunt' | 'pc' | 'counter' | 'palette'
  | 'labframe' | 'certificate' | 'chat'

const F = { fill: 'currentColor', stroke: 'none' } as const

const PATHS: Record<IconName, ReactNode> = {
  bolt: <path d="M13 2 L5 13 h6 l-1 9 L19 10 h-6 z" {...F} />,
  coin: <><circle cx="12" cy="12" r="9" {...F} /><path d="M8.6 8.8 L12 15.4 L15.4 8.8" fill="none" stroke="#fff" strokeWidth={1.9} /></>,
  flame: <path d="M12 2c.6 3.2 3.8 4.4 3.8 8.2A3.8 3.8 0 0 1 8.2 10c0-1 .4-1.9 1.1-2.6.1 1 .8 1.6 1.5 1.6C9.4 6.6 12 5.8 12 2z" {...F} />,
  heart: <path d="M12 20s-7-4.4-7-9.4A3.5 3.5 0 0 1 12 7a3.5 3.5 0 0 1 7 3.6C19 15.6 12 20 12 20z" {...F} />,
  settings: <><line x1="4" y1="7" x2="20" y2="7" /><circle cx="9" cy="7" r="2.1" fill="#fff" /><line x1="4" y1="12" x2="20" y2="12" /><circle cx="15" cy="12" r="2.1" fill="#fff" /><line x1="4" y1="17" x2="20" y2="17" /><circle cx="8" cy="17" r="2.1" fill="#fff" /></>,
  learn: <><path d="M9 18h6" /><path d="M10 21h4" /><path d="M12 3a6 6 0 0 0-4 10.4c.8.8 1 1.3 1 2.6h6c0-1.3.2-1.8 1-2.6A6 6 0 0 0 12 3z" /></>,
  lab: <><path d="M9 3h6" /><path d="M10 3v6l-5 9.5A1.4 1.4 0 0 0 6.3 21h11.4a1.4 1.4 0 0 0 1.3-2.5L14 9V3" /><line x1="8.5" y1="14" x2="15.5" y2="14" /></>,
  recap: <><path d="M12 6c-1.6-1-4-1.5-6-1.5V18c2 0 4.4.5 6 1.5" /><path d="M12 6c1.6-1 4-1.5 6-1.5V18c-2 0-4.4.5-6 1.5" /></>,
  mistakes: <><path d="M20 11a8 8 0 1 0-1.5 5" /><path d="M20 4v5h-5" /></>,
  share: <><circle cx="6" cy="12" r="2.4" /><circle cx="17" cy="6" r="2.4" /><circle cx="17" cy="18" r="2.4" /><line x1="8.2" y1="10.9" x2="14.8" y2="7.1" /><line x1="8.2" y1="13.1" x2="14.8" y2="16.9" /></>,
  check: <path d="M5 12.5l4.5 4.5L19 6.5" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  lock: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  star: <path d="M12 3.2l2.6 5.4 5.9.7-4.4 4 1.2 5.8L12 16.3 6.7 19.1l1.2-5.8-4.4-4 5.9-.7z" {...F} />,

  ruler: <><rect x="3" y="8" width="18" height="8" rx="1.2" /><path d="M7 8v3.2M11 8v4M15 8v3.2M19 8v4" /></>,
  target: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="1.2" {...F} /></>,
  gauge: <><path d="M4 17a8 8 0 1 1 16 0" /><path d="M12 17l5-4.5" /><circle cx="12" cy="17" r="1.4" {...F} /></>,
  digits: <><rect x="3.5" y="6" width="17" height="12" rx="2" /><path d="M8 9.5h2M8 14.5h2M14 9.5h2M14 14.5h2" /></>,
  wave: <path d="M3 12c2-6 4-6 6 0s4 6 6 0 4-6 6 0" />,
  bridge: <><path d="M12 4l8 8-8 8-8-8z" /><circle cx="12" cy="12" r="2.3" /></>,
  sensor: <><circle cx="12" cy="17" r="1.6" {...F} /><path d="M8.4 13.6a5 5 0 0 1 7.2 0" /><path d="M5.8 11a9 9 0 0 1 12.4 0" /></>,
  loop: <><path d="M20 11a8 8 0 1 0-1.5 5" /><path d="M20 4v5h-5" /></>,

  leads: <><path d="M4 6c4.5 0 6.5 4.5 6.5 9" /><path d="M20 18c-4.5 0-6.5-4.5-6.5-9" /><circle cx="4" cy="6" r="1.7" {...F} /><circle cx="20" cy="18" r="1.7" {...F} /></>,
  breadboard: <><rect x="3" y="6" width="18" height="12" rx="2" /><g {...F}><circle cx="7" cy="10" r=".7" /><circle cx="10" cy="10" r=".7" /><circle cx="13" cy="10" r=".7" /><circle cx="16" cy="10" r=".7" /><circle cx="7" cy="14" r=".7" /><circle cx="10" cy="14" r=".7" /><circle cx="13" cy="14" r=".7" /><circle cx="16" cy="14" r=".7" /></g></>,
  voltmeter: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 15.5a5 5 0 0 1 10 0" /><path d="M12 15.5l3.2-2.8" /><circle cx="12" cy="15.5" r="1" {...F} /></>,
  dcsupply: <><rect x="3" y="5" width="18" height="14" rx="2" /><rect x="6" y="8" width="12" height="3.2" rx="1" /><circle cx="8.5" cy="15.5" r="1.3" /><circle cx="13" cy="15.5" r="1.3" /></>,
  dmm: <><rect x="4.5" y="3" width="15" height="18" rx="2" /><rect x="7.5" y="6" width="9" height="4" rx="1" /><circle cx="12" cy="15.5" r="3" /><path d="M12 15.5l1.6-1.6" /></>,
  fgen: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M6 13c1.4-3 2.8-3 4 0s2.6 3 4 0" /><circle cx="17.5" cy="15" r="1.2" /></>,
  scope: <><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M5.5 11c1.8-4 2.8 4 4.5 0s2.8 4 4.5 0" /><line x1="8.5" y1="20.5" x2="15.5" y2="20.5" /><line x1="12" y1="17" x2="12" y2="20.5" /></>,
  lcr: <><rect x="3" y="4" width="18" height="16" rx="2" /><rect x="6" y="7" width="12" height="5" rx="1" /><path d="M6.5 16.5q1.4 -3 2.8 0t2.8 0t2.8 0" /></>,
  trophy: <><path d="M8 4h8v4.5a4 4 0 0 1-8 0z" /><path d="M8 5.5H5a2.8 2.8 0 0 0 3 3M16 5.5h3a2.8 2.8 0 0 1-3 3" /><path d="M12 12.5v3.5M9.5 20h5M10.5 20l.4-4M13.5 20l-.4-4" /></>,
  spectrum: <><rect x="3" y="4" width="18" height="16" rx="2" /><line x1="6.5" y1="17" x2="6.5" y2="13" /><line x1="10" y1="17" x2="10" y2="8.5" /><line x1="13.5" y1="17" x2="13.5" y2="14.5" /><line x1="17" y1="17" x2="17" y2="10.5" /><line x1="5.5" y1="17" x2="18.5" y2="17" /></>,
  reference: <><rect x="6" y="6" width="12" height="12" rx="1.5" /><circle cx="12" cy="12" r="2.6" /><path d="M6 9h12" /></>,
  daq: <><rect x="6.5" y="8" width="11" height="9" rx="1.2" /><path d="M9.5 8V5M12 8V5M14.5 8V5M9.5 17v3M12 17v3M14.5 17v3M6.5 11H4M6.5 14.5H4M17.5 11H20M17.5 14.5H20" /></>,

  ammeter: <><circle cx="12" cy="12" r="8.5" /><path d="M8 14a4.2 4.2 0 0 1 8 0" /><path d="M12 14l3-2.8" /><circle cx="12" cy="14" r=".9" {...F} /></>,
  clamp: <><path d="M15 4.5a5.4 5.4 0 1 0 0 8.4" /><rect x="8" y="12.5" width="8.5" height="7.5" rx="1.4" /><line x1="10.2" y1="16" x2="14.3" y2="16" /></>,
  mcu: <><rect x="7.5" y="7.5" width="9" height="9" rx="1" /><path d="M10 7.5V4.5M12 7.5V4.5M14 7.5V4.5M10 16.5v3M12 16.5v3M14 16.5v3M7.5 10H4.5M7.5 12H4.5M7.5 14H4.5M16.5 10h3M16.5 12h3M16.5 14h3" /><circle cx="10" cy="10" r=".8" {...F} /></>,
  eload: <><rect x="3" y="5" width="18" height="14" rx="2" /><rect x="6" y="8" width="12" height="3" rx="1" /><path d="M6.5 15.5h1.4l1-2.2 2 4.4 2-4.4 1 2.2h1.9" /></>,
  emeter: <><rect x="4" y="4" width="16" height="16" rx="2" /><rect x="7" y="6.8" width="10" height="3.4" rx=".6" /><circle cx="12" cy="15.3" r="2.7" /><line x1="12" y1="15.3" x2="13.7" y2="13.9" /></>,

  ct: <><ellipse cx="12" cy="12" rx="6" ry="4.6" /><ellipse cx="12" cy="12" rx="2.5" ry="1.9" /><line x1="12" y1="3.5" x2="12" y2="20.5" /></>,
  vt: <><circle cx="9" cy="12" r="4" /><circle cx="15" cy="12" r="4" /><line x1="12" y1="6.5" x2="12" y2="17.5" /></>,
  acsupply: <><rect x="3" y="5" width="18" height="14" rx="2" /><rect x="6" y="8" width="12" height="3.2" rx="1" /><path d="M6.8 16c1-2.2 2-2.2 3 0s2 2.2 3 0" /><line x1="16.5" y1="14.5" x2="16.5" y2="17.2" /></>,
  pv: <><rect x="4" y="4" width="16" height="11" rx="1" /><path d="M4 7.7h16M4 11.3h16M9.3 4v11M14.6 4v11" /><path d="M12 15v5M9 20h6" /></>,
  rlcload: <><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M5.8 12h1.4l.7-2.2 1.4 4.4.7-2.2h1.2" /><path d="M12.4 12q.8-1.6 1.6 0t1.6 0" /><path d="M18.2 9.8v4.4" /></>,
  shunt: <><rect x="6" y="9" width="12" height="6" rx="1" /><line x1="3" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="21" y2="12" /><line x1="9.5" y1="9" x2="9.5" y2="5" /><line x1="14.5" y1="9" x2="14.5" y2="5" /></>,
  pc: <><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M6.5 7.5h7M6.5 10h4" /><line x1="9" y1="20" x2="15" y2="20" /><line x1="12" y1="16" x2="12" y2="20" /></>,
  counter: <><rect x="3" y="6" width="18" height="12" rx="2" /><rect x="6" y="8.5" width="12" height="4" rx=".6" /><path d="M6.5 15.6l1.5-2 1.5 2 1.5-2 1.5 2 1.5-2 1.5 2" /></>,
  palette: <><path d="M12 4a8 7 0 1 0 0 14c1.1 0 1.5-.8 1.5-1.6 0-1 .7-1.4 1.6-1.4H17a3 3 0 0 0 3-3c0-4-3.6-7-8-7z" /><circle cx="8.5" cy="10" r=".9" {...F} /><circle cx="12" cy="8" r=".9" {...F} /><circle cx="15" cy="10.5" r=".9" {...F} /></>,
  labframe: <><rect x="3.5" y="4.5" width="17" height="15" rx="2.5" /><path d="M16.6 6.6l.7 1.5 1.6.15-1.2 1.1.36 1.6-1.46-.85-1.46.85.36-1.6-1.2-1.1 1.6-.15z" {...F} /></>,
  chat: <><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5H9l-4 4v-4H5.5A1.5 1.5 0 0 1 4 14.5z" /><path d="M8 8.5h8M8 11.5h5" /></>,
  certificate: <><rect x="5" y="3.5" width="14" height="12" rx="1.5" /><path d="M8 7h8M8 9.5h8M8 12h5" /><circle cx="15.5" cy="17" r="2.4" /><path d="M13.9 18.6l-.9 2.9 2.5-1.4 2.5 1.4-.9-2.9" /></>,
}

export function Icon({ name, size = 24, className, style }: { name: IconName; size?: number; className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} style={style}
      fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  )
}
