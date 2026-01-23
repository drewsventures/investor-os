# GitHub Repository Setup

Your Investor OS project is ready to push to GitHub as a separate repository.

## Option 1: Create Repository via GitHub Web UI

1. Go to [https://github.com/new](https://github.com/new)
2. Repository name: `investor-os`
3. Description: "Operating system for Red Beard Ventures and Denarii Labs"
4. Visibility: Choose Public or Private
5. **Do NOT initialize with README, .gitignore, or license** (we already have these)
6. Click "Create repository"

7. Copy the repository URL and run:
```bash
cd /Users/drewgreenfeld/investor-os
git remote add origin https://github.com/drewsventures/investor-os.git
# OR if using SSH:
git remote add origin git@github.com:drewsventures/investor-os.git

git push -u origin main
```

## Option 2: Create Repository via GitHub CLI

If you have `gh` CLI installed:

```bash
cd /Users/drewgreenfeld/investor-os

gh repo create drewsventures/investor-os \
  --public \
  --source=. \
  --description="Operating system for Red Beard Ventures and Denarii Labs" \
  --remote=origin \
  --push
```

## Verify

After pushing, your repository should be at:
- https://github.com/drewsventures/investor-os

## Next Steps

1. Deploy to Vercel (see VERCEL_DEPLOYMENT_GUIDE.md)
2. Set up environment variables in Vercel
3. Run database migrations
4. Seed with sample data (or start entering real data)

---

## Repository Structure

```
investor-os/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── organizations/     # Organizations pages
│   ├── people/           # People pages
│   ├── deals/            # Deal pipeline
│   ├── brain/            # AI Brain chat
│   └── layout.tsx        # Root layout
├── components/            # React components
│   └── investor-os/      # Investor OS components
├── lib/                   # Utilities and logic
│   ├── ai/               # AI tools and executors
│   └── normalization/    # Entity resolution
├── prisma/               # Database schema and seed
│   ├── schema.prisma     # Prisma schema
│   └── seed-investor-os.ts
├── public/               # Static assets
└── README.md            # Documentation
```

## What Changed from Finance Command Center

This is now a **standalone** Investor OS repository, separate from Finance Command Center:

- **Removed**: All Finance Command Center models (Entity, Account, Transaction, etc.)
- **Kept**: Only Investor OS models (Person, Organization, Deal, Investment, etc.)
- **Cleaned**: No dependencies on Finance Command Center code
- **Routes**: Moved from `/investor-os/*` to root level (`/organizations`, `/people`, etc.)

You can now develop and deploy Investor OS independently!
