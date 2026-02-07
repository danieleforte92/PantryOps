# PantryOps – Documentazione di Progetto

Questa documentazione rappresenta la **fonte di verità (single source of truth)** del progetto *PantryOps*.
Serve come:
- backup concettuale
- guida architetturale
- riferimento per sviluppo futuro (anche con LLM)

---

## 1. Visione del Prodotto

**PantryOps** è un *personal home ERP* focalizzato su:
- gestione scorte domestiche
- supporto decisionale (cosa cucinare, cosa comprare)
- riduzione sprechi

Non è:
- un ricettario
- un’app di meal prep fitness
- un gestionale complesso stile enterprise

### Principio guida
> *Il sistema deve aiutare a decidere, non decidere al posto dell’utente.*

---

## 2. Principi Fondanti (Non negoziabili)

1. **Separazione dei Domini**
2. **Backend come Source of Truth**
3. **Frontend Thin & UX-first**
4. **Azioni irreversibili esplicite**
5. **Zero over-engineering nell’MVP**

---

## 3. Architettura a Domini

### Mappa dei Domini

```
recipes      → conoscenza statica
stock        → realtà fisica
planner      → intenzione futura
suggestions  → supporto decisionale
queries      → read-model cross-domain
```

### Responsabilità per dominio

#### Recipes
- CRUD ricette
- ingredienti
- quantità
- unità

❌ Non consuma stock
❌ Non suggerisce
❌ Non pianifica

---

#### Stock
- carico scorte
- consumo FIFO / FEFO
- transazioni irreversibili

✔️ Unico dominio che modifica la realtà fisica

---

#### Planner
- pianificazione pasti
- non consuma stock
- non modifica dati

È una *intenzione*, non un’azione.

---

#### Suggestions
- preview cucinabilità
- ricette cucinabili ora / quasi
- missing ingredients

❌ Non consuma
❌ Non scrive

---

#### Queries
- aggregazioni
- viste
- dashboard

❌ Nessuna logica di business
❌ Nessuna side-effect

---

## 4. Modello Dati (Core)

### Recipe
- id
- name
- description (opzionale)
- createdAt
- updatedAt

### RecipeIngredient
- recipeId
- productId
- quantity
- unitId

Vincoli:
- 1 prodotto per ricetta (no duplicati)
- quantità > 0

---

## 5. API Canoniche

### Recipes
- POST /api/recipes
- POST /api/recipes/:id/ingredients
- GET /api/recipes/:id

### Suggestions
- GET /api/suggestions/recipes/:id/preview

### Stock
- POST /api/stock/recipe-cook/:id

---

## 6. UX – Creazione Ricetta (MVP)

### Obiettivo UX
> Creare una ricetta deve essere più facile che scriverla su WhatsApp.

### Flusso
1. Inserisci nome
2. Aggiungi ingredienti
3. Salva

Tempo target: < 1 minuto

---

## 7. UX – Cook vs Preview

| Azione | Effetto |
|------|-------|
| Preview | Nessuna modifica |
| Cook | Consumo stock |

Questa distinzione è fondamentale.

---

## 8. Anti-Pattern da Evitare

- logica duplicata FE/BE
- ricette che consumano stock
- planner che modifica dati
- suggestions con side-effect
- queries intelligenti

---

## 9. Roadmap Evolutiva

### MVP (attuale)
- scorte
- ricette manuali
- preview
- cook

### Fase 2
- planner settimanale
- lista spesa automatica

### Fase 3
- suggerimenti avanzati
- scoring

### Fase 4
- AI (facoltativa)
- import ricette

---

## 10. Filosofia di Sviluppo

- Preferire semplicità a feature
- Codice leggibile > codice furbo
- Ogni dominio deve poter essere testato da solo

---

## 11. Checklist Mentale (prima di ogni feature)

- Questo dominio deve davvero farlo?
- È reversibile?
- Serve ora o dopo?
- Aumenta o riduce il carico cognitivo?

---

## 12. Stato Attuale del Progetto

✔️ Architettura consolidata
✔️ Domini separati
✔️ UX coerente
✔️ Backend affidabile

---

## 13. Obiettivo Finale

Un sistema che:
- si usa ogni giorno
- non stressa
- non sorprende
- riduce sprechi
- aumenta consapevolezza

---

**Questa documentazione è intenzionalmente stabile.**
Aggiornala solo quando cambia una decisione architetturale o di prodotto.

---

## 14. Versionamento della Documentazione

La documentazione segue un versionamento **concettuale**, non semantico.

Formato consigliato:
```
DOC_VERSION = MAJOR.MINOR
```

- **MAJOR**: cambia solo se cambia uno dei Principi Fondanti o la mappa dei domini
- **MINOR**: cambia se viene introdotto un nuovo dominio o una nuova responsabilità chiave

Esempi:
- 1.0 → MVP consolidato
- 1.1 → Introduzione Planner
- 2.0 → Cambiamento architetturale rilevante

Annota sempre in cima al file:
```
Document Version: X.Y
Last Architectural Review: YYYY-MM-DD
```

---

## 15. Checklist Operativa per lo Sviluppo

Usa questa checklist **prima di ogni nuova feature o refactor**.

### Dominio
- [ ] In quale dominio cade questa feature?
- [ ] Il dominio ha già questa responsabilità?
- [ ] Sto introducendo coupling non necessario?

### Azioni
- [ ] Questa azione è reversibile?
- [ ] Se no, è esplicita per l’utente?
- [ ] È chiaro quando avviene il side-effect?

### UX
- [ ] Riduce o aumenta il carico cognitivo?
- [ ] Può essere completata in < 1 minuto?
- [ ] L’utente capisce cosa succede prima di confermare?

### Backend
- [ ] Il backend resta la source of truth?
- [ ] Il frontend sta solo orchestrando?
- [ ] La logica è testabile in isolamento?

### Anti-Pattern Check
- [ ] Sto duplicando logica FE/BE?
- [ ] Sto aggiungendo intelligenza troppo presto?
- [ ] Questo codice finirà in `queries` solo per comodità?

Se una risposta è incerta → **rimanda la feature**.

---

## 16. Master Prompt per LLM (Uso Continuativo)

Usa questo prompt come **contesto iniziale** per qualsiasi LLM coinvolto nello sviluppo.

```
Sei un assistente che collabora allo sviluppo del progetto "PantryOps",
un personal home ERP.

Regole non negoziabili:
- Rispetta la separazione dei domini:
  recipes = metadata statici
  stock = realtà fisica
  planner = intenzione futura
  suggestions = supporto decisionale
  queries = read-only aggregations

- Il backend è sempre la source of truth
- Il frontend è thin e UX-first
- Nessuna azione irreversibile senza esplicita conferma
- Nessuna logica di business nel frontend

Obiettivo del prodotto:
- aiutare a decidere
- ridurre sprechi
- essere usabile ogni giorno senza stress

Non proporre soluzioni che:
- consumano stock implicitamente
- introducono over-engineering nell’MVP
- violano i principi sopra

Prima di rispondere:
1. Identifica il dominio coinvolto
2. Valuta se la feature è necessaria ora
3. Proponi la soluzione più semplice possibile
```

Questo prompt va riutilizzato e adattato solo se cambia la visione del prodotto.

---

## 17. Stato di Maturità del Progetto

- 🟢 Fondamenta architetturali solide
- 🟢 Domini ben separati
- 🟡 UX da rifinire con uso reale
- 🟡 Feature avanzate volontariamente posticipate

Il progetto è pronto per:
- uso quotidiano
- iterazione incrementale
- contributi esterni guidati
