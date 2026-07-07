# grindX.at

Mobile Dating-/Matching-Web-App. Statisches Frontend (`index.html`, `css/`, `js/app.js`) + Serverless-API (`api/*.js`, Vercel Functions) mit Neon-Postgres. Deployment über Vercel, verbunden mit GitHub `origin` (`Widiwaldberg/grindX.at`).

## Branch- & Deploy-Workflow (WICHTIG)

Die Seite wird für nächstes Jahr umgebaut. Damit die Live-Seite dabei unberührt bleibt, gilt eine strikte Branch-Trennung:

- **`master`** = Production-Branch. Nur Pushes hierher gehen auf die **Live-Domain**. NICHT anfassen, außer der User sagt es ausdrücklich.
- **`redesign`** = Arbeits-/Umbau-Branch. Hier passiert die gesamte Entwicklung.

### Push-Regel

**Standardmäßig ALLES nach `redesign` committen und pushen.**
Nur nach `master` pushen, wenn der User es für den jeweiligen Vorgang **ausdrücklich** sagt.

Wenn etwas live gehen soll, sagt der User Bescheid; dann:
```bash
git checkout master
git merge redesign
git push          # löst erst jetzt den Live-Deploy aus
git checkout redesign
```

### Preview-Deploys

`vercel.json` schaltet Deploys für `redesign` ab (`git.deploymentEnabled.redesign = false`), damit **nur `master`** je online geht. Pushes nach `redesign` deployen also nichts.

## Architektur

- **Frontend:** `js/app.js` — kein Framework, wird via `<script>` in `index.html:156` geladen. State in `localStorage` (`mm_token`, `mm_me`) und `sessionStorage` (aktueller Screen, `NAV_SCREEN_KEY`).
- **API:** `api/*.js` als Vercel Serverless Functions. `api/_lib/` enthält `db.js` (Neon), `auth.js` (JWT), `mutualMatch.js`.
- **Auth:** JWT im `localStorage`, bei jedem Seiten-/Tab-Aufruf prüft `accountStillExists()` via `/me`, ob der Account noch in der DB existiert; sonst automatischer Logout.
- **Navigation:** Tab-Wechsel schaltet client-seitig via `showScreen()` um (kein Full-Reload) und lädt gezielt frische Daten (`loadProfiles`/`loadMatches`) plus DB-Check. Chat aktualisiert per Polling alle 3s.

## Konventionen

- Deutsch in UI-Texten und Feldnamen (z. B. `alter`, `department`, `jahre_auf_xjam`).
- Keine Build-Tools; direktes Vanilla-JS/HTML/CSS.
