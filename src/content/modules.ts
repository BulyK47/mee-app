import type { Loc } from '../types'
import type { IconName } from '../components/icons'
import { COURSE } from './course'

// The 15 MI2025 lecture modules, in course order. This is the SEQUENCE
// source-of-truth (identity + what you learn + the My-Lab reward), decoupled
// from content availability: a module with no question file yet shows as
// "coming soon". Content lives in ./worlds/<id>.json.
export interface ModuleDef {
  id: string
  order: number
  title: Loc
  icon: IconName
  hue: string
  learn: Loc
  reward?: string // equip id earned free on module completion
}

// Sorted by `order`, not left to the order of the literal below. The ids deliberately do NOT match
// the teaching sequence — M05 is taught fourth, M04 fifth, M13 eleventh — because an id keeps the
// numbering of the source material while `order` carries the sequence. The map and the memorator
// both render this array as-is AND print `order` as the module number, so a module appended out of
// place would show "8." in the sixteenth row. One sort makes `order` the single authority.
const MODULES: ModuleDef[] = [
  { id: 'M01', order: 1, icon: 'ruler', hue: '#38D6E3', reward: 'leads',
    title: { ro: 'Mărimi', en: 'Quantities' },
    learn: { ro: 'Mărimile fizice măsurate și noțiunile de bază ale măsurării.', en: 'The physical quantities we measure and the basics of measurement.' } },
  { id: 'M02', order: 2, icon: 'reference', hue: '#56C7FF', reward: 'breadboard',
    title: { ro: 'Unități de măsură', en: 'Units of measurement' },
    learn: { ro: 'Unități SI, multipli și submultipli, conversii.', en: 'SI units, multiples and submultiples, conversions.' } },
  { id: 'M03', order: 3, icon: 'wave', hue: '#FF6E7C', reward: 'scope',
    title: { ro: 'Semnale', en: 'Signals' },
    learn: { ro: 'Semnale și parametrii lor: perioadă, amplitudine, fază, frecvență.', en: 'Signals and their parameters: period, amplitude, phase, frequency.' } },
  { id: 'M05', order: 4, icon: 'target', hue: '#A78BFA', reward: 'reference',
    title: { ro: 'Erori', en: 'Errors' },
    learn: { ro: 'Erori absolute și relative, clase de exactitate, incertitudine.', en: 'Absolute and relative errors, accuracy classes, uncertainty.' } },
  { id: 'M04', order: 5, icon: 'bridge', hue: '#8AA0FF', reward: 'lcr',
    title: { ro: 'Metode de măsurare', en: 'Measurement methods' },
    learn: { ro: 'Metode: directe/indirecte, amonte/aval, punți, șunt și rezistență adițională.', en: 'Methods: direct/indirect, voltmeter-ammeter/ammeter-voltmeter, bridges, shunt and multiplier.' } },
  { id: 'M06', order: 6, icon: 'gauge', hue: '#2BF5A0', reward: 'analog-vm',
    title: { ro: 'Aparate analogice', en: 'Analog instruments' },
    learn: { ro: 'Aparate analogice: dispozitive, cadrane, clase și simboluri.', en: 'Analog instruments: movements, dials, classes and symbols.' } },
  { id: 'M07', order: 7, icon: 'digits', hue: '#2DD4BF', reward: 'dmm',
    title: { ro: 'Aparate digitale', en: 'Digital instruments' },
    learn: { ro: 'Aparate numerice: rezoluție, cifre, citirea afișajului.', en: 'Digital instruments: resolution, digits, reading the display.' } },
  { id: 'M08', order: 8, icon: 'loop', hue: '#FFB020', reward: 'eload',
    title: { ro: 'Caracteristici statice', en: 'Static characteristics' },
    learn: { ro: 'Caracteristici statice: sensibilitate, clasă, domeniu, liniaritate.', en: 'Static characteristics: sensitivity, class, range, linearity.' } },
  { id: 'M09', order: 9, icon: 'scope', hue: '#FF9E6E', reward: 'fgen',
    title: { ro: 'Caracteristici dinamice', en: 'Dynamic characteristics' },
    learn: { ro: 'Caracteristici dinamice: constantă de timp, timp de creștere, ordinul I.', en: 'Dynamic characteristics: time constant, rise time, first-order response.' } },
  { id: 'M10', order: 10, icon: 'sensor', hue: '#7FE08A', reward: 'daq',
    title: { ro: 'Convertoare de intrare', en: 'Input converters' },
    learn: { ro: 'Filtre și convertoare de intrare: divizoare de tensiune, șunt, adaptarea semnalului.', en: 'Filters and input converters: voltage dividers, shunt, signal conditioning.' } },
  { id: 'M13', order: 11, icon: 'lcr', hue: '#E0B84E', reward: 'current-transformer',
    title: { ro: 'Transformatoare de măsurare', en: 'Instrument transformers' },
    learn: { ro: 'Transformatoare de măsurare de curent și de tensiune.', en: 'Current and voltage instrument transformers.' } },
  { id: 'M11', order: 12, icon: 'fgen', hue: '#C88BFA',
    title: { ro: 'Amplificatoare operaționale', en: 'Operational amplifiers' },
    learn: { ro: 'Amplificatoare operaționale în lanțul de măsurare.', en: 'Operational amplifiers in the measurement chain.' } },
  { id: 'M12', order: 13, icon: 'dmm', hue: '#6EC0FF', reward: 'mcu',
    title: { ro: 'CAD/DAC', en: 'ADC/DAC' },
    learn: { ro: 'Convertoare analog-numerice și numeric-analogice.', en: 'Analog-to-digital and digital-to-analog converters.' } },
  { id: 'M14', order: 14, icon: 'bolt', hue: '#FFC24D', reward: 'clamp',
    title: { ro: 'Măsurarea puterii', en: 'Power measurement' },
    learn: { ro: 'Măsurarea puterii electrice; wattmetrul.', en: 'Measuring electrical power; the wattmeter.' } },
  { id: 'M15', order: 15, icon: 'daq', hue: '#9DB0BC', reward: 'emeter',
    title: { ro: 'Măsurarea energiei', en: 'Energy measurement' },
    learn: { ro: 'Măsurarea energiei electrice; contorul.', en: 'Measuring electrical energy; the meter.' } },
]

export const CURRICULUM: ModuleDef[] = [...MODULES].sort((a, b) => a.order - b.order)

export const moduleDef = (id: string): ModuleDef | undefined => CURRICULUM.find(m => m.id === id)

export function isModuleComplete(id: string, completed: string[]): boolean {
  const w = COURSE.worlds.find(x => x.id === id)
  return !!w && w.lessons.length > 0 && w.lessons.every(l => completed.includes(l.id))
}

// Equipment earned for free by fully completing its module.
export function earnedEquip(completed: string[]): Set<string> {
  const s = new Set<string>()
  for (const m of CURRICULUM) if (m.reward && isModuleComplete(m.id, completed)) s.add(m.reward)
  return s
}
