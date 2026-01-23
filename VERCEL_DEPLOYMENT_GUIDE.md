# Vercel Deployment Guide - Investor OS

## Quick Deploy Steps

### 1. Import Project to Vercel

1. Go to [https://vercel.com/new](https://vercel.com/new)
2. Sign in with your GitHub account
3. Click "Import Project" or "Import Git Repository"
4. Select `drewsventures/finance-command-center` repository
5. Vercel will automatically detect it's a Next.js project

### 2. Configure Project Settings

**Framework Preset**: Next.js (auto-detected)

**Root Directory**: `./` (leave as default)

**Build Command**: `npm run build` (auto-detected)

**Output Directory**: `.next` (auto-detected)

**Install Command**: `npm install` (auto-detected)

### 3. Set Environment Variables

Add the following environment variables in the Vercel dashboard:

#### Required Variables

```bash
# Database
DATABASE_URL="your_postgres_connection_string"

# Anthropic AI
ANTHROPIC_API_KEY="your_anthropic_api_key"

# NextAuth (if using authentication)
NEXTAUTH_URL="https://your-vercel-domain.vercel.app"
NEXTAUTH_SECRET="generate_random_secret_here"
```

#### How to Add Environment Variables in Vercel

1. In the "Environment Variables" section during import, or
2. After deployment: Project Settings → Environment Variables
3. Add each variable with name and value
4. Select environments: Production, Preview, Development (recommended: all three)

### 4. Deploy

1. Click "Deploy" button
2. Vercel will:
   - Clone your GitHub repo
   - Install dependencies
   - Run `npx prisma generate` (via postinstall script)
   - Build the Next.js app
   - Deploy to production

### 5. Post-Deployment Database Setup

After first deployment, you need to set up your production database:

#### Option A: Use Vercel Postgres (Recommended)

1. In Vercel dashboard → Storage → Create Database → Postgres
2. Vercel automatically sets `DATABASE_URL` environment variable
3. Connect to production database and run migrations:

```bash
# Install Vercel CLI locally (no global install needed)
npx vercel login

# Link to your project
npx vercel link

# Pull environment variables
npx vercel env pull .env.production

# Run Prisma migrations
DATABASE_URL="$(grep DATABASE_URL .env.production | cut -d '=' -f2-)" npx prisma db push

# Seed database (optional)
DATABASE_URL="$(grep DATABASE_URL .env.production | cut -d '=' -f2-)" npx tsx prisma/seed-investor-os.ts
```

#### Option B: Use Existing Postgres Database

1. Get your production Postgres connection string
2. Add as `DATABASE_URL` environment variable in Vercel
3. Connect via CLI and run migrations:

```bash
# Using your production DATABASE_URL
DATABASE_URL="your_production_db_url" npx prisma db push
DATABASE_URL="your_production_db_url" npx tsx prisma/seed-investor-os.ts
```

### 6. Verify Deployment

Visit your deployed app at `https://your-project-name.vercel.app`

Test key pages:
- `/investor-os/organizations` - Organizations list
- `/investor-os/people` - People list
- `/investor-os/deals` - Deal pipeline kanban
- `/investor-os/brain` - AI Brain chat interface

### 7. Set Up Automatic Deployments

Vercel automatically deploys when you push to GitHub:
- **Production**: Pushes to `main` branch → Production deployment
- **Preview**: Pushes to other branches → Preview deployment

---

## Environment Variables Reference

### DATABASE_URL Format

```
postgresql://user:password@host:port/database?sslmode=require
```

Example (Vercel Postgres):
```
postgres://default:abc123@ep-cool-sound-123456.us-east-1.postgres.vercel-storage.com/verceldb?sslmode=require
```

### ANTHROPIC_API_KEY

Get your API key from [https://console.anthropic.com/](https://console.anthropic.com/)

Format: `sk-ant-api03-...`

### NEXTAUTH_SECRET

Generate a random secret:
```bash
openssl rand -base64 32
```

---

## Troubleshooting

### Build Fails: "Prisma Client Not Generated"

**Solution**: Ensure `package.json` has postinstall script:
```json
{
  "scripts": {
    "postinstall": "prisma generate"
  }
}
```

### Runtime Error: "PrismaClient Not Found"

**Solution**: Redeploy after verifying `prisma generate` runs in build logs

### Database Connection Fails

**Solution**:
1. Verify `DATABASE_URL` is set in Vercel environment variables
2. Check database allows connections from Vercel IPs (most cloud DBs do)
3. Ensure `?sslmode=require` is in connection string

### AI Brain Not Working

**Solution**:
1. Verify `ANTHROPIC_API_KEY` is set in Vercel environment variables
2. Check API key is valid in Anthropic console
3. Verify API key has sufficient credits

---

## Custom Domain (Optional)

1. Vercel Dashboard → Your Project → Settings → Domains
2. Add your custom domain (e.g., `investor-os.redbeardventures.com`)
3. Update DNS records as instructed by Vercel
4. Update `NEXTAUTH_URL` environment variable to match custom domain

---

## Monitoring & Logs

**View Logs:**
- Vercel Dashboard → Your Project → Deployments → Click deployment → Function Logs
- Real-time logs during deployment
- Runtime logs for API routes and errors

**Analytics:**
- Vercel Dashboard → Your Project → Analytics
- Page views, response times, error rates

**Speed Insights:**
- Vercel Dashboard → Your Project → Speed Insights
- Core Web Vitals tracking

---

## Next Steps After Deployment

1. Test all Investor OS features on production
2. Share deployment URL with team for feedback
3. Set up custom domain if needed
4. Configure production database backups
5. Add more seed data or start entering real data
6. Iterate based on usage feedback

---

## Quick Commands Reference

```bash
# Deploy from CLI (after installing Vercel CLI)
npx vercel

# Deploy to production
npx vercel --prod

# View logs
npx vercel logs

# Pull environment variables
npx vercel env pull

# Link local project to Vercel project
npx vercel link
```

---

## Support

- **Vercel Docs**: https://vercel.com/docs
- **Next.js Deployment**: https://nextjs.org/docs/deployment
- **Prisma with Vercel**: https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-vercel

