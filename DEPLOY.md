# Deploy su GitHub Pages

## Prerequisiti
- Un repository Git su GitHub (es. `sole-mare-alcol`)
- Git installato localmente

## Passi

1. **Aggiungi il remote se non l'hai già fatto:**
   ```bash
   git remote add origin https://github.com/TUO_USERNAME/sole_mare_alcol.git
   ```

2. **Fai il commit e push:**
   ```bash
   git add .
   git commit -m "Deploy: aggiungi countdown e fix mobile"
   git push -u origin main
   ```

3. **Abilita GitHub Pages:**
   - Vai su GitHub → Settings → Pages
   - Sorgente: seleziona branch `main` e cartella `/` (root)
   - Clicca Save

4. **Attendi 1-2 minuti.**

5. **Apri l'app:**
   ```
   https://TUO_USERNAME.github.io/sole_mare_alcol/
   ```

## Note importanti
- Sostituisci `TUO_USERNAME` con il tuo username GitHub
- Il repo si chiama `sole_mare_alcol` (con underscore)
- HTTPS è incluso automaticamente → il GPS funzionerà sul telefono
- Le immagini (`player_icon.png`, `poster.png`) sono già nella cartella `public/` e saranno caricate correttamente