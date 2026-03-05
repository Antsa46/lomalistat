# Lomalistat (Vacation Planner)

Viikkotasoinen lomalistojen suunnittelutyokalu, taysin offline-first PWA.  
Data tallennetaan paikallisesti selaimeen (IndexedDB), eika projektidataa laheteta ulkoisiin palveluihin.  
Import/Export toimii JSON-tiedostolla.

![Kuva 1 - Planner](docs/images/kuva1.png)
![Kuva 2 - Wizard](docs/images/kuva2.png)

---

## FI

### 1) Kuvaus

Lomalistat on viikkotason lomasuunnittelutyokalu, jossa:

- kaikki projektidata pysyy paikallisesti selaimessa
- suunnitelmaa voi rakentaa Wizardilla ja muokata Plannerissa
- projekti voidaan varmuuskopioida/siirtaa JSON Import/Export -toiminnolla

### 2) Keskeiset ominaisuudet

- Wizard (6 askelta): aikajakso, ryhmat, tyontekijat, taidot + vaatimukset, toiveet, generointi
- Planner: WORK/VACATION-taulukko, solun klikkaus muuttaa tilaa, rikkomukset paivittyvat reaaliajassa
- Ryhmavaihdot viikoille: WORK-solun tuplaklikilla tyontekija voidaan sijoittaa toiseen ryhmaan valitulle viikolle
- Hard constraints:
  - `group.minHeadcountPerWeek` per ryhma per viikko
  - `skillRequirements.minPerWeek` per ryhma per viikko
- Soft constraints:
  - lomatoiveet kasitellaan prioriteettijarjestyksessa `1 -> 2 -> 3` (1 = korkein)
- Demo-nappi: luo deterministisen demoprojektin seedilla `1337` (nykyinen demo: 250 hlo)
- Import/Export: `Project.json` sisaltaa koko projektin
- Reset: tyhjentaa paikallisen IndexedDB-datan
- Magic-generate: yrittaa toteuttaa enemman toiveita myos automaattisilla ryhmasiirroilla

### 3) Tietosuoja ja offline-periaate

Tarkeaa:

- Sovelluskoodi ei tee verkkokutsuja projektidatalle (`fetch`, `axios`, `websocket`), eika kayta analytiikkaa/telemetriaa.
- Kaikki projektidata tallentuu paikallisesti selaimen IndexedDB:hen.
- Ainoa tarkoituksellinen tiedonsiirto on kayttajan oma Import/Export JSON-tiedosto.
- Ala syota henkilotietoja tai arkaluontoista dataa. Kayta tunnisteita (esim. `T1`, `T2`).
- Varmuuskopioi data saannollisesti Export-toiminnolla.

### 4) Asennus ja ajo

```bash
npm install
npm run dev
npm run test
npm run lint
npm run build
npm run preview -- --port 4174
```

### 5) PWA / Offline testaus

- Testaa ensisijaisesti build + preview -tilassa, ei pelkastaan dev-tilassa.
- Avaa selaimen DevTools:
  - `Application -> Service Workers`: varmista etta service worker on rekisteroity
  - `Network -> Offline`: paivita sivu, sovelluksen tulee avautua offline-tilassa

### 6) Dataformaatti (Project.json v1)

Project.json (schemaVersion `1`) sisaltaa:

- `schemaVersion`
- `project`
- `timeWindow`
- `groups`
- `skills`
- `skillRequirements`
- `workers`
- `requests`
- `plan`
- `violations`
- `unmetRequests`

Huom:

- `schemaVersion` + migraatiot mahdollistavat myohemmat formaattimuutokset.
- `plan` sisaltaa viikkokohtaiset assignmentit seka mahdolliset ryhma-overridet.

### 7) Generointilogiikka (ENGINE, lyhyesti)

