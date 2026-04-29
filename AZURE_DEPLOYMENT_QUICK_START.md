# Azure Deployment Quick Start Checklist

## 🚀 Quick Setup (Complete in 15 minutes)

Use this checklist to quickly complete Azure deployment setup:

---

### ⚠️ CRITICAL: Revoke Compromised Credentials (Do First!)

- [ ] Go to [Azure Portal](https://portal.azure.com) → **App Services** → **forestloop**
- [ ] Navigate to **Deployment Center** → Click **Disconnect**
- [ ] Go to **Deployment credentials** → Click **Reset publish profile**
- [ ] Download and save the new `.PublishSettings` file

---

### 🔐 Add GitHub Secrets (5 Required)

Go to: **GitHub** → Your Repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

- [ ] **AZURE_PUBLISH_URL**  
  From `.PublishSettings`: Find `publishUrl` in the `<publishProfile publishMethod="ZipDeploy">` section  
  Example: `https://forestloop.scm.azurewebsites.net:443/api/zipdeploy`

- [ ] **AZURE_PUBLISH_USERNAME**  
  From `.PublishSettings`: Find `userName` (includes `$`)  
  Example: `$forestloop`

- [ ] **AZURE_PUBLISH_PASSWORD**  
  From `.PublishSettings`: Find `userPWD` (the new regenerated password)  
  Example: `9mk90dJ8Rhgm2CTsrhcg6PATbW7f...`

- [ ] **VITE_SUPABASE_URL**  
  From Supabase Dashboard → **Settings** → **API** → **Project URL**  
  Example: `https://xyzabc.supabase.co`

- [ ] **VITE_SUPABASE_ANON_KEY**  
  From Supabase Dashboard → **Settings** → **API** → **anon** public key  
  Example: `eyJhbGc...` (long string)

---

### ⚙️ Configure Azure App Service Environment Variables

Go to: **Azure Portal** → **App Services** → **forestloop** → **Settings** → **Configuration**

Click **+ New application setting** for each:

- [ ] **VITE_SUPABASE_URL** = [same value as GitHub Secret]
- [ ] **VITE_SUPABASE_ANON_KEY** = [same value as GitHub Secret]

Click **Save** and **Continue** when prompted to restart the app.

---

### ✅ Verify Files in Your Repo

- [ ] `.github/workflows/azure-deploy.yml` exists (workflow file)
- [ ] `web.config` exists (routing configuration)
- [ ] `AZURE_DEPLOYMENT.md` exists (full documentation)
- [ ] `.gitignore` includes `node_modules/` and `dist/` ✓ (already correct)

---

### 🧪 Test the Deployment

1. **Push a test commit to `main` branch:**
   ```bash
   git add .
   git commit -m "Deploy: Add Azure workflow configuration"
   git push origin main
   ```

2. **Watch the workflow run:**
   - Go to GitHub → Your Repo → **Actions** tab
   - Click on the **Deploy to Azure** workflow run
   - Watch logs in real-time

3. **Check deployment in Azure:**
   - Go to **App Services** → **forestloop** → **Deployment Center**
   - Verify new deployment appears in history

4. **Test the app:**
   - Visit `https://forestloop.azurewebsites.net`
   - Verify:
     - ✅ App loads (no 404 errors)
     - ✅ Game renders properly
     - ✅ Supabase connection works (check browser console)
     - ✅ All assets load (images, fonts, styles)

---

### 📋 Troubleshooting

**Workflow fails?** → Check [AZURE_DEPLOYMENT.md](AZURE_DEPLOYMENT.md#troubleshooting)

**Deployment doesn't appear in Azure?** → Run `npm run build:azure` locally to verify the build succeeds

**App loads but shows 404?** → Ensure `web.config` was deployed (check Kudu at `https://forestloop.scm.azurewebsites.net`)

**Supabase not connecting?** → Check that `VITE_SUPABASE_*` secrets and app settings match exactly (case-sensitive)

---

## 📚 Full Documentation

For complete setup instructions, troubleshooting, and advanced configuration, see: [AZURE_DEPLOYMENT.md](AZURE_DEPLOYMENT.md)

---

## 🎉 You're Done!

Once tests pass, your application will automatically deploy every time you push to `main` or `develop` branches.

**Automatic deployments are now enabled!**
