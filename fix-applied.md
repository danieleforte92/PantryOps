Il problema era nell'App.tsx: l'`useEffect` che chiama `updateStreak.mutate()` si triggerava in loop perché la mutation di React Query causa re-render.

**Fix applicato:**
- Aggiunto `useRef` per tracciare se lo streak è già stato aggiornato
- Ora viene chiamato solo una volta al login

I log infiniti dovrebbero essere risolti. Vuoi che riavvii il server per testare?