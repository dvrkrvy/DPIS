# GitHub Pages Deployment Guide

This guide explains how to deploy your DPIS application to GitHub Pages.

## Repository Links
- **GitHub Repository**: https://github.com/dvrkrvy/DPIS
- **GitHub Pages URL**: https://dvrkrvy.github.io/DPIS

## Setup Instructions

### 1. Initial Git Configuration

If Git is not already configured, run these commands:

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### 2. Verify Remote Repository

Check that your remote is correctly configured:

```bash
git remote -v
```

Should show:
```
origin  https://github.com/dvrkrvy/DPIS.git (fetch)
origin  https://github.com/dvrkrvy/DPIS.git (push)
```

If not, add the remote:
```bash
git remote add origin https://github.com/dvrkrvy/DPIS.git
```

### 3. Enable GitHub Pages

1. Go to your repository: https://github.com/dvrkrvy/DPIS
2. Click on **Settings**
3. Scroll down to **Pages** section
4. Under **Source**, select:
   - **Deploy from a branch**: `gh-pages` branch, `/ (root)` folder
   - OR
   - **GitHub Actions** (recommended - automatic deployment)

### 4. Deployment Methods

#### Method 1: Automatic Deployment via GitHub Actions (Recommended)

The repository includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that automatically deploys to GitHub Pages whenever you push to the `main` branch.

**To use this method:**
1. Ensure GitHub Actions is enabled in your repository settings
2. Push your changes to the `main` branch:
   ```bash
   git add .
   git commit -m "Your commit message"
   git push origin main
   ```
3. The workflow will automatically build and deploy your site

#### Method 2: Manual Deployment using gh-pages

**Windows (Batch):**
```bash
deploy-to-github-pages.bat
```

**Windows (PowerShell):**
```powershell
.\deploy-to-github-pages.ps1
```

**Manual commands:**
```bash
cd frontend
npm run build
npm run deploy
```

### 5. Making Changes and Deploying

1. **Make your changes** to the codebase
2. **Commit changes:**
   ```bash
   git add .
   git commit -m "Description of changes"
   git push origin main
   ```
3. **If using GitHub Actions**: Deployment happens automatically
4. **If using manual deployment**: Run the deployment script

### 6. Verify Deployment

After deployment:
- Wait 1-2 minutes for GitHub Pages to update
- Visit: https://dvrkrvy.github.io/DPIS
- Check GitHub Actions tab for deployment status

## Important Notes

### Frontend Configuration

The frontend is configured to work with GitHub Pages:
- `homepage` in `frontend/package.json` is set to `https://dvrkrvy.github.io/DPIS`
- API base URL is configured in `frontend/src/config.js` to point to your backend

### Build Output

- The build output goes to `frontend/build/`
- This folder is ignored in `.gitignore` (not committed to main branch)
- The `gh-pages` branch contains only the built files

### Troubleshooting

**If GitHub Pages shows 404:**
1. Check that GitHub Pages is enabled in repository settings
2. Verify the source branch is set correctly
3. Ensure the build completed successfully

**If changes don't appear:**
1. Clear browser cache (Ctrl+Shift+R)
2. Check GitHub Actions logs for errors
3. Verify the build completed successfully

**If deployment fails:**
1. Check Node.js version (18+ required)
2. Ensure all dependencies are installed: `cd frontend && npm install`
3. Check GitHub Actions logs for specific errors

## Workflow Summary

```
Make Changes → Commit → Push to main → (Auto-deploy) → GitHub Pages Updated
```

Or manually:
```
Make Changes → Commit → Push → Run deploy script → GitHub Pages Updated
```

## Support

For issues:
- Check GitHub Actions logs
- Verify repository settings
- Ensure all environment variables are set correctly
