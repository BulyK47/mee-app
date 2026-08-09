// Tiny isometric helper: project world (X,Y,Z) to screen and build box/tile polygons.
export type Pt = { x: number; y: number }
const AX: Pt = { x: 0.866, y: 0.5 }   // +X → down-right
const AY: Pt = { x: -0.866, y: 0.5 }  // +Y → down-left   (+Z is up)

export function proj(o: Pt, s: number, X: number, Y: number, Z: number): Pt {
  return { x: o.x + (X * AX.x + Y * AY.x) * s, y: o.y + (X * AX.y + Y * AY.y - Z) * s }
}

const join = (a: Pt[]) => a.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

export function boxFaces(o: Pt, s: number, X: number, Y: number, Z: number, wx: number, wy: number, hz: number) {
  const P = (x: number, y: number, z: number) => proj(o, s, X + x, Y + y, Z + z)
  return {
    top: join([P(0, 0, hz), P(wx, 0, hz), P(wx, wy, hz), P(0, wy, hz)]),
    right: join([P(wx, 0, 0), P(wx, wy, 0), P(wx, wy, hz), P(wx, 0, hz)]),
    left: join([P(0, wy, 0), P(wx, wy, 0), P(wx, wy, hz), P(0, wy, hz)]),
  }
}

export function quad(o: Pt, s: number, c: number[][]) {
  return join(c.map(([X, Y, Z]) => proj(o, s, X, Y, Z)))
}

export function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.min(255, Math.round(((n >> 16) & 255) * f))
  const g = Math.min(255, Math.round(((n >> 8) & 255) * f))
  const b = Math.min(255, Math.round((n & 255) * f))
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
}
