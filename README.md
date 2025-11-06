# Vite + React + Tailwind – Letture Termosifoni (7 contabilizzatori)

Webapp per inserire le letture **mensili** dei 7 contabilizzatori (CUCINA, BAGNO, SOGGIORNO, CAMERETTA, STUDIO, BAGNO 2, CAMERA DA LETTO).
- Dati cumulativi per mese → consumi mensili = differenza.
- Persistenza in LocalStorage.
- Import/Export CSV con riga iniziale di commento con i nomi leggibili.
- Grafico consumi totali + per singolo radiatore (toggle).

## Avvio
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
npm run preview
```

## GitHub Pages
- Il repo contiene `.github/workflows/deploy.yml` per il deploy automatico.
- In GitHub → Settings → Pages → Source: **GitHub Actions**.

## CSV
Esempio export:
```
# CUCINA,BAGNO,SOGGIORNO,CAMERETTA,STUDIO,BAGNO 2,CAMERA DA LETTO
date,R1,R2,R3,R4,R5,R6,R7,note
2025-01,1,2,3,4,5,6,7,ok
```

## Note
- Le chiavi dati restano R1…R7 per compatibilità.