- Alustetaan kaikki `WORK`-tilaan
- Kasitellaan requestit prioriteettijarjestyksessa (1 ensin)
- Kokeillaan viikkokohtaisesti `VACATION`
- Muutos hyvaksytaan vain jos hard constraints tayttyvat
- Muuten muutos perutaan ja kirjataan unmet-syy
- Lopuksi lasketaan violations koko aikajaksolle
- Plannerin manuaalimuokkauksessa muutosta ei esteta, vaan rikkomukset lasketaan uudelleen

### 8) Projektirakenne

- `src/model`: domain-tyypit, validointi, migraatiot
- `src/engine`: constraints, generatePlan, recalc
- `src/repository`: IndexedDBRepo, InMemoryRepo
- `src/controller`: Zustand-store, import/export, demo-data
- `src/view`: Wizard + Planner UI

### 9) Lisenssi

All rights reserved. Internal tool.

### 10) About

Made by Antsa  
Hyva lomalista ei nay, se tuntuu. Siksi jokainen nimi listalla merkitsee.

---

## EN

### 1) Description

Lomalistat is a weekly vacation planning tool built as an offline-first PWA:

- all project data stays local in the browser
- planning is done in Wizard and refined in Planner
- full project backup/transfer is done with JSON Import/Export

### 2) Key features

- Wizard (6 steps): time window, groups, workers, skills + requirements, requests, generate
- Planner: WORK/VACATION grid, click to toggle cells, real-time violation recalculation
- Weekly group reassignment: double-click a WORK cell to assign worker to another group for that week
- Hard constraints:
  - `group.minHeadcountPerWeek` per group per week
  - `skillRequirements.minPerWeek` per group per week
- Soft constraints:
  - vacation requests are processed by priority `1 -> 2 -> 3` (1 = highest)
- Demo button: deterministic seeded demo (`1337`, current demo size: 250 workers)
- Import/Export: `Project.json` contains the full project
- Reset: clears local IndexedDB data
- Magic generate: also tries automatic cross-group backfills to satisfy more requests

### 3) Privacy and offline principle

Important:

- The app code does not send project data over network APIs (`fetch`, `axios`, `websocket`) and does not use analytics/telemetry.
- All project data is stored only in local browser IndexedDB.
- The only intentional data transfer is user-controlled JSON Import/Export.
- Do not enter personal or sensitive data. Use identifiers (for example `T1`, `T2`).
- Back up regularly with Export.

### 4) Install and run

```bash
npm install
npm run dev
npm run test
npm run lint
npm run build
npm run preview -- --port 4174
```

### 5) PWA / Offline testing

- Prefer testing with build + preview, not only dev mode.
- In browser DevTools:
  - `Application -> Service Workers`: verify service worker is registered
  - `Network -> Offline`: refresh and verify app still loads

### 6) Data format (Project.json v1)

Project.json (`schemaVersion: 1`) includes:

- `schemaVersion`
- `project`
- `timeWindow`
- `groups`
- `skills`
- `skillRequirements`
- `workers`
- `requests`
- `plan`
- `violations`
- `unmetRequests`

Note:

- `schemaVersion` + migrations allow future data model changes.
- `plan` includes weekly assignments and possible group overrides.

### 7) Engine logic (short)

- Initialize all workers to `WORK`
- Process requests in priority order (1 first)
- Try setting requested weeks to `VACATION`
- Keep change only if hard constraints remain valid
- Otherwise revert and record unmet reason
- Recompute final violations after generation
- In Planner manual edits are not blocked; violations are recalculated after edit

### 8) Project structure

- `src/model`: domain types, validation, migrations
- `src/engine`: constraints, generatePlan, recalc
- `src/repository`: IndexedDBRepo, InMemoryRepo
- `src/controller`: Zustand store, import/export, demo-data
- `src/view`: Wizard + Planner UI

### 9) License

All rights reserved. Internal tool.

### 10) About

Made by Antsa  
A good vacation schedule isn't seen, it's felt. That's why every name on the list matters.


