This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## Projet Lafi : consignes pour l'agent

### Contexte

- **Lire `PROGRESS.md` en premier** : état du projet, décisions, pièges connus. Le mettre à jour à la fin de chaque tâche (ligne datée dans « Historique »).
- Application : Expo SDK 57 (React Native, TypeScript, expo-router), dossier `Lafi`. API : dossier voisin `lafi-api` (FastAPI, SQLModel/SQLite, scikit-learn, PyTorch CPU).
- L'utilisateur est **apprenant** et sera évalué à l'oral (soutenance « Développeur Data IA », 5 blocs : données, entraînement de modèle, application, agent IA, intégration de l'IA). Il doit pouvoir expliquer chaque ligne de code.

### Façon de travailler (important)

- **Petites étapes** : une fonctionnalité à la fois. Annoncer un plan court (fichiers touchés) avant d'écrire du code. Ne rien modifier hors du périmètre demandé.
- Après chaque tâche, répondre **en français simple** avec : ce qui a changé et pourquoi, les fichiers touchés, une section « Les outils expliqués » (chaque bibliothèque, hook ou notion nouvelle en une ou deux phrases), et comment tester.
- **Demander avant** d'ajouter une dépendance, de changer la version d'Expo ou de React Native, de renommer ou supprimer des fichiers.
- Ne **jamais** lancer `npm audit fix --force`. Ne pas migrer vers le SDK 58 sans accord.
- Ne **jamais** écrire de clé secrète (API, SMS, IA) dans le code, dans un fichier versionné ou dans une variable `EXPO_PUBLIC_*`.
- Remplacer une fonction **entière** plutôt que d'éditer par fragments (Python : l'indentation décide du sens).

### Conventions de l'application

- Couleurs, arrondis, espacements et polices **uniquement** via `src/theme.ts` (police Inter). Aucune couleur écrite en dur dans un écran.
- Appels réseau **uniquement** dans `src/services/api.ts` (conversion snake_case → camelCase). Erreurs via `ApiError` avec la cause lisible.
- Fonctions IA derrière `src/services/ai.ts` (contrat entre l'application et les modèles).
- Envoi de fichiers : `form.append("file", new File(uri))` avec `File` d'`expo-file-system`, **jamais** `{ uri, name, type }`.
- Données partagées : contextes dans `src/store/`. Les hooks sont appelés avant tout `return` conditionnel.
- Textes d'interface en français ; prix en FCFA.
- Lancer `npx tsc --noEmit` avant de dire qu'une tâche est terminée.

### Conventions de l'API

- Les **prix sont toujours recalculés côté serveur**. Validation avec les modèles (Pydantic / SQLModel) ; codes HTTP clairs (404, 409, 422).
- Modèles IA chargés au démarrage (`load_model()` dans `lifespan`) ; routes IA en `def`, pas `async`. Les réponses d'IA contiennent `source` et `accepte`.
- **Catégories** : `config.CATEGORIES`, `LAFI_CATEGORIES` (`category_model.py` et `image_model.py`) et `src/data/articles.ts` doivent rester **identiques** (Alimentation, Mode, Beauté, Électronique, Maison, Bébé).
- Ne pas versionner `models/`, `uploads/`, `lafi.db`, `.venv`, `.env`.

### Commandes

- Application : `npm install` · `npx expo start -c` (touche `a` : émulateur Android) · `npx tsc --noEmit`
- API : `.venv\Scripts\Activate.ps1` · `pip install -r requirements.txt` · `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000` · documentation : `http://localhost:8000/docs`
