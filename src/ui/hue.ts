// The per-world / per-equipment signal hues are tuned for DARK surfaces. On the
// near-white panels of the light theme they fail contrast, so darken them when
// used as an icon/text foreground. Decorative fills (bars, glows) keep the bright hue.
export function darkenHex(hex: string, f = 0.5): string {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim())
  if (!m) return hex
  const n = parseInt(m[1], 16)
  const r = Math.round(((n >> 16) & 255) * f)
  const g = Math.round(((n >> 8) & 255) * f)
  const b = Math.round((n & 255) * f)
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)
}

// Foreground hue that stays legible in both themes.
export const hueFg = (hex: string, theme: string): string => (theme === 'light' ? darkenHex(hex, 0.5) : hex)
