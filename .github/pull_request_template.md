<!-- Thank you. Three lines of context help more than a good title.
     Mulțumim. Trei rânduri de context ajută mai mult decât un titlu bun. -->

## What this changes, and why · Ce schimbă și de ce

<!-- If it fixes something: how it used to reproduce.
     Dacă repară ceva: cum se reproducea înainte. -->

## Checks · Verificare

- [ ] `npm run verify` passes locally — types, the three gates, and the production build
      · trece local: tipuri, cele trei porți, build
- [ ] No text from the question bank anywhere — not in code, not in comments, not in the commit message
      · Niciun text din banca de întrebări nicăieri — nici în cod, nici în comentarii, nici în mesajul de commit
- [ ] If content was touched, it is only the demonstration module (`src/content/{worlds,recaps}/M01.demo.json`)
      · Dacă am atins conținut, e doar modulul demonstrativ
- [ ] If `src/visuals/` was touched, the figure reads in both themes and any drawn text switches on language
      · Dacă am atins `src/visuals/`, figura se citește în ambele teme și textul desenat comută pe limbă
- [ ] If `public/sw.js` was touched, the `/*__PRECACHE__*/[]` and `/*__BUILD__*/'dev'` markers are intact
      · Dacă am atins `public/sw.js`, marcajele sunt intacte

<!-- A gate blocking something you believe is correct: say so here rather than working around it.
     A false positive in a gate is a bug in the gate.

     O poartă care te blochează pe ceva ce crezi corect: spune aici, nu ocoli.
     Un fals pozitiv într-o poartă e un defect al porții. -->
