# FICEP — concept di redesign

> **Concept di redesign – non è il sito ufficiale FICEP.**
> Proposta indipendente da presentare all'azienda. Logo, modelli 3D, immagini e video sono segnaposto; i testi sono riscritti. Il sito è escluso dai motori di ricerca (`noindex`).

## Avvio

```bash
npm install
npm run dev        # http://localhost:3000  →  /it
npm run build && npm run start
```

## Dove sono i contenuti

Tutto il contenuto vive in JSON, separato dal codice.

| File | Cosa contiene |
| --- | --- |
| `content/home.json` | Testi e blocchi della home |
| `content/catalog.json` | Le 2 divisioni, le 9 categorie e le 44 macchine |
| `content/machines/<slug>.json` | Una macchina: componenti, specifiche, esplosione, modello 3D |
| `content/sectors.json`, `news.json`, `events.json`, `locations.json` | Settori, notizie, eventi, sedi |
| `content/site.json` | Menu, footer, link legali |
| `messages/it.json`, `messages/en.json` | Testi dell'interfaccia |

I campi di testo hanno una chiave per lingua (`{ "it": "…", "en": "…" }`). Per aggiungere una lingua: aggiungi il codice in `src/lib/i18n.ts`, crea `messages/<codice>.json` e aggiungi la chiave nei contenuti. Le chiavi mancanti ricadono sull'italiano.

## Sostituire i segnaposto con i file reali

- **Modelli 3D.** Ogni componente in `content/machines/<slug>.json` ha un campo `model`. Oggi è `{ "type": "procedural", "part": "…" }` (forma costruita in codice in `src/components/machine/procedural/`). Con i CAD di FICEP diventa `{ "type": "glb", "src": "/models/<file>.glb", "node": "<nome nodo>" }`. Il caricamento GLB arriva con il visualizzatore completo (fase 2).
- **Poster e video.** `node scripts/capture-placeholders.cjs` rigenera i fermo immagine in `public/posters/` e il video in `public/video/` a partire dal sito in esecuzione. Il video reale sostituisce `public/video/placeholder.mp4`.
- **Logo.** Il marchio segnaposto è in `src/components/layout/Chrome.tsx`.

## Struttura

```
content/      contenuti in JSON
messages/     testi dell'interfaccia per lingua
src/app/      pagine (Next.js App Router, una cartella per lingua)
src/components/machine/   stage 3D: React Three Fiber + modelli procedurali
src/components/home/      sezioni della home
src/components/layout/    banner, header, footer, animazioni
scripts/      strumenti per rigenerare i segnaposto
```

## Prestazioni

Lighthouse sulla home in produzione (`npm run build && npm run start`): mobile 91 / 100 / 100, desktop 100 / 100 / 100 (prestazioni / accessibilità / buone pratiche). La scena 3D si scarica alla prima interazione del visitatore; fino a quel momento resta un fermo immagine dello stesso modello.

## Stato

- [x] Fase 1 — Home
- [ ] Fase 2 — Visualizzatore 3D completo di una macchina
- [ ] Fase 3 — Mappa delle sedi e tour virtuale
- [ ] Fase 4 — Resto del sito
