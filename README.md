# Take The Chair ($CHAIR) website

The pre-launch website for $CHAIR, with a working simulator of the Chair, the Press and BRRR. Nothing on this site touches a blockchain yet.

Built with Next.js. Hosted on Vercel. Source code public on GitHub.

---

## Put it online (no coding needed)

### 1. Upload the code to GitHub
1. Sign in at github.com and click **New repository**.
2. Name it `take-the-chair`, set it to **Public**, and click **Create repository**.
3. On the empty repository page, click **uploading an existing file**.
4. Open the unzipped `take-the-chair` folder on your computer. Select everything *inside* it (not the folder itself) and drag it onto the GitHub page.
5. Click **Commit changes** and wait for the upload to finish.

### 2. Deploy it on Vercel
1. Sign in at vercel.com with your GitHub account.
2. Click **Add New**, then **Project**.
3. Find `take-the-chair` in the list and click **Import**.
4. Leave the settings as they are (Vercel detects Next.js) and click **Deploy**.
5. After a minute or two you get a live link ending in `.vercel.app`.

From now on, every change saved to GitHub redeploys the site automatically.

### 3. Add your domain (optional)
In your Vercel project, open **Settings**, then **Domains**, add your domain, and follow the DNS instructions it shows you at your domain registrar.

### 4. Add the GitHub link to the site
Once the repository exists, open `lib/site.ts` on GitHub, click the pencil icon, paste your repository link into `githubUrl`, and commit. The Status section updates on the next deploy.

---

## Where to change things

| To change... | Edit this file |
|---|---|
| X handle, GitHub link, status table | `lib/site.ts` |
| Simulator numbers and example prices | `lib/sim.ts` |
| Page text: rules, FAQ, how it works | `app/page.tsx` |
| Colours, fonts, layout | `app/globals.css` |
| The simulator itself | `components/Simulator.tsx` |
| Social preview image and icons | `app/opengraph-image.png`, `app/twitter-image.png`, `app/icon.png` |
| Banknote artwork | `scripts/generate-art.mjs`, then run `npm run art` |

The project rules live in `SPEC.md`. Change the spec first, then the site.

---

## Run it on your own computer (optional)

1. Install Node.js 20 or newer from nodejs.org.
2. Open a terminal in this folder and run `npm install`.
3. Run `npm run dev` and open http://localhost:3000.

If you use Claude Code, open this folder in it. Claude Code reads `CLAUDE.md` automatically.
