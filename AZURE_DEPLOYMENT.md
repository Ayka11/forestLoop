# Azure Deployment Workflow Setup Guide

## ⚠️ SECURITY ALERT: Exposed Credentials

The Azure publish profile credentials provided in your request are **COMPROMISED** and must be revoked immediately.

### Step 1: Revoke Exposed Credentials (URGENT)

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to: **App Services** → **forestloop** → **Deployment Center**
3. Click **Disconnect** to remove the current deployment method
4. Under **Deployment credentials**, click **User scope** credentials
5. Click **Reset publish profile** to generate new credentials
6. Download the new `.PublishSettings` file (you'll need the new password)

---

## Step 2: Configure GitHub Secrets

The workflow uses GitHub Secrets to securely store Azure credentials without committing them to version control.

### Add Secrets to Your GitHub Repository

1. Go to your GitHub repository
2. Navigate to: **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add the following:

#### Required Secrets:

| Secret Name | Value | Source |
|-------------|-------|--------|
| `AZURE_PUBLISH_URL` | `https://forestloop.scm.azurewebsites.net:443/api/zipdeploy` | From `.PublishSettings` file or Deployment Center |
| `AZURE_PUBLISH_USERNAME` | `$forestloop` | From `.PublishSettings` file (includes `$` prefix) |
| `AZURE_PUBLISH_PASSWORD` | New password from regenerated profile | From `.PublishSettings` file |
| `VITE_SUPABASE_URL` | Your Supabase project URL | From Supabase dashboard |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key | From Supabase dashboard |

### How to Extract Values from `.PublishSettings`

If you downloaded a `.PublishSettings` file, open it in a text editor and find the `<publishProfile>` element with `publishMethod="ZipDeploy"`:

```xml
<publishProfile publishMethod="ZipDeploy" 
                publishUrl="https://forestloop.scm.azurewebsites.net:443/api/zipdeploy"
                userName="$forestloop"
                userPWD="[NEW_PASSWORD]"
                ...>
```

- **AZURE_PUBLISH_URL**: Use the `publishUrl` value
- **AZURE_PUBLISH_USERNAME**: Use the `userName` value (include the `$`)
- **AZURE_PUBLISH_PASSWORD**: Use the `userPWD` value

---

## Step 3: Configure Azure App Service Runtime Environment Variables

Your application needs environment variables for Supabase configuration. Set these in Azure Portal:

1. Go to **App Services** → **forestloop**
2. Navigate to **Settings** → **Configuration** → **Application settings**
3. Add the following **new** application settings:

| Setting Name | Value |
|--------------|-------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key |

**Note**: These settings are automatically injected as environment variables during the build process via GitHub Actions secrets.

---

## Step 4: Verify Workflow Configuration

### Workflow Trigger Branches

The workflow automatically deploys when you push to these branches:
- `main` (primary deployment branch)
- `develop` (secondary deployment branch)

To modify which branches trigger deployments, edit `.github/workflows/azure-deploy.yml`:

```yaml
on:
  push:
    branches:
      - main
      - develop
```

### Manual Workflow Trigger

You can manually trigger the workflow from the GitHub Actions tab:

1. Go to your GitHub repository
2. Click **Actions** tab
3. Select **Deploy to Azure** workflow
4. Click **Run workflow** → select branch → **Run workflow**

---

## Step 5: Monitor Deployments

### GitHub Actions

1. Go to your GitHub repository
2. Click **Actions** tab
3. View the **Deploy to Azure** workflow
4. Click on a workflow run to see build logs, test results, and deployment status

### Azure Deployment Center

1. Go to **App Services** → **forestloop** → **Deployment Center**
2. View recent deployment history
3. Click on a deployment to see detailed logs

### Test Your Application

Once deployment succeeds:

```
https://forestloop.azurewebsites.net
```

Verify:
- ✅ App loads successfully
- ✅ Game functionality works
- ✅ Supabase connectivity (check browser console for errors)
- ✅ All assets load (images, fonts, styles)

---

## Troubleshooting

### Workflow Fails at "Build application" Step

**Possible causes:**
- Missing or incorrect Supabase environment variables in GitHub Secrets
- Build script issues (`npm run build:azure` not found)

**Solution:**
```bash
# Test locally:
VITE_SUPABASE_URL=your_url VITE_SUPABASE_ANON_KEY=your_key npm run build:azure
```

### Deployment Fails at "Deploy to Azure" Step

**Possible causes:**
- Incorrect `AZURE_PUBLISH_PASSWORD` or `AZURE_PUBLISH_USERNAME`
- `AZURE_PUBLISH_URL` is malformed
- Azure credentials have been revoked

**Solution:**
1. Verify secrets match exactly (copy/paste, watch for spaces)
2. Regenerate `.PublishSettings` in Azure Portal
3. Update all three Azure secrets with new values

### 404 Errors After Deployment

**Possible causes:**
- `web.config` is not included in deployment
- React Router not working properly

**Solution:**
1. Verify `web.config` exists in repository root
2. Verify workflow uses `zip -r` to include all files recursively
3. Check Azure App Service application settings

### App Loads But Supabase Connection Fails

**Possible causes:**
- `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` not set or incorrect
- Supabase project not configured for CORS

**Solution:**
1. Verify GitHub Secrets are spelled correctly (case-sensitive)
2. Verify values in Azure Application Settings match
3. In Supabase: **Settings** → **API** → **CORS** → add `https://forestloop.azurewebsites.net`

### "dist" Folder Not Found in Deployment

**Possible causes:**
- Build step failed silently
- Workflow cache is stale

**Solution:**
1. Check workflow logs for build errors
2. Clear cache: In workflow file, comment out cache lines temporarily:
   ```yaml
   # cache: 'npm'
   ```
3. Re-run workflow

---

## Files Created

- **`.github/workflows/azure-deploy.yml`** — GitHub Actions workflow for CI/CD
- **`web.config`** — Azure App Service configuration for Node.js/React routing
- **`AZURE_DEPLOYMENT.md`** — This deployment guide

---

## Next Steps

1. ✅ Revoke old credentials (URGENT)
2. ✅ Add GitHub Secrets (required for workflow)
3. ✅ Configure Azure App Service settings
4. ✅ Push a test commit to `main` branch
5. ✅ Verify workflow runs in GitHub Actions
6. ✅ Verify deployment in Azure Portal
7. ✅ Test application at https://forestloop.azurewebsites.net

---

## Support References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Azure App Service Deployment](https://learn.microsoft.com/en-us/azure/app-service/deploy-ci-cd-custom-container?tabs=acr&pivots=container-linux)
- [Vite Build Configuration](https://vitejs.dev/guide/build.html)
- [React Router with Vite](https://vitejs.dev/guide/)
