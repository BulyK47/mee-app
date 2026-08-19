import type { Loc } from '../types'
import type { IconName } from '../components/icons'

export type BenchTheme = 'measurement' | 'research' | 'experiment'

export interface Equip {
  id: string
  name: Loc
  category: Loc
  desc: Loc
  bench: BenchTheme
  cost: number
  icon: IconName
  hex: string
  needsLesson?: string
  needsLabel?: Loc
  isSkin?: boolean                       // cosmetic skin item (not a real instrument)
  skinType?: 'device' | 'lab' | 'wall'   // device recolor, whole-bench template, or wall decoration
  skinFor?: string                       // target: an equip id, or '__lab__' / '__wall__'
  tone?: string                          // the accent applied when the skin is active
}

export const EQUIPMENT: Equip[] = [
  // ——— Measurement ———
  { id: 'analog-vm', bench: 'measurement', cost: 30, icon: 'voltmeter', hex: '#10b981', name: { ro: 'Voltmetru analogic', en: 'Analog voltmeter' }, category: { ro: 'Instrument', en: 'Instrument' }, desc: { ro: 'Indică tensiunea cu ac indicator (pointer) pe cadran.', en: 'Shows voltage with a pointer on a dial.' } },
  { id: 'dmm', bench: 'measurement', cost: 60, icon: 'dmm', hex: '#6366f1', name: { ro: 'Multimetru digital', en: 'Digital multimeter' }, category: { ro: 'Instrument', en: 'Instrument' }, desc: { ro: 'Măsoară tensiune, curent și rezistență cu afișaj digital.', en: 'Measures voltage, current and resistance on a digital display.' } },
  { id: 'scope', bench: 'measurement', cost: 120, icon: 'scope', hex: '#f43f5e', name: { ro: 'Osciloscop', en: 'Oscilloscope' }, category: { ro: 'Instrument', en: 'Instrument' }, desc: { ro: 'Vizualizează forme de undă în timp — amplitudine, perioadă, fază.', en: 'Displays waveforms over time — amplitude, period, phase.' } },
  { id: 'lcr', bench: 'measurement', cost: 150, icon: 'lcr', hex: '#8b5cf6', name: { ro: 'Punte RLC (LCR)', en: 'LCR bridge' }, category: { ro: 'Instrument', en: 'Instrument' }, desc: { ro: 'Măsoară R, L, C și factorul de calitate Q.', en: 'Measures R, L, C and the quality factor Q.' } },
  { id: 'analog-am', bench: 'measurement', cost: 35, icon: 'ammeter', hex: '#22c55e', name: { ro: 'Ampermetru analogic', en: 'Analog ammeter' }, category: { ro: 'Instrument', en: 'Instrument' }, desc: { ro: 'Măsoară curentul cu ac indicator (pointer) pe cadran.', en: 'Measures current with a pointer on a dial.' } },
  { id: 'clamp', bench: 'measurement', cost: 140, icon: 'clamp', hex: '#f59e0b', name: { ro: 'Clește wattmetric', en: 'Clamp power meter' }, category: { ro: 'Instrument', en: 'Instrument' }, desc: { ro: 'Măsoară puterea fără întreruperea circuitului, prin cleștele de curent.', en: 'Measures power without breaking the circuit, using a current clamp.' } },
  { id: 'emeter', bench: 'measurement', cost: 130, icon: 'emeter', hex: '#a855f7', name: { ro: 'Contor de energie', en: 'Energy meter' }, category: { ro: 'Instrument', en: 'Instrument' }, desc: { ro: 'Măsoară energia electrică consumată în timp.', en: 'Measures the electrical energy consumed over time.' } },
  { id: 'current-transformer', bench: 'measurement', cost: 160, icon: 'ct', hex: '#eab308', name: { ro: 'Transformator de curent', en: 'Current transformer' }, category: { ro: 'Transformator', en: 'Transformer' }, desc: { ro: 'Reduce curenți mari la valori măsurabile, izolat de circuit.', en: 'Scales large currents down to measurable values, isolated from the circuit.' } },
  { id: 'voltage-transformer', bench: 'measurement', cost: 160, icon: 'vt', hex: '#f472b6', name: { ro: 'Transformator de tensiune', en: 'Voltage transformer' }, category: { ro: 'Transformator', en: 'Transformer' }, desc: { ro: 'Reduce tensiuni înalte la valori sigure pentru aparate.', en: 'Scales high voltages down to safe values for the instruments.' } },

  // ——— Experiment ———
  { id: 'leads', bench: 'experiment', cost: 10, icon: 'leads', hex: '#64748b', name: { ro: 'Set fire și sonde', en: 'Test leads & probes' }, category: { ro: 'Consumabil', en: 'Consumable' }, desc: { ro: 'Conectezi circuitul de măsurat la instrumente.', en: 'Wire the circuit under test to the instruments.' } },
  { id: 'breadboard', bench: 'experiment', cost: 20, icon: 'breadboard', hex: '#0ea5e9', name: { ro: 'Breadboard', en: 'Breadboard' }, category: { ro: 'Bază', en: 'Basics' }, desc: { ro: 'Montezi rapid circuite fără lipituri.', en: 'Quickly build circuits without soldering.' } },
  { id: 'dc-supply', bench: 'experiment', cost: 40, icon: 'dcsupply', hex: '#14b8a6', name: { ro: 'Sursă de tensiune DC', en: 'DC power supply' }, category: { ro: 'Sursă', en: 'Source' }, desc: { ro: 'Alimentează montajul cu tensiune reglabilă.', en: 'Powers the setup with adjustable voltage.' } },
  { id: 'fgen', bench: 'experiment', cost: 80, icon: 'fgen', hex: '#f97316', name: { ro: 'Generator de funcții', en: 'Function generator' }, category: { ro: 'Sursă', en: 'Source' }, desc: { ro: 'Generează semnale sinus, dreptunghi, triunghi.', en: 'Generates sine, square and triangle signals.' } },
  { id: 'eload', bench: 'experiment', cost: 170, icon: 'eload', hex: '#ef4444', name: { ro: 'Sarcină electronică', en: 'Electronic load' }, category: { ro: 'Sarcină', en: 'Load' }, desc: { ro: 'Simulează o sarcină reglabilă pentru a testa surse și caracteristici statice.', en: 'Simulates an adjustable load to test sources and static characteristics.' } },
  { id: 'ac-supply', bench: 'experiment', cost: 90, icon: 'acsupply', hex: '#fb7185', name: { ro: 'Sursă de tensiune AC', en: 'AC power supply' }, category: { ro: 'Sursă', en: 'Source' }, desc: { ro: 'Alimentează montajul cu tensiune alternativă reglabilă.', en: 'Powers the setup with adjustable AC voltage.' } },
  { id: 'pv-emulator', bench: 'experiment', cost: 150, icon: 'pv', hex: '#facc15', name: { ro: 'Emulator fotovoltaic', en: 'PV emulator' }, category: { ro: 'Sursă', en: 'Source' }, desc: { ro: 'Reproduce caracteristica unui panou fotovoltaic pentru teste.', en: 'Reproduces a solar panel characteristic for testing.' } },
  { id: 'rlc-load', bench: 'experiment', cost: 120, icon: 'rlcload', hex: '#a3e635', name: { ro: 'Sarcină RLC', en: 'RLC load' }, category: { ro: 'Sarcină', en: 'Load' }, desc: { ro: 'Sarcină rezistiv-inductiv-capacitivă reglabilă pentru încercări.', en: 'An adjustable resistive–inductive–capacitive load for experiments.' } },
  { id: 'current-shunt', bench: 'experiment', cost: 45, icon: 'shunt', hex: '#94a3b8', name: { ro: 'Șunt de curent', en: 'Current shunt' }, category: { ro: 'Accesoriu', en: 'Accessory' }, desc: { ro: 'Rezistență calibrată pentru a măsura curentul ca o cădere de tensiune.', en: 'A calibrated resistor to measure current as a voltage drop.' } },

  // ——— Research ———
  { id: 'daq', bench: 'research', cost: 160, icon: 'daq', hex: '#38D6E3', name: { ro: 'Sistem de achiziție (DAQ)', en: 'Data acquisition (DAQ)' }, category: { ro: 'Avansat', en: 'Advanced' }, desc: { ro: 'Achiziționează și digitizează semnale pentru analiză pe PC.', en: 'Acquires and digitizes signals for PC analysis.' } },
  { id: 'spectrum', bench: 'research', cost: 200, icon: 'spectrum', hex: '#A78BFA', name: { ro: 'Analizor de spectru', en: 'Spectrum analyzer' }, category: { ro: 'Avansat', en: 'Advanced' }, desc: { ro: 'Descompune semnalul în componente de frecvență.', en: 'Breaks the signal into its frequency components.' } },
  { id: 'reference', bench: 'research', cost: 180, icon: 'reference', hex: '#FFB020', name: { ro: 'Etalon de referință', en: 'Reference standard' }, category: { ro: 'Etalon', en: 'Standard' }, desc: { ro: 'Referință de precizie pentru etalonare și trasabilitate.', en: 'Precision reference for calibration and traceability.' } },
  { id: 'mcu', bench: 'research', cost: 90, icon: 'mcu', hex: '#38bdf8', name: { ro: 'Microcontroller', en: 'Microcontroller' }, category: { ro: 'Avansat', en: 'Advanced' }, desc: { ro: 'Achiziționează și procesează semnale digital, cu ADC/DAC integrat.', en: 'Acquires and processes signals digitally, with a built-in ADC/DAC.' } },
  { id: 'pc', bench: 'research', cost: 110, icon: 'pc', hex: '#60a5fa', name: { ro: 'Calculator (PC)', en: 'Computer (PC)' }, category: { ro: 'Avansat', en: 'Advanced' }, desc: { ro: 'Colectează, procesează și afișează datele de la instrumente.', en: 'Collects, processes and displays data from the instruments.' } },
  { id: 'freq-counter', bench: 'research', cost: 130, icon: 'counter', hex: '#2dd4bf', name: { ro: 'Frecvențmetru', en: 'Frequency counter' }, category: { ro: 'Instrument', en: 'Instrument' }, desc: { ro: 'Măsoară frecvența și perioada semnalelor cu precizie ridicată.', en: 'Measures signal frequency and period with high precision.' } },
  { id: 'gold-dmm', bench: 'research', cost: 300, icon: 'trophy', hex: '#f59e0b', isSkin: true, skinFor: 'dmm', tone: '#f59e0b', name: { ro: 'Multimetru de precizie (upgrade)', en: 'Precision multimeter (upgrade)' }, category: { ro: 'Upgrade', en: 'Upgrade' }, desc: { ro: 'Upgrade la 4½ digiți, True-RMS și clasă 0,5% — plus aspect auriu.', en: 'Upgrade to 4½ digits, True-RMS and 0.5% class — plus a gold look.' } },
  { id: 'skin-scope-neon', bench: 'research', cost: 220, icon: 'palette', hex: '#38D6E3', isSkin: true, skinFor: 'scope', tone: '#38D6E3', name: { ro: 'Osciloscop 2 canale (upgrade)', en: '2-channel oscilloscope (upgrade)' }, category: { ro: 'Upgrade', en: 'Upgrade' }, desc: { ro: 'Upgrade la 2 canale, 100 MHz și memorie digitală — plus aspect neon.', en: 'Upgrade to 2 channels, 100 MHz and digital memory — plus a neon look.' } },
  { id: 'skin-analog-brass', bench: 'research', cost: 200, icon: 'palette', hex: '#C08A3E', isSkin: true, skinFor: 'analog-vm', tone: '#C08A3E', name: { ro: 'Voltmetru clasă 0,5 (upgrade)', en: 'Class-0.5 voltmeter (upgrade)' }, category: { ro: 'Upgrade', en: 'Upgrade' }, desc: { ro: 'Upgrade la clasă 0,5 și scală cu oglindă antiparalaxă — plus aspect alamă.', en: 'Upgrade to class 0.5 and an anti-parallax mirror scale — plus a brass look.' } },

  // Lab-template skins (whole-bench frame + glow + ★ PREMIUM badge) and a wall accreditation
  { id: 'lab-bronze', bench: 'research', cost: 250, icon: 'labframe', hex: '#cd7f32', isSkin: true, skinType: 'lab', skinFor: '__lab__', tone: '#cd7f32', name: { ro: 'Șablon laborator — Bronz', en: 'Lab template — Bronze' }, category: { ro: 'Șablon (skin)', en: 'Template (skin)' }, desc: { ro: 'Ramă premium bronz cu glow și insignă ★ PREMIUM pentru întregul banc.', en: 'Bronze premium frame with glow and a ★ PREMIUM badge around the whole bench.' } },
  { id: 'lab-silver', bench: 'research', cost: 400, icon: 'labframe', hex: '#cbd5e1', isSkin: true, skinType: 'lab', skinFor: '__lab__', tone: '#cbd5e1', name: { ro: 'Șablon laborator — Argint', en: 'Lab template — Silver' }, category: { ro: 'Șablon (skin)', en: 'Template (skin)' }, desc: { ro: 'Ramă premium argintie cu glow și insignă ★ PREMIUM pentru întregul banc.', en: 'Silver premium frame with glow and a ★ PREMIUM badge around the whole bench.' } },
  { id: 'lab-gold', bench: 'research', cost: 600, icon: 'labframe', hex: '#fbbf24', isSkin: true, skinType: 'lab', skinFor: '__lab__', tone: '#fbbf24', name: { ro: 'Șablon laborator — Aur', en: 'Lab template — Gold' }, category: { ro: 'Șablon (skin)', en: 'Template (skin)' }, desc: { ro: 'Ramă premium aurie cu glow și insignă ★ PREMIUM pentru întregul banc.', en: 'Gold premium frame with glow and a ★ PREMIUM badge around the whole bench.' } },
  { id: 'accreditation', bench: 'research', cost: 350, icon: 'certificate', hex: '#e0b84e', isSkin: true, skinType: 'wall', skinFor: '__wall__', tone: '#e0b84e', name: { ro: 'Acreditare laborator', en: 'Lab accreditation' }, category: { ro: 'Perete (skin)', en: 'Wall (skin)' }, desc: { ro: 'Certificat de acreditare cu sigiliu, afișat pe peretele laboratorului.', en: 'An accreditation certificate with a seal, on the lab wall.' } },
]
