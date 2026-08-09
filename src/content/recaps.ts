export interface Recap {
  worldId: string
  title: { ro: string; en: string }
  items: { ro: string; en: string }[]
  formulas?: { ro: string; en: string }[]
}

// Same two-location scan as the question bank (see ./course.ts): the demo recap ships with the
// public source, the real ones live in the private content folder and win when present.
const files = {
  ...import.meta.glob('./recaps/*.json', { eager: true }),
  ...import.meta.glob('../../content-private/recaps/*.json', { eager: true }),
} as Record<string, unknown>

const map: Record<string, Recap> = {}
for (const m of Object.values(files)) {
  const r = ((m as { default?: unknown }).default ?? m) as Recap & { demo?: boolean }
  if (!r || !r.worldId || !Array.isArray(r.items) || !r.items.length) continue
  if (r.demo && map[r.worldId] && !(map[r.worldId] as Recap & { demo?: boolean }).demo) continue
  map[r.worldId] = r
}

export const recapFor = (worldId: string): Recap | undefined => map[worldId]
