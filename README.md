# FICEP — concept di redesign

> **Concept di redesign – non è il sito ufficiale FICEP.**
> Proposta indipendente da presentare all'azienda. Il sito è escluso dai motori di ricerca (`noindex`) e ogni pagina mostra il banner qui sopra.

È il sito attuale di FICEP rifatto per intero: stessi contenuti, struttura più pulita, navigazione più interattiva.

- **Catalogo completo**: le 44 macchine, ognuna con la sua pagina (foto, lavorazioni, caratteristiche, vantaggi, tabelle tecniche, galleria, video) e filtri per divisione, famiglia, lavorazione e nome.
- **3D su ogni macchina**: modello da ruotare, ingrandire ed esplodere nei componenti, con una scheda per ciascuno.
- **Stabilimento in 3D**: la sede di Gazzada Schianno vista dall'alto (edifici reali da OpenStreetMap su immagine satellitare), tour interno con planimetria, vista satellitare Google.
- **Trova la tua macchina**: tre domande, fino a tre macchine a confronto.
- **Azienda, storia, servizi, Academy, usato, carriere, contatti, news, eventi, settori.**
- **Italiano e inglese.**

## Avvio

```bash
npm install
npm run dev        # http://localhost:3000  →  /it
npm run build && npm run start
```

## Di chi è il materiale

| Cosa | Origine |
| --- | --- |
| Foto, icone, video | Di FICEP. Vengono **caricati dal sito ufficiale** (`ficepgroup.com`) quando si apre la pagina; nessun file è copiato in questo repository. Uso dimostrativo, per una presentazione privata: per pubblicare serve l'autorizzazione di FICEP. |
| Dati tecnici e nomi | Dal catalogo pubblico FICEP. |
| Testi | Riscritti, in italiano e inglese. |
| Logo | Segnaposto. |
| Modelli 3D di macchine e interni | Segnaposto costruiti in codice. Forme e colori (pannelli grigio chiaro, nome in rosso, idraulica arancione, robot gialli, cabine con finestre) sono ricavati dalle foto ufficiali: non esistono CAD pubblici delle macchine FICEP. |
| Edifici dello stabilimento | © OpenStreetMap contributors. |
| Immagine satellitare | Esri World Imagery, caricata a runtime. |

## Da verificare con FICEP

I contenuti sono stati confrontati con le pagine pubbliche di `ficepgroup.com`. Restano da confermare:

- **Eventi**: nomi e date vengono dal sito; città e paese delle fiere sono stati aggiunti a mano.
- **Reparti dello stabilimento** (Montaggio, Produzione, Academy e showroom): etichette indicative sugli edifici.
- **Numero di filiali**: FICEP dichiara 16 filiali dirette; le sue pagine ne elencano 14 più la sede.
- **Pagine legali**: segnaposto.

## Dove sono i contenuti

Tutto il contenuto vive in JSON, separato dal codice.

| File | Cosa contiene |
| --- | --- |
| `content/machines/<slug>.json` | Una macchina: testi, foto, lavorazioni, caratteristiche, specifiche, video, modello 3D |
| `content/catalog.json` | Divisioni, famiglie e ordine delle macchine |
| `content/viewer.json` | Componenti di ogni famiglia di modelli 3D (nome, funzione, apertura) |
| `content/pages.json` | Pagine di testo: azienda, servizi, Academy, usato, carriere, contatti |
| `content/home.json`, `content/showcase.json` | Blocchi della home |
| `content/sectors.json`, `news.json`, `events.json`, `history.json`, `locations.json` | Settori, notizie, eventi, storia, sedi |
| `content/plant.json` | Edifici dello stabilimento e area satellitare |
| `content/tour.json` | Tour interno: ambienti, punti di vista, macchine esposte |
| `content/site.json` | Menu, footer, link legali |
| `messages/it.json`, `messages/en.json` | Testi dell'interfaccia |

I campi di testo hanno una chiave per lingua (`{ "it": "…", "en": "…" }`). Per aggiungere una lingua: aggiungi il codice in `src/lib/i18n.ts`, crea `messages/<codice>.json` e aggiungi la chiave nei contenuti. Le chiavi mancanti ricadono sull'italiano.

Dopo aver aggiunto o tolto un file in `content/machines/`, esegui `node scripts/build-machine-index.mjs`.

## Sostituire i segnaposto con i file reali

- **Modelli 3D delle macchine.** Ogni macchina ha un campo `viewer`: oggi `{ "archetype": "…", "variant": "…" }` sceglie un modello costruito in codice (`src/components/machine/procedural/`). Il campo `glb` è previsto per puntare al file CAD esportato da FICEP; il caricamento va aggiunto in `src/components/machine/rig.ts`, mappando i nodi del file sugli stessi `id` dei componenti.
- **Tour interno.** Ogni punto di vista in `content/tour.json` ha un campo `panorama`, oggi vuoto: è il posto della foto 360° reale. Finché è vuoto si vede l'ambiente ricostruito in 3D.
- **Google Earth 3D.** Imposta `NEXT_PUBLIC_GOOGLE_MAPS_KEY` con una chiave Google Maps (API «Map Tiles» e «Maps JavaScript») e nella pagina Sedi compare la scheda con la vista fotorealistica 3D di Google. Senza chiave restano il modello 3D, il satellite e il link a Google Earth. Questa scheda non è stata provata: richiede una chiave.
- **Logo.** Il marchio segnaposto è in `src/components/layout/Chrome.tsx`.

## Struttura

```
content/      contenuti in JSON
messages/     testi dell'interfaccia per lingua
src/app/      pagine (Next.js App Router, una cartella per lingua)
src/components/machine/   visualizzatore 3D, modelli procedurali, scheda macchina
src/components/sites/     mappa delle sedi, stabilimento dall'alto, tour interno
src/components/catalog/   catalogo con filtri
src/components/finder/    configuratore
src/components/home/      sezioni della home
src/components/layout/    banner, header, footer, animazioni
scripts/      strumenti di manutenzione
```

Stack: Next.js (App Router), Tailwind CSS, React Three Fiber / three.js, Framer Motion, d3-geo.
