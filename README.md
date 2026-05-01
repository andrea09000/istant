# Istant

App mobile (React Native + **Expo SDK 54**): feed foto con reazioni emoji, camera con condivisione “tutti gli amici” o “amici stretti”, profilo, amicizie a due richieste accettate, design bianco/nero.

## Prerequisiti

- Node 20+ (vedi [Expo Node support](https://docs.expo.dev/versions/latest))
- iOS: Xcode; Android: Android Studio
- Progetto **Firebase** (Auth, Firestore, Storage)
- **Development build** (non Expo Go) per **Google/Apple** sign-in, camera, notifiche: `npx expo run:ios` / `npx expo run:android` oppure [EAS Build](https://docs.expo.dev/build/introduction/)

## Configurazione

1. Clona o copia il repository e `npm install`.
2. Crea un file **`.env`** a partire da [`.env.example`](./.env.example) e incolla le chiavi Firebase.
3. **Autenticazione**  
   - Firebase **Authentication** → abilita **Google** (e iOS: **Apple** con Service ID, capability Sign in with Apple, ecc.).  
   - Per Google, imposta l’`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (Client ID di tipo *Web* nella console Google / Firebase, usato per ottenere l’`idToken` su device).
4. Sostituisci in `app.json` l’`iosUrlScheme` del plugin `@react-native-google-signin/google-signin` con quello reale: formato `com.googleusercontent.apps.XXXX` (dalla console iOS client OAuth).
5. **Regole Firestore / Storage**  
   - Esempio in `firestore.rules` e `storage.rules` (adattale al tuo ambiente).  
   - Deploy: `firebase deploy --only firestore,storage` (con Firebase CLI inizializzata).
6. **Indici Firestore** per le query: `firebase deploy --only firestore` usando `firestore.indexes.json` o crea le composite così:
   - `posts`: `array-contains audienceUids` + `createdAt desc`  
   - `posts`: `authorUid` + `createdAt desc`  
   - `friendships`: `status` + `users` array-contains

## Sviluppo

```bash
npx expo start
```

Dopo aver configurato le dipendenze native, crea (o prebuild) i client:

```bash
npx expo prebuild
npx expo run:ios
# o
npx expo run:android
```

EAS (profilo *development*):

```bash
eas build --profile development --platform all
```

## Struttura

- `app/` — route (expo-router), onboarding, tab, search, amici, impostazioni, profilo utente.
- `src/lib/` — Firebase, auth, utenti, amicizie, post, storage.
- `src/components/` — UI in bianco/nero.
- Tema: `src/theme/`.

## Note

- Link invito “cliccabile” (WhatsApp/IG/iMessage) richiede un dominio HTTPS con **Universal Links** (iOS) + **App Links** (Android).
  - Imposta `EXPO_PUBLIC_APP_ORIGIN=https://get.istantapp.it` nel `.env` per generare link HTTPS sugli inviti.
  - Pubblica sul dominio inviti questi file (status 200, no redirect):
    - `https://get.istantapp.it/.well-known/apple-app-site-association`
    - `https://get.istantapp.it/.well-known/assetlinks.json`
  - Se usi **Netlify** (consigliato: **due siti**):
    - **Sito inviti** (`get.istantapp.it`): in Netlify imposta *Base directory* vuota e **“Netlify configuration file”** = `netlify.invite.toml` (publish = `public`, no build).
    - **Sito principale** (`istantapp.it`): usa `netlify.toml` (build `npm run export:web`, publish `dist`).
    Dopo il deploy verifica che gli URL sopra rispondano 200.
  - Android: in `public/.well-known/assetlinks.json` sostituisci `REPLACE_WITH_YOUR_SHA256_CERT_FINGERPRINT` con la SHA-256 del certificato (debug/release) usato per firmare l’app installata.
  - In `app.json` aggiorna `ios.associatedDomains` e `android.intentFilters` se cambi host dominio inviti.

- In **Firebase 12** il sample di persistenza Auth con `getReactNativePersistence` non è usato: la sessione può dipendere dal default di `getAuth` sul device; in produzione valuta una strategia di persistenza ufficiale per RN/Expo.
- I permessi **notifiche** richiedono progetto con push configurato (EAS) per un token reale; l’onboarding chiede comunque il consenso.
- Tema, tab bar e testi di UI usano l’italiano in-app come richiesto per il prodotto.

## Licenza

Uso personale / progetto. Aggiorna a piacere.
# istant
