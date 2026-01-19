# Quick Deploy Guide

## 🚀 Quick Start

### To push changes to GitHub:
```bash
git add .
git commit -m "Your message"
git push origin main
```

Or use the helper script:
```bash
git-commit-and-push.bat
```

### To deploy to GitHub Pages:

**Option 1: Automatic (Recommended)**
- Just push to `main` branch
- GitHub Actions will automatically deploy

**Option 2: Manual**
```bash
deploy-to-github-pages.bat
```

## 📍 Important Links
- **Repository**: https://github.com/dvrkrvy/DPIS
- **GitHub Pages**: https://dvrkrvy.github.io/DPIS

## ⚙️ Setup GitHub Pages (One-time)

1. Go to: https://github.com/dvrkrvy/DPIS/settings/pages
2. Under "Source", select: **GitHub Actions**
3. Save

That's it! Now every push to `main` will automatically deploy.

## 📝 Workflow

```
Edit Code → git add . → git commit -m "message" → git push → Auto Deploy → Live!
```
