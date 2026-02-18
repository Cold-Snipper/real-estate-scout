# Get the Lovable UI (real-estate-scout) on http://localhost:1950

The UI you built in Lovable is in the **real-estate-scout** repo. I can’t clone it from here (your repo is private / needs your login). You have to pull the code to your machine once, then the script will run it on 1950.

---

## 1. Clone the repo (you do this once)

Open **Terminal** and run:

```bash
cd "/Users/karlodefinis/COLD BOT"
git clone https://github.com/Cold-Snipper/real-estate-scout.git
```

When it asks for **password**, use a **GitHub Personal Access Token**, not your GitHub password:

- GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)** → **Generate new token**
- Give it `repo` scope
- Copy the token and paste it when `git clone` asks for password

If you use **SSH** and have keys set up:

```bash
cd "/Users/karlodefinis/COLD BOT"
git clone git@github.com:Cold-Snipper/real-estate-scout.git
```

---

## 2. Run the Lovable UI on port 1950

Still in Terminal:

```bash
cd "/Users/karlodefinis/COLD BOT"
./scripts/run-real-estate-scout.sh
```

That installs deps (if needed) and starts the app on **port 1950**.

---

## 3. Open it

In your browser or Cursor Simple Browser:

**http://localhost:1950**

That’s the Lovable UI, not the old Cold Bot dashboard.

---

## If you don’t use Git

1. On GitHub: open **Cold-Snipper/real-estate-scout** → **Code** → **Download ZIP**
2. Unzip it
3. Rename the unpacked folder to **real-estate-scout**
4. Move it to: **`/Users/karlodefinis/COLD BOT/real-estate-scout`**
5. Run: `./scripts/run-real-estate-scout.sh`

Once the **real-estate-scout** folder exists in COLD BOT and you run the script, the Lovable frontend will be at http://localhost:1950.
