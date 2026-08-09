import type { Loc } from '../types'

export interface EquipInfo { specs: Loc; principle: Loc; upgradeSpecs?: Loc; glossary?: Loc[] }

// Technical content per equipment id: spec line, working principle, optional upgrade
// specs (upgrade skins) and a plain-language glossary of the key spec parameters.
// Generated from the equipment-info + glossary workflows; edit freely.
export const EQUIP_INFO: Record<string, EquipInfo> = {
  "analog-vm": {
    "specs": {
      "ro": "c.c. · 0–30 V · magnetoelectric · clasă 1,5 · Ri ≈ 20 kΩ/V",
      "en": "DC · 0–30 V · moving-coil · class 1.5 · Ri ≈ 20 kΩ/V"
    },
    "principle": {
      "ro": "Curentul dat de tensiunea măsurată trece printr-o bobină mobilă într-un câmp magnetic; cuplul rezultat rotește acul proporțional cu tensiunea, deci scara este liniară.",
      "en": "The current driven by the measured voltage flows through a coil suspended in a magnetic field; the resulting torque deflects the pointer in proportion to the voltage, giving a linear scale."
    },
    "glossary": [
      {
        "ro": "magnetoelectric — bobină mobilă într-un câmp de magnet permanent; deviația acului e proporțională cu curentul (doar c.c.), deci scara e liniară",
        "en": "moving-coil — a coil swinging in a permanent-magnet field; pointer deflection is proportional to current (DC only), so the scale is linear"
      },
      {
        "ro": "clasă 1,5 — clasă de precizie: eroarea maximă e 1,5% din valoarea capătului de scară (nu din citire)",
        "en": "class 1.5 — accuracy class: the maximum error is 1.5% of the full-scale value (not of the reading)"
      },
      {
        "ro": "Ri ≈ 20 kΩ/V — rezistență de intrare de 20 kΩ pentru fiecare volt de capăt de scară; cu cât e mai mare, cu atât instrumentul încarcă mai puțin circuitul",
        "en": "Ri ≈ 20 kΩ/V — input resistance of 20 kΩ per volt of full scale; the higher it is, the less the meter loads the circuit"
      }
    ]
  },
  "dmm": {
    "specs": {
      "ro": "3½ digiți · V/A/Ω · c.c./c.a. · precizie ±0,5% · Ri 10 MΩ",
      "en": "3½ digits · V/A/Ω · DC/AC · accuracy ±0.5% · Ri 10 MΩ"
    },
    "principle": {
      "ro": "Un convertor analog-digital transformă mărimea electrică într-un număr afișat; impedanța mare de intrare (10 MΩ) încarcă neglijabil circuitul măsurat, iar rezoluția digitală elimină erorile de citire ale acului.",
      "en": "An analog-to-digital converter turns the electrical quantity into a displayed number; the high input impedance (10 MΩ) barely loads the circuit under test, and the digital readout removes pointer reading errors."
    },
    "glossary": [
      {
        "ro": "3½ digiți — 3 cifre complete plus una care afișează doar 0 sau 1; citire maximă 1999 (rezoluție de ~2000 de trepte)",
        "en": "3½ digits — 3 full digits plus one that shows only 0 or 1; maximum reading 1999 (about 2000 counts of resolution)"
      },
      {
        "ro": "precizie ±0,5% — incertitudinea citirii: valoarea afișată poate devia cu 0,5% din citire față de cea reală",
        "en": "accuracy ±0.5% — reading uncertainty: the displayed value may differ from the true one by 0.5% of reading"
      },
      {
        "ro": "Ri 10 MΩ — impedanță de intrare de 10 MΩ pe scările de tensiune; foarte mare, deci încarcă neglijabil circuitul măsurat",
        "en": "Ri 10 MΩ — 10 MΩ input impedance on voltage ranges; very high, so it barely loads the measured circuit"
      }
    ]
  },
  "scope": {
    "specs": {
      "ro": "1 canal · 1 MHz · analogic · Ri 1 MΩ · bază de timp reglabilă",
      "en": "1 channel · 1 MHz · analog · Ri 1 MΩ · adjustable timebase"
    },
    "principle": {
      "ro": "Tensiunea de intrare deviază pe verticală un spot pe ecran, în timp ce baza de timp îl mișcă uniform pe orizontală, trasând astfel forma de undă tensiune-timp din care citești amplitudine, perioadă și fază.",
      "en": "The input voltage deflects a spot vertically on the screen while the timebase sweeps it steadily across the horizontal, tracing the voltage-vs-time waveform from which you read amplitude, period and phase."
    },
    "glossary": [
      {
        "ro": "1 MHz — banda de frecvență: cea mai mare frecvență a semnalului pe care o poate afișa fidel, fără atenuare importantă",
        "en": "1 MHz — bandwidth: the highest signal frequency it can display faithfully, without significant attenuation"
      },
      {
        "ro": "Ri 1 MΩ — impedanța de intrare standard a osciloscopului (1 MΩ în paralel cu o mică capacitate), la care se raportează sondele",
        "en": "Ri 1 MΩ — the oscilloscope's standard input impedance (1 MΩ in parallel with a small capacitance), the reference for the probes"
      },
      {
        "ro": "bază de timp reglabilă — viteza de baleiaj orizontal (s/div), care stabilește câte perioade ale semnalului încap pe ecran",
        "en": "adjustable timebase — the horizontal sweep speed (s/div), which sets how many signal periods fit on the screen"
      }
    ]
  },
  "lcr": {
    "specs": {
      "ro": "R/L/C/Q · test 1 kHz · precizie ±0,5% · punte de echilibrare",
      "en": "R/L/C/Q · 1 kHz test · accuracy ±0.5% · balancing bridge"
    },
    "principle": {
      "ro": "Aplică pe componentă un semnal de test și, echilibrând o punte de măsură, determină impedanța complexă din care deduce R, L sau C împreună cu factorul de calitate Q ce arată cât de „pură” este componenta.",
      "en": "It applies a test signal to the component and, by balancing a measuring bridge, finds the complex impedance from which it derives R, L or C together with the quality factor Q that shows how 'pure' the component is."
    },
    "upgradeSpecs": {
      "ro": "R/L/C/Q/D/ESR · test 100 Hz–10 kHz · precizie ±0,1% · afișaj digital",
      "en": "R/L/C/Q/D/ESR · 100 Hz–10 kHz test · accuracy ±0.1% · digital display"
    },
    "glossary": [
      {
        "ro": "Q — factor de calitate: raportul dintre energia stocată și cea pierdută într-o bobină sau condensator; Q mare = componentă „pură”, cu pierderi mici",
        "en": "Q — quality factor: the ratio of stored to dissipated energy in a coil or capacitor; high Q = a 'pure' component with low losses"
      },
      {
        "ro": "test 1 kHz — frecvența semnalului de test aplicat componentei; L și C se măsoară la această frecvență (impedanța depinde de ea)",
        "en": "1 kHz test — the frequency of the test signal applied to the component; L and C are measured at this frequency (impedance depends on it)"
      },
      {
        "ro": "punte de echilibrare — metodă de măsurare prin echilibrarea a patru brațe de impedanță; la nul, impedanța necunoscută rezultă din celelalte trei",
        "en": "balancing bridge — a measurement method that balances four impedance arms; at null, the unknown impedance is found from the other three"
      }
    ]
  },
  "analog-am": {
    "specs": {
      "ro": "c.c. · 0–1 A · magnetoelectric · clasă 1,5 · șunt intern",
      "en": "DC · 0–1 A · moving-coil · class 1.5 · internal shunt"
    },
    "principle": {
      "ro": "Curentul de măsurat trece direct prin bobina mobilă, iar cuplul din câmpul magnetic rotește acul proporțional cu curentul; instrumentul se leagă în serie și are rezistență foarte mică pentru a nu perturba circuitul.",
      "en": "The current to be measured flows straight through the moving coil, and the torque from the magnetic field deflects the pointer in proportion to the current; the meter is wired in series and has very low resistance so it barely disturbs the circuit."
    },
    "upgradeSpecs": {
      "ro": "c.c./c.a. · 0–10 A · multiscară · clasă 1,0 · șunturi comutabile",
      "en": "DC/AC · 0–10 A · multi-range · class 1.0 · switchable shunts"
    },
    "glossary": [
      {
        "ro": "magnetoelectric — bobină mobilă într-un câmp magnetic; acul deviază proporțional cu curentul (doar c.c.), scară liniară",
        "en": "moving-coil — a coil swinging in a magnetic field; the pointer deflects in proportion to current (DC only), linear scale"
      },
      {
        "ro": "clasă 1,5 — clasă de precizie: eroarea maximă e 1,5% din valoarea capătului de scară",
        "en": "class 1.5 — accuracy class: the maximum error is 1.5% of the full-scale value"
      },
      {
        "ro": "șunt intern — rezistență mică în paralel cu bobina, care preia majoritatea curentului, extinzând domeniul până la 1 A; se leagă în serie cu circuitul",
        "en": "internal shunt — a small resistor in parallel with the coil that carries most of the current, extending the range up to 1 A; wired in series with the circuit"
      }
    ]
  },
  "clamp": {
    "specs": {
      "ro": "c.a. · 0–100 A · P/U/I · fără contact galvanic · precizie ±2%",
      "en": "AC · 0–100 A · P/U/I · no galvanic contact · accuracy ±2%"
    },
    "principle": {
      "ro": "Cleștele feromagnetic se închide în jurul unui conductor și captează câmpul magnetic al curentului ca un transformator de curent; combinat cu tensiunea măsurată la borne, aparatul calculează puterea fără a întrerupe circuitul.",
      "en": "The ferromagnetic jaw closes around a conductor and picks up the current's magnetic field like a current transformer; combined with the voltage measured at the terminals, the meter computes power without breaking the circuit."
    },
    "upgradeSpecs": {
      "ro": "c.a./c.c. · 0–600 A · P/S/Q/cos φ · True-RMS · precizie ±1%",
      "en": "AC/DC · 0–600 A · P/S/Q/cos φ · True-RMS · accuracy ±1%"
    },
    "glossary": [
      {
        "ro": "fără contact galvanic — măsoară curentul din câmpul magnetic al conductorului, fără a-l atinge sau întrerupe (cleștele funcționează ca un transformator de curent)",
        "en": "no galvanic contact — it senses current from the conductor's magnetic field, without touching or breaking it (the jaw works like a current transformer)"
      },
      {
        "ro": "P/U/I — mărimile afișate: putere (P), tensiune (U) și curent (I)",
        "en": "P/U/I — the displayed quantities: power (P), voltage (U) and current (I)"
      },
      {
        "ro": "precizie ±2% — incertitudinea măsurării: eroarea tipică e 2% din citire, mai mare decât la instrumentele de contact",
        "en": "accuracy ±2% — measurement uncertainty: typical error is 2% of reading, larger than for contact instruments"
      }
    ]
  },
  "emeter": {
    "specs": {
      "ro": "230 V · 0–20 A · kWh monofazat · clasă 1 · ~1000 imp/kWh",
      "en": "230 V · 0–20 A · single-phase kWh · class 1 · ~1000 imp/kWh"
    },
    "principle": {
      "ro": "Măsoară simultan tensiunea și curentul, calculează puterea instantanee p = u·i și o integrează în timp, obținând energia în kWh; fiecare cantitate de energie consumată este marcată printr-un impuls.",
      "en": "It measures voltage and current at the same time, computes the instantaneous power p = u·i and integrates it over time to get energy in kWh; each unit of energy consumed is marked by an output pulse."
    },
    "upgradeSpecs": {
      "ro": "3×230/400 V · trifazat · kWh + kvarh · clasă 0,5S · interfață digitală",
      "en": "3×230/400 V · three-phase · kWh + kvarh · class 0.5S · digital interface"
    },
    "glossary": [
      {
        "ro": "kWh monofazat — energie în kilowați-oră (putere × timp) măsurată pe o singură fază; unitatea de facturare a energiei electrice",
        "en": "single-phase kWh — energy in kilowatt-hours (power × time) measured on a single phase; the billing unit for electrical energy"
      },
      {
        "ro": "clasă 1 — clasă de precizie a contorului: eroarea de măsurare a energiei rămâne în ±1%",
        "en": "class 1 — the meter's accuracy class: the energy measurement error stays within ±1%"
      },
      {
        "ro": "~1000 imp/kWh — constanta contorului: emite ~1000 de impulsuri pentru fiecare kWh consumat, deci un impuls ≈ 1 Wh (util la verificare)",
        "en": "~1000 imp/kWh — the meter constant: it emits ~1000 pulses per kWh consumed, so one pulse ≈ 1 Wh (useful for testing)"
      }
    ]
  },
  "current-transformer": {
    "specs": {
      "ro": "100/5 A · secundar 5 A · clasă 0,5 · c.a. 50 Hz · izolat",
      "en": "100/5 A · 5 A secondary · class 0.5 · 50 Hz AC · isolated"
    },
    "principle": {
      "ro": "Conductorul cu curent mare formează primarul, iar înfășurarea secundară cu multe spire livrează un curent proporțional, redus (aici 5 A); ampermetrul se leagă la secundar, izolat galvanic de înalta tensiune și de curentul mare.",
      "en": "The high-current conductor acts as the primary, while the many-turn secondary winding delivers a proportional, scaled-down current (here 5 A); the ammeter connects to the secondary, galvanically isolated from the high voltage and large current."
    },
    "upgradeSpecs": {
      "ro": "600/5 A · raporturi comutabile · clasă 0,2 · miez cu pierderi reduse",
      "en": "600/5 A · switchable ratios · class 0.2 · low-loss core"
    },
    "glossary": [
      {
        "ro": "100/5 A — raport de transformare: 100 A prin primar dau 5 A în secundar; curentul mare e redus la o valoare standard măsurabilă",
        "en": "100/5 A — transformation ratio: 100 A through the primary yields 5 A in the secondary; the large current is scaled down to a measurable standard value"
      },
      {
        "ro": "secundar 5 A — curentul nominal la ieșire (5 A este valoarea standardizată la care se leagă ampermetrul)",
        "en": "5 A secondary — the rated output current (5 A is the standardized value the ammeter connects to)"
      },
      {
        "ro": "clasă 0,5 — clasă de precizie: eroarea de raport rămâne sub 0,5%, deci reproduce fidel curentul primar",
        "en": "class 0.5 — accuracy class: the ratio error stays below 0.5%, so it faithfully reproduces the primary current"
      }
    ]
  },
  "voltage-transformer": {
    "specs": {
      "ro": "6000/100 V · secundar 100 V · clasă 0,5 · c.a. 50 Hz · izolat",
      "en": "6000/100 V · 100 V secondary · class 0.5 · 50 Hz AC · isolated"
    },
    "principle": {
      "ro": "Funcționează ca un transformator coborâtor cu raport de spire precis, aducând tensiunea înaltă la o valoare standard sigură (aici 100 V) proporțională cu cea reală; voltmetrul se leagă la secundar, izolat de rețeaua de înaltă tensiune.",
      "en": "It works as a step-down transformer with a precise turns ratio, bringing the high voltage down to a safe standard value (here 100 V) proportional to the real one; the voltmeter connects to the secondary, isolated from the high-voltage network."
    },
    "upgradeSpecs": {
      "ro": "20000/100 V · clasă 0,2 · burden reglabil · pentru rețele de MT",
      "en": "20000/100 V · class 0.2 · adjustable burden · for MV networks"
    },
    "glossary": [
      {
        "ro": "6000/100 V — raport de transformare: 6000 V pe primar dau 100 V pe secundar; tensiunea înaltă e coborâtă la o valoare standard sigură",
        "en": "6000/100 V — transformation ratio: 6000 V on the primary gives 100 V on the secondary; the high voltage is stepped down to a safe standard value"
      },
      {
        "ro": "secundar 100 V — tensiunea nominală la ieșire (100 V este valoarea standardizată la care se leagă voltmetrul)",
        "en": "100 V secondary — the rated output voltage (100 V is the standardized value the voltmeter connects to)"
      },
      {
        "ro": "clasă 0,5 — clasă de precizie: eroarea de raport rămâne sub 0,5%, deci reflectă fidel tensiunea primară",
        "en": "class 0.5 — accuracy class: the ratio error stays below 0.5%, so it faithfully reflects the primary voltage"
      }
    ]
  },
  "leads": {
    "specs": {
      "ro": "banană 4 mm · cârlige și crocodili · 1000 V CAT II · 10 A",
      "en": "4 mm banana · hook & crocodile clips · 1000 V CAT II · 10 A"
    },
    "principle": {
      "ro": "Firele izolate cu conectori banană și sonde transportă semnalul de la circuitul de măsurat la borna instrumentului, cu rezistență de contact neglijabilă ca să nu falsifice citirea.",
      "en": "Insulated wires with banana connectors and probes carry the signal from the circuit under test to the instrument's terminal, with negligible contact resistance so they don't corrupt the reading."
    },
    "glossary": [
      {
        "ro": "banană 4 mm — conector cilindric standard de 4 mm care intră în borna aparatului",
        "en": "4 mm banana — standard 4 mm cylindrical plug that fits the instrument's terminal"
      },
      {
        "ro": "1000 V CAT II — tensiune maximă admisă; CAT II = categoria de măsurare pentru prize/aparate casnice, cu rezistență la supratensiuni tranzitorii",
        "en": "1000 V CAT II — max rated voltage; CAT II = measurement category for socket-outlet/appliance circuits, rated to withstand transient overvoltages"
      },
      {
        "ro": "10 A — curentul maxim pe care îl poate transporta firul fără să se supraîncălzească",
        "en": "10 A — maximum current the lead can carry without overheating"
      }
    ]
  },
  "breadboard": {
    "specs": {
      "ro": "830 puncte · pas 2,54 mm · șine de alimentare · max ~1 A / punct",
      "en": "830 tie-points · 2.54 mm pitch · power rails · ~1 A / point max"
    },
    "principle": {
      "ro": "Contactele metalice cu arc din interior leagă electric coloanele de găuri, așa că montezi și modifici circuite prin simplă inserare a terminalelor, fără lipituri.",
      "en": "Spring metal clips inside electrically join columns of holes, so you build and change circuits just by pushing in component leads, with no soldering."
    },
    "glossary": [
      {
        "ro": "830 puncte — 830 de găuri de contact (tie-points) în care poți insera terminale",
        "en": "830 tie-points — 830 contact holes into which you can insert component leads"
      },
      {
        "ro": "pas 2,54 mm — distanța dintre găuri, egală cu 0,1 inch, standardul terminalelor de circuit integrat",
        "en": "2.54 mm pitch — hole-to-hole spacing, equal to 0.1 inch, the standard for IC pin leads"
      },
      {
        "ro": "~1 A / punct — curentul maxim pe care îl suportă un singur contact cu arc",
        "en": "~1 A / point — maximum current a single spring contact can handle"
      }
    ]
  },
  "dc-supply": {
    "specs": {
      "ro": "0–30 V · 0–3 A · reglaj CV/CC · riplu < 5 mV",
      "en": "0–30 V · 0–3 A · CV/CC regulation · ripple < 5 mV"
    },
    "principle": {
      "ro": "Redresează și stabilizează tensiunea de la rețea, menținând constantă tensiunea impusă (mod CV) sau limitând curentul (mod CC) ca să protejeze montajul.",
      "en": "It rectifies and regulates the mains voltage, holding the set voltage constant (CV mode) or limiting the current (CC mode) to protect the circuit."
    },
    "glossary": [
      {
        "ro": "reglaj CV/CC — două regimuri: tensiune constantă (Constant Voltage) sau curent constant (Constant Current), sursa trecând automat în CC ca limitare de protecție",
        "en": "CV/CC regulation — two modes: Constant Voltage or Constant Current, the supply switching automatically into CC as a protective limit"
      },
      {
        "ro": "riplu < 5 mV — reziduul de tensiune alternativă rămas peste tensiunea continuă după redresare și filtrare (sub 5 mV)",
        "en": "ripple < 5 mV — residual AC voltage left on top of the DC after rectifying and filtering (below 5 mV)"
      }
    ]
  },
  "fgen": {
    "specs": {
      "ro": "sinus/dreptunghi/triunghi · 1 Hz–2 MHz · 0–10 Vvv · ieșire 50 Ω",
      "en": "sine/square/triangle · 1 Hz–2 MHz · 0–10 Vpp · 50 Ω output"
    },
    "principle": {
      "ro": "Sintetizează forme de undă periodice cu frecvență și amplitudine reglabile, oferind semnalul de test cu care studiezi răspunsul în frecvență al unui circuit.",
      "en": "It synthesizes periodic waveforms with adjustable frequency and amplitude, providing the test signal you use to study a circuit's frequency response."
    },
    "glossary": [
      {
        "ro": "0–10 Vvv — amplitudine în volți vârf-la-vârf, adică distanța totală de la minimul la maximul semnalului",
        "en": "0–10 Vpp — amplitude in volts peak-to-peak, i.e. the full swing from the signal's minimum to its maximum"
      },
      {
        "ro": "ieșire 50 Ω — impedanța internă de ieșire de 50 Ω; se adaptează cu o sarcină de 50 Ω pentru transfer corect și fără reflexii",
        "en": "50 Ω output — 50 Ω internal output impedance; matched to a 50 Ω load for correct, reflection-free signal transfer"
      },
      {
        "ro": "1 Hz–2 MHz — domeniul de frecvențe reglabile pe care le poate genera",
        "en": "1 Hz–2 MHz — the range of adjustable frequencies it can generate"
      }
    ]
  },
  "eload": {
    "specs": {
      "ro": "moduri CC/CV/CR/CP · 0–30 A · 0–80 V · 150 W",
      "en": "CC/CV/CR/CP modes · 0–30 A · 0–80 V · 150 W"
    },
    "principle": {
      "ro": "Un tranzistor de putere disipă energia sursei testate menținând constant curentul, tensiunea, rezistența sau puterea, ca să ridici caracteristica statică a unei surse sau baterii.",
      "en": "A power transistor dissipates the tested source's energy while holding current, voltage, resistance or power constant, so you can plot the static characteristic of a supply or battery."
    },
    "glossary": [
      {
        "ro": "moduri CC/CV/CR/CP — sarcina menține constant curentul (CC), tensiunea (CV), rezistența (CR) sau puterea (CP) absorbită",
        "en": "CC/CV/CR/CP modes — the load holds constant the drawn current (CC), voltage (CV), resistance (CR) or power (CP)"
      },
      {
        "ro": "150 W — puterea maximă pe care o poate disipa (produsul tensiune × curent nu trebuie depășit)",
        "en": "150 W — maximum power it can dissipate (the voltage × current product must not be exceeded)"
      }
    ]
  },
  "ac-supply": {
    "specs": {
      "ro": "0–250 Vef · 50/60 Hz · 500 VA · izolare prin transformator",
      "en": "0–250 Vrms · 50/60 Hz · 500 VA · transformer isolation"
    },
    "principle": {
      "ro": "Furnizează tensiune alternativă reglabilă și izolată galvanic de rețea, ca să alimentezi și să încerci în siguranță montaje de curent alternativ.",
      "en": "It supplies an adjustable AC voltage, galvanically isolated from the mains, so you can safely power and test alternating-current circuits."
    },
    "glossary": [
      {
        "ro": "0–250 Vef — tensiune efectivă (RMS), valoarea echivalentă în putere a alternativei; valoarea de vârf este de √2 ori mai mare (~354 V)",
        "en": "0–250 Vrms — RMS (effective) voltage, the power-equivalent value of the AC; the peak is √2 times higher (~354 V)"
      },
      {
        "ro": "500 VA — puterea aparentă maximă (volt-amperi), produsul tensiune × curent; la sarcini reactive diferă de puterea activă în wați",
        "en": "500 VA — maximum apparent power (volt-amperes), the voltage × current product; for reactive loads it differs from real power in watts"
      },
      {
        "ro": "izolare prin transformator — un transformator separă galvanic ieșirea de rețea, eliminând legătura directă la nul/împământare pentru siguranță",
        "en": "transformer isolation — a transformer galvanically separates the output from the mains, removing the direct neutral/earth connection for safety"
      }
    ]
  },
  "pv-emulator": {
    "specs": {
      "ro": "0–60 V · 0–8 A · 300 W · caracteristică I-V programabilă",
      "en": "0–60 V · 0–8 A · 300 W · programmable I–V curve"
    },
    "principle": {
      "ro": "Reproduce electronic caracteristica neliniară curent-tensiune a unui panou solar, inclusiv punctul de putere maximă, ca să testezi convertoare și algoritmi MPPT fără soare real.",
      "en": "It electronically reproduces a solar panel's nonlinear current–voltage curve, including the maximum-power point, so you can test converters and MPPT algorithms without real sunlight."
    },
    "glossary": [
      {
        "ro": "caracteristică I-V programabilă — poți impune curba curent-tensiune a panoului, inclusiv genunchiul și punctul de putere maximă (MPP)",
        "en": "programmable I–V curve — you can set the panel's current–voltage curve, including the knee and the maximum-power point (MPP)"
      },
      {
        "ro": "300 W — puterea maximă de ieșire pe care o poate furniza emulatorul",
        "en": "300 W — maximum output power the emulator can deliver"
      }
    ]
  },
  "rlc-load": {
    "specs": {
      "ro": "R·L·C comutabile în trepte · max 230 V · max 3 A · 50 Hz",
      "en": "switchable R·L·C steps · 230 V max · 3 A max · 50 Hz"
    },
    "principle": {
      "ro": "Combină rezistențe, bobine și condensatoare comutabile pentru a impune un defazaj și un factor de putere ales, ca să studiezi comportamentul sarcinilor reactive în curent alternativ.",
      "en": "It combines switchable resistors, inductors and capacitors to set a chosen phase shift and power factor, so you can study how reactive loads behave under AC."
    },
    "glossary": [
      {
        "ro": "R·L·C comutabile în trepte — rezistoare, bobine și condensatoare care se conectează în trepte discrete cu comutatoare, nu continuu",
        "en": "switchable R·L·C steps — resistors, inductors and capacitors connected in discrete switch-selected steps, not continuously"
      },
      {
        "ro": "max 230 V / max 3 A — tensiunea și curentul maxime admise ale sarcinii la 50 Hz",
        "en": "230 V / 3 A max — the load's maximum allowed voltage and current at 50 Hz"
      }
    ]
  },
  "current-shunt": {
    "specs": {
      "ro": "0,1 Ω · clasă 0,5 (±0,5 %) · 5 A",
      "en": "0.1 Ω · class 0.5 (±0.5 %) · 5 A"
    },
    "principle": {
      "ro": "Curentul care trece printr-o rezistență calibrată foarte mică produce, conform legii lui Ohm, o cădere de tensiune proporțională pe care voltmetrul o citește ca măsură a curentului.",
      "en": "Current through a small calibrated resistor produces, by Ohm's law, a proportional voltage drop that the voltmeter reads as a measure of the current."
    },
    "glossary": [
      {
        "ro": "0,1 Ω — rezistența calibrată mică; la 5 A dă o cădere de 0,5 V (U = R·I) pe care o citește voltmetrul",
        "en": "0.1 Ω — the small calibrated resistance; at 5 A it gives a 0.5 V drop (U = R·I) that the voltmeter reads"
      },
      {
        "ro": "clasă 0,5 (±0,5 %) — șuntul este o MĂSURĂ, nu un aparat indicator: clasa lui este chiar toleranța pe valoarea nominală, adică rezistența reală se află în ±0,5 % în jurul celor 0,1 Ω marcați (nu se raportează la un capăt de scară)",
        "en": "class 0.5 (±0.5 %) — a shunt is a MATERIAL MEASURE, not an indicating instrument: its class IS the tolerance on the nominal value, i.e. the real resistance lies within ±0.5 % of the marked 0.1 Ω (it is not referred to a full-scale value)"
      }
    ]
  },
  "daq": {
    "specs": {
      "ro": "8 canale · 16 biți · 250 kS/s · USB",
      "en": "8 channels · 16-bit · 250 kS/s · USB"
    },
    "principle": {
      "ro": "Eșantionează tensiunile de intrare cu un convertor analog-numeric și le trimite pe USB către PC, transformând mărimi analogice în șiruri de date pentru analiză și înregistrare.",
      "en": "It samples input voltages with an analog-to-digital converter and streams them over USB to the PC, turning analog quantities into data series for analysis and logging."
    },
    "glossary": [
      {
        "ro": "16 biți — 65536 de trepte de rezoluție a convertorului analog-numeric",
        "en": "16-bit — 65536 resolution steps of the analog-to-digital converter"
      },
      {
        "ro": "250 kS/s — 250.000 de eșantioane pe secundă (rata de digitizare)",
        "en": "250 kS/s — 250,000 samples per second (digitizing rate)"
      },
      {
        "ro": "8 canale — 8 intrări analogice măsurate în paralel",
        "en": "8 channels — 8 analog inputs measured in parallel"
      }
    ]
  },
  "spectrum": {
    "specs": {
      "ro": "9 kHz–1,5 GHz · RBW 1 kHz · −80 dBm",
      "en": "9 kHz–1.5 GHz · RBW 1 kHz · −80 dBm"
    },
    "principle": {
      "ro": "Descompune semnalul în componentele sale de frecvență și afișează amplitudinea (dBm) în funcție de frecvență, dezvăluind armonicile și zgomotul pe care osciloscopul, care lucrează în timp, nu le separă.",
      "en": "It decomposes the signal into its frequency components and plots amplitude (dBm) versus frequency, revealing harmonics and noise that a time-domain oscilloscope cannot separate."
    },
    "glossary": [
      {
        "ro": "RBW 1 kHz — lățimea de bandă de rezoluție: două vârfuri mai apropiate de 1 kHz nu se mai pot separa",
        "en": "RBW 1 kHz — resolution bandwidth: two peaks closer than 1 kHz can no longer be told apart"
      },
      {
        "ro": "−80 dBm — nivelul minim de semnal detectabil (dBm = putere raportată la 1 mW, în scară logaritmică)",
        "en": "−80 dBm — smallest detectable signal level (dBm = power referenced to 1 mW, on a log scale)"
      },
      {
        "ro": "9 kHz–1,5 GHz — domeniul de frecvențe pe care le poate analiza",
        "en": "9 kHz–1.5 GHz — the range of frequencies it can analyze"
      }
    ]
  },
  "reference": {
    "specs": {
      "ro": "10,000 V · ±5 ppm/an · coeficient 2 ppm/°C",
      "en": "10.000 V · ±5 ppm/year · 2 ppm/°C tempco"
    },
    "principle": {
      "ro": "Furnizează o tensiune extrem de stabilă și precis cunoscută, față de care se etalonează celelalte instrumente, asigurând trasabilitatea măsurărilor la standardele naționale.",
      "en": "It provides an extremely stable, precisely known voltage against which other instruments are calibrated, giving measurements traceability to national standards."
    },
    "glossary": [
      {
        "ro": "±5 ppm/an — derivă de cel mult 5 părți per milion pe an (0,0005%), adică ±50 µV la 10 V",
        "en": "±5 ppm/year — drifts by at most 5 parts per million per year (0.0005%), i.e. ±50 µV at 10 V"
      },
      {
        "ro": "2 ppm/°C — tensiunea se schimbă cu 2 părți per milion la fiecare grad Celsius (coeficient de temperatură)",
        "en": "2 ppm/°C — the voltage changes by 2 parts per million per degree Celsius (temperature coefficient)"
      },
      {
        "ro": "10,000 V — tensiune de referință cunoscută pe 3 zecimale (rezoluție de 1 mV), față de care se etalonează",
        "en": "10.000 V — reference voltage known to 3 decimals (1 mV resolution), used as the calibration benchmark"
      }
    ]
  },
  "mcu": {
    "specs": {
      "ro": "32 biți · 80 MHz · ADC 12 biți · UART/I2C/SPI",
      "en": "32-bit · 80 MHz · 12-bit ADC · UART/I2C/SPI"
    },
    "principle": {
      "ro": "Citește semnale prin ADC-ul integrat, le prelucrează în program și comandă senzori sau actuatori prin porturile digitale, fiind creierul programabil al unui montaj de măsurare.",
      "en": "It reads signals through its built-in ADC, processes them in firmware and drives sensors or actuators through its digital ports, acting as the programmable brain of a measurement setup."
    },
    "glossary": [
      {
        "ro": "32 biți — lățimea cuvântului procesorului (operează pe numere de 32 de biți deodată)",
        "en": "32-bit — the processor's word size (it handles 32-bit numbers at once)"
      },
      {
        "ro": "80 MHz — frecvența ceasului: 80 de milioane de cicli pe secundă",
        "en": "80 MHz — clock frequency: 80 million cycles per second"
      },
      {
        "ro": "ADC 12 biți — convertor analog-numeric cu 4096 de trepte de rezoluție",
        "en": "12-bit ADC — analog-to-digital converter with 4096 resolution steps"
      },
      {
        "ro": "UART/I2C/SPI — magistrale seriale standard de comunicație cu senzori și alte cipuri",
        "en": "UART/I2C/SPI — standard serial buses for talking to sensors and other chips"
      }
    ]
  },
  "pc": {
    "specs": {
      "ro": "USB/GPIB/LAN · software achiziție · export CSV",
      "en": "USB/GPIB/LAN · acquisition software · CSV export"
    },
    "principle": {
      "ro": "Preia datele de la instrumente prin interfețe standard, le prelucrează și le vizualizează cu software dedicat, permițând automatizarea măsurărilor și înregistrarea rezultatelor.",
      "en": "It collects data from the instruments over standard interfaces, processes and displays it with dedicated software, enabling measurement automation and result logging."
    },
    "glossary": [
      {
        "ro": "GPIB — magistrală standard de instrumentație (IEEE-488) pentru comanda aparatelor de laborator",
        "en": "GPIB — standard instrumentation bus (IEEE-488) for controlling lab instruments"
      },
      {
        "ro": "LAN — conexiune prin rețea Ethernet la instrumente și la PC",
        "en": "LAN — Ethernet network link to instruments and the PC"
      },
      {
        "ro": "export CSV — salvarea datelor ca fișier text cu valori separate prin virgulă, deschis în Excel",
        "en": "CSV export — saving data as a comma-separated text file, opened in Excel"
      }
    ]
  },
  "freq-counter": {
    "specs": {
      "ro": "0,1 Hz–100 MHz · 8 cifre · bază de timp 1 ppm",
      "en": "0.1 Hz–100 MHz · 8 digits · 1 ppm timebase"
    },
    "principle": {
      "ro": "Numără impulsurile semnalului într-un interval de timp precis, dat de un oscilator cu cuarț, obținând frecvența și perioada cu o exactitate mult superioară citirii de pe osciloscop.",
      "en": "It counts the signal's pulses over a precise time window set by a quartz oscillator, yielding frequency and period far more accurately than reading them off an oscilloscope."
    },
    "glossary": [
      {
        "ro": "bază de timp 1 ppm — oscilatorul de referință are o eroare de o parte per milion (0,0001%), ceea ce fixează exactitatea măsurării",
        "en": "1 ppm timebase — the reference oscillator has a one-part-per-million error (0.0001%), which sets the measurement accuracy"
      },
      {
        "ro": "8 cifre — afișează frecvența cu 8 cifre semnificative (rezoluție foarte fină)",
        "en": "8 digits — displays frequency with 8 significant digits (very fine resolution)"
      },
      {
        "ro": "0,1 Hz–100 MHz — domeniul de frecvențe pe care le poate număra",
        "en": "0.1 Hz–100 MHz — the range of frequencies it can count"
      }
    ]
  },
  "gold-dmm": {
    "specs": {
      "ro": "Upgrade DMM · clasă 0,5% · 4½ digiți",
      "en": "DMM upgrade · 0.5% class · 4½ digits"
    },
    "principle": {
      "ro": "Un multimetru mai precis, cu un digit în plus și incertitudine mai mică, îți arată cifre stabile și de încredere, deci poți deosebi o valoare reală de zgomotul de măsurare.",
      "en": "A more accurate multimeter, with an extra digit and lower uncertainty, gives stable, trustworthy readings, so you can tell a real value apart from measurement noise."
    },
    "upgradeSpecs": {
      "ro": "V/A/Ω · 4½ digiți · clasă 0,5% · True-RMS",
      "en": "V/A/Ω · 4½ digits · 0.5% class · True-RMS"
    },
    "glossary": [
      {
        "ro": "4½ digiți — afișează până la 19999, adică un digit „jumătate\" în plus față de 3½, deci mai multe cifre stabile",
        "en": "4½ digits — displays up to 19999, i.e. one extra \"half\" digit over 3½, so more stable figures"
      },
      {
        "ro": "clasă 0,5% — eroarea maximă garantată este 0,5% din valoare (de 2 ori mai bună ca 1%)",
        "en": "0.5% class — the guaranteed maximum error is 0.5% of the reading (twice as good as 1%)"
      },
      {
        "ro": "True-RMS — măsoară valoarea efectivă reală și pentru semnale nesinusoidale, nu doar pentru sinus",
        "en": "True-RMS — measures the real effective (RMS) value even for non-sinusoidal signals, not just sine"
      }
    ]
  },
  "skin-scope-neon": {
    "specs": {
      "ro": "Upgrade osciloscop · 2 canale · 100 MHz",
      "en": "Oscilloscope upgrade · 2 channels · 100 MHz"
    },
    "principle": {
      "ro": "Cu două canale poți compara două semnale simultan (de ex. defazajul intrare–ieșire), iar banda de 100 MHz și memoria digitală surprind și tranziții rapide fără să le deformeze.",
      "en": "Two channels let you compare two signals at once (e.g. the input–output phase shift), while the 100 MHz bandwidth and digital memory capture fast transitions without distorting them."
    },
    "upgradeSpecs": {
      "ro": "2 canale · 100 MHz · memorie digitală",
      "en": "2 channels · 100 MHz · digital memory"
    },
    "glossary": [
      {
        "ro": "2 canale — afișează două semnale simultan, ca să compari intrarea cu ieșirea sau defazajul dintre ele",
        "en": "2 channels — shows two signals at once, so you can compare input vs output or the phase shift between them"
      },
      {
        "ro": "100 MHz — banda de trecere: semnale până la 100 milioane de cicluri/s sunt afișate fără atenuare importantă",
        "en": "100 MHz — bandwidth: signals up to 100 million cycles/s are shown without significant attenuation"
      },
      {
        "ro": "memorie digitală — semnalul este eșantionat și stocat, deci poți îngheța și analiza tranziții rapide, unice",
        "en": "digital memory — the signal is sampled and stored, so you can freeze and inspect fast, single-shot transitions"
      }
    ]
  },
  "skin-analog-brass": {
    "specs": {
      "ro": "Upgrade voltmetru · clasă 0,5 · oglindă antiparalaxă",
      "en": "Voltmeter upgrade · class 0.5 · anti-parallax mirror"
    },
    "principle": {
      "ro": "Clasa de precizie mai bună (0,5 în loc de 1,5) micșorează eroarea proprie a aparatului, iar oglinda de pe cadran elimină eroarea de citire prin paralaxă — sunt două erori diferite, iar împreună apropie mult valoarea citită de cea adevărată.",
      "en": "The better accuracy class (0.5 instead of 1.5) lowers the instrument's own error, while the mirrored dial removes the parallax reading error — two different errors, and together they bring the reading much closer to the true value."
    },
    "upgradeSpecs": {
      "ro": "c.c. · clasă 0,5 · scală cu oglindă · Ri ridicat",
      "en": "DC · class 0.5 · mirrored scale · high input R"
    },
    "glossary": [
      {
        "ro": "clasă 0,5 — eroarea maximă e 0,5% din capătul de scală (de 3 ori mai bună ca 1,5)",
        "en": "class 0.5 — maximum error is 0.5% of full-scale (three times better than 1.5)"
      },
      {
        "ro": "oglindă antiparalaxă — banda-oglindă de pe cadran: citești când acul acoperă imaginea lui, eliminând eroarea de paralaxă (unghi de vizare)",
        "en": "anti-parallax mirror — a mirror strip on the dial: read when the pointer hides its reflection, removing parallax (viewing-angle) error"
      }
    ]
  },
  "lab-bronze": {
    "specs": {
      "ro": "Acreditare bronz · trasabilitate de bază · U ≈ 1%",
      "en": "Bronze accreditation · basic traceability · U ≈ 1%"
    },
    "principle": {
      "ro": "Nivelul de intrare al unui laborator: instrumentele sunt verificate periodic față de un etalon, cu o incertitudine declarată de ordinul 1%, suficientă pentru măsurări didactice.",
      "en": "A lab's entry level: instruments are periodically checked against a standard, with a stated uncertainty around 1%, good enough for teaching measurements."
    },
    "glossary": [
      {
        "ro": "trasabilitate — lanțul neîntrerupt de etalonări care leagă instrumentul de un etalon de referință",
        "en": "traceability — the unbroken chain of calibrations linking the instrument back to a reference standard"
      },
      {
        "ro": "U ≈ 1% — incertitudinea de măsurare: rezultatul adevărat se află, cu probabilitate mare, la ±1% în jurul valorii citite",
        "en": "U ≈ 1% — measurement uncertainty: the true value very likely lies within ±1% around the reading"
      }
    ]
  },
  "lab-silver": {
    "specs": {
      "ro": "Acreditare argint · trasabilitate documentată · U ≈ 0,2%",
      "en": "Silver accreditation · documented traceability · U ≈ 0.2%"
    },
    "principle": {
      "ro": "Un lanț de trasabilitate documentat spre etaloane naționale și un buget de incertitudine calculat coboară incertitudinea sub 0,2%, potrivit pentru etalonări de rutină.",
      "en": "A documented traceability chain to national standards and a computed uncertainty budget push uncertainty below 0.2%, suitable for routine calibrations."
    },
    "glossary": [
      {
        "ro": "trasabilitate documentată — lanțul de etalonări către etaloanele naționale e demonstrat cu certificate scrise",
        "en": "documented traceability — the calibration chain up to national standards is proven with written certificates"
      },
      {
        "ro": "U ≈ 0,2% — incertitudinea de măsurare: rezultatul adevărat se află la ±0,2% în jurul valorii citite (de 5 ori mai strâns ca la bronz)",
        "en": "U ≈ 0.2% — measurement uncertainty: the true value lies within ±0.2% of the reading (5× tighter than bronze)"
      }
    ]
  },
  "lab-gold": {
    "specs": {
      "ro": "Acreditare aur · trasabilitate primară · U ≈ 0,02%",
      "en": "Gold accreditation · primary traceability · U ≈ 0.02%"
    },
    "principle": {
      "ro": "Cel mai înalt nivel: etaloane de referință legate direct de etaloanele primare și un buget riguros de incertitudine ating exactități de ordinul 0,02%, ca într-un laborator de metrologie.",
      "en": "The top tier: reference standards tied directly to primary standards and a rigorous uncertainty budget reach accuracies around 0.02%, as in a metrology laboratory."
    },
    "glossary": [
      {
        "ro": "trasabilitate primară — legătură directă cu etaloanele primare (cel mai înalt nivel al lanțului metrologic)",
        "en": "primary traceability — a direct link to primary standards (the top level of the metrological chain)"
      },
      {
        "ro": "U ≈ 0,02% — incertitudinea de măsurare: rezultatul adevărat se află la ±0,02% în jurul valorii citite, ca într-un laborator de metrologie",
        "en": "U ≈ 0.02% — measurement uncertainty: the true value lies within ±0.02% of the reading, as in a metrology lab"
      }
    ]
  },
  "accreditation": {
    "specs": {
      "ro": "SR EN ISO/IEC 17025 · certificat de acreditare",
      "en": "SR EN ISO/IEC 17025 · accreditation certificate"
    },
    "principle": {
      "ro": "Acreditarea atestă oficial că laboratorul este competent și că măsurările lui sunt trasabile la etaloanele naționale/internaționale printr-un lanț neîntrerupt de etalonări, fiecare cu incertitudinea sa.",
      "en": "Accreditation is the official proof that a lab is competent and that its measurements are traceable to national/international standards through an unbroken chain of calibrations, each with its own uncertainty."
    },
    "glossary": [
      {
        "ro": "SR EN ISO/IEC 17025 — standardul care stabilește cerințele de competență pentru laboratoarele de încercări și etalonări",
        "en": "SR EN ISO/IEC 17025 — the standard that sets the competence requirements for testing and calibration laboratories"
      },
      {
        "ro": "certificat de acreditare — dovada oficială, emisă de un organism de acreditare, că laboratorul îndeplinește acel standard",
        "en": "accreditation certificate — the official proof, issued by an accreditation body, that the lab meets that standard"
      }
    ]
  }
}

export const infoFor = (id: string): EquipInfo | undefined => EQUIP_INFO[id]
