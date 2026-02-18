# Run real-estate-scout UI locally (port 1950)

The new UI lives in a separate repo: **https://github.com/Cold-Snipper/real-estate-scout**

## 1. Get the repo on your machine

From this project root:

```bash
cd "/Users/karlodefinis/COLD BOT"
git clone https://github.com/Cold-Snipper/real-estate-scout.git
```

If that asks for credentials, use a **Personal Access Token** (GitHub → Settings → Developer settings → Personal access tokens) as the password, or clone via SSH if you have keys:

```bash
git clone git@github.com:Cold-Snipper/real-estate-scout.git
```

Alternatively, download the repo as ZIP from GitHub (Code → Download ZIP), unzip it, and rename the folder to `real-estate-scout` inside `COLD BOT`.

## 2. Run on port 1950

From `COLD BOT`:

```bash
./scripts/run-real-estate-scout.sh
```

The script will:

- Use the folder `COLD BOT/real-estate-scout`
- Run `npm install` if needed
- Start the dev server on **port 1950**

Open: **http://localhost:1950**

## 3. Manual run (if you prefer)

```bash
cd "/Users/karlodefinis/COLD BOT/real-estate-scout"
npm install
# Next.js:
npx next dev -p 1950
# or Vite:
npx vite --port 1950
# or whatever the project's dev command is (see package.json)
```

## 4. Frontend is real-estate-scout only

When you’re ready to merge the new UI into the main codebase (e.g. see LOVABLE_FRONTEND_SPEC.)

**real-estate-scout** is the only UI in this repo (immo-snip–oriented). There is no cold_bot/dashboard. Point your API server at the contract in `docs/LOVABLE_FRONTEND_SPEC.md` and run the frontend with `cd real-estate-scout && npm run dev`.
