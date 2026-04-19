# Step-by-Step GitHub Deployment Guide

This guide will walk you through deploying your Fuzzy Cognitive Mapper to GitHub Pages, even if you've never used GitHub before.

---

## Prerequisites

Before starting, you need:
1. A **GitHub account** (free) - Create one at [github.com](https:/tt/github.com)
2. **Git installed** on your computer

### Installing Git

**Windows:**
1. Download Git from [git-scm.com/download/win](https://git-scm.com/download/win)
2. Run the installer (accept default settings)
3. Restart your terminal/PowerShell after installation

**Verify installation:**
```bash
git --version
```
You should see something like `git version 2.x.x`

---

## Step 1: Create a GitHub Repository

1. Go to [github.com](https://github.com) and sign in
2. Click the **+** icon in the top-right corner
3. Select **"New repository"**
4. Fill in the details:
   - **Repository name:** `fuzzy-cognitive-mapper`
   - **Description:** `Interactive FCM modeling dashboard`
   - **Visibility:** Public (required for free GitHub Pages)
   - **DO NOT** check "Add a README file" (we already have one)
5. Click **"Create repository"**

You'll see a page with setup instructions. Keep this page open!

---

## Step 2: Configure Git (First Time Only)

Open PowerShell or Terminal and run:

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

Replace with your actual name and GitHub email.

---

## Step 3: Initialize and Push Your Code

Navigate to your project folder:

```bash
cd "C:\Users\balan\Dropbox\My PC (LAPTOP-7T883HG9)\Desktop\Longterm Projects\fuzzy-cognitive-mapper"
```

Then run these commands one by one:

```bash
# Initialize git repository
git init

# Add all files to staging
git add .

# Create your first commit
git commit -m "Initial commit: Fuzzy Cognitive Mapper"

# Add the GitHub repository as remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/fuzzy-cognitive-mapper.git

# Rename branch to 'main' (GitHub's default)
git branch -M main

# Push to GitHub
git push -u origin main
```

You may be asked to sign in to GitHub - follow the prompts.

---

## Step 4: Enable GitHub Pages

1. Go to your repository on GitHub: `https://github.com/YOUR_USERNAME/fuzzy-cognitive-mapper`
2. Click **"Settings"** (tab at the top)
3. In the left sidebar, click **"Pages"**
4. Under **"Build and deployment"**:
   - **Source:** Select **"GitHub Actions"**
5. That's it! The deployment will start automatically.

---

## Step 5: Wait for Deployment

1. Click the **"Actions"** tab in your repository
2. You'll see a workflow running called "Deploy to GitHub Pages"
3. Wait for it to complete (green checkmark) - usually takes 1-3 minutes
4. If it fails (red X), click on it to see what went wrong

---

## Step 6: Access Your App

Once deployment succeeds, your app will be live at:

```
https://YOUR_USERNAME.github.io/fuzzy-cognitive-mapper/
```

Replace `YOUR_USERNAME` with your actual GitHub username.

---

## Updating Your App

Whenever you make changes to your code:

```bash
# Navigate to project folder
cd "path/to/fuzzy-cognitive-mapper"

# Stage all changes
git add .

# Commit with a message describing what you changed
git commit -m "Description of your changes"

# Push to GitHub
git push
```

GitHub Actions will automatically rebuild and deploy your app.

---

## Troubleshooting

### "git is not recognized"
Git is not installed or not in PATH. Reinstall Git and restart your terminal.

### "Permission denied" or authentication errors
You may need to set up GitHub authentication:
1. Go to GitHub → Settings → Developer Settings → Personal Access Tokens
2. Generate a new token (classic) with "repo" permissions
3. Use the token as your password when pushing

Or use GitHub CLI:
```bash
winget install GitHub.cli
gh auth login
```

### Deployment fails
1. Check the Actions tab for error messages
2. Make sure your repository is **Public**
3. Verify that `package.json` and `vite.config.ts` are present

### White/blank page after deployment
The base path might be wrong. Check `vite.config.ts`:
```typescript
base: '/fuzzy-cognitive-mapper/',  // Must match your repo name
```

### "Page not found" (404)
- Wait a few minutes - GitHub Pages can take time to activate
- Verify the URL is correct (case-sensitive)
- Check Settings → Pages to confirm deployment

---

## Alternative: Vercel (Even Easier)

If GitHub Pages seems complicated, try Vercel:

1. Go to [vercel.com](https://vercel.com) and sign up with GitHub
2. Click "New Project"
3. Import your GitHub repository
4. Click "Deploy"
5. Done! Vercel gives you a URL automatically

---

## Quick Reference

| Action | Command |
|--------|---------|
| Check status | `git status` |
| Add all files | `git add .` |
| Commit changes | `git commit -m "message"` |
| Push to GitHub | `git push` |
| Pull updates | `git pull` |

---

## Need Help?

- **GitHub Docs:** [docs.github.com](https://docs.github.com)
- **Git Basics:** [git-scm.com/book](https://git-scm.com/book/en/v2/Getting-Started-Git-Basics)
- **Vite Deployment:** [vitejs.dev/guide/static-deploy](https://vitejs.dev/guide/static-deploy.html)

---

Good luck with your deployment! 🚀
