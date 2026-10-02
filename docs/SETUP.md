# Setup: the steps only a human can do

Agents point you to a section here when a task needs it. Nothing here asks for a credit card.
**Never click "Upgrade" or "Blaze" in Firebase.** Everything we use is on the free Spark plan.

## S1. Tools on your computer (once, before T01)
- **Node.js 22 LTS** (nodejs.org) and **Git**.
- **Java 21+** (e.g. Temurin from adoptium.net). The Firebase emulators need it (T05 and later) —
  `firebase-tools` 15.x raised its minimum from 11/17, so an older JDK fails `npm run test:rules`
  and `npm run emulators` with "no longer supports Java version before 21".
- An AI coding agent that can edit files and run terminal commands in a folder (any vendor).
- Check it's all installed: `node -v` (v22.x), `git --version`, `java -version`.

## S2. Repo (once, see README "Seed the repo")

## S3. Firebase project (T05)
1. Go to https://console.firebase.google.com → **Create a project** → name it `fight-club` (the ID gets a
   suffix, e.g. `fight-club-a1b2c`; note it). Google Analytics: **off**.
2. **Build → Authentication → Get started** → Sign-in method → enable **Google** and **Email/Password**
   (leave "Email link" off).
3. **Build → Firestore Database → Create database** → *Production mode* → location `nam5 (us-central)` (or nearest).
   The location can't be changed later.
4. **Project settings (gear) → General → Your apps → Web (</>)** → nickname `fight-club-web` → don't tick
   Hosting here → Register. Copy the `firebaseConfig` object and paste it to the agent when it asks. It's public, not a secret.
5. In a terminal inside the repo: `npx firebase login` (browser opens and you sign in with the same Google account).

## S4. Service account for jobs (T07 local runs, T10 GitHub)
1. Firebase console → Project settings → **Service accounts** → *Firebase Admin SDK* → **Generate new private key**.
2. Save the JSON **outside the repo**, e.g. `~/secrets/fight-club-sa.json`. Never commit it.
3. For local job runs, add to `.env.local` in the repo (it's git-ignored):
   `GOOGLE_APPLICATION_CREDENTIALS=/Users/<you>/secrets/fight-club-sa.json`
   and `FIREBASE_PROJECT_ID=<your-project-id>`

## S5. The Odds API key (T08)
1. https://the-odds-api.com → **Get API key** → choose the free plan (no card) → the key arrives by email.
2. Add `ODDS_API_KEY=<key>` to `.env.local`.

## S6. GitHub secrets (T10)
GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**:
| Name | Value |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | the *entire contents* of the S4 JSON file |
| `FIREBASE_PROJECT_ID` | your project id |
| `ODDS_API_KEY` | from S5 |

Hosting deploy auth: run `npx firebase init hosting:github` **only if the T10 agent asks**. It creates its own
deploy secret automatically. Firestore rules and indexes are deployed from your laptop with
`npm run deploy:rules`. Agents remind you when rules change.

## S7. Make yourself admin (T12)
After T12 is deployed (or with emulators), run: `npm run bootstrap:admin -- you@example.com`
(it uses your S4 credentials). This allowlists you as admin and writes `config/app.admins`.
Then sign in.

## S8. Inviting friends (after T17)
Admin console → Invites → add their email plus a starting grant. Send them the site URL. They sign in with
Google or email/password using **that exact email**.

## S9. Install on iPhone
Open the site in **Safari** → Share button → **Add to Home Screen**. Push notifications (T24) only work
from the installed app on iOS 16.4+.

## S10. Running a job by hand
GitHub repo → Actions → **Jobs** → *Run workflow* → pick `ingest`, `odds` or `lifecycle`. You can do this from the GitHub mobile app too.
