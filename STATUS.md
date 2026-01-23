# Investor OS - Current Status

## ✅ Working (Deployed to GitHub)

### Core APIs
- **Organizations**: Full CRUD (`/api/organizations`, `/api/organizations/[id]`)
- **People**: Full CRUD (`/api/people`, `/api/people/[id]`)
- **Deals**: Full CRUD (`/api/deals`, `/api/deals/[id]`)
- **Relationships**: Query and create (`/api/relationships`)
- **Facts**: Query and add with conflict detection (`/api/facts`)
- **AI Brain**: Chat with streaming responses (`/api/brain`)

### UI Pages
- Organizations list (`/organizations`)
- People list (`/people`)
- Deal pipeline kanban (`/deals`)
- AI Brain chat (`/brain`)

### Features
- Hybrid graph database in Postgres
- Flexible relationship model (AI can create new types)
- Email-based deduplication for People
- Domain-based deduplication for Organizations
- AI Brain with 19 tools for briefings, risk detection, etc.
- Privacy tiers (PUBLIC, INTERNAL, SENSITIVE, HIGHLY_SENSITIVE)
- Full provenance tracking for all facts

## ⏸️ Temporarily Disabled (Needs Fixes)

### APIs Needing Schema Alignment
- **Conversations API** - Schema mismatches with participants relationship
- **Investments API** - Decimal math type issues, field name mismatches
- **LP Commitments API** - Field name mismatches
- **Tasks API** - Field name mismatches

### UI Pages Needing Next.js 15 Updates
- Organization detail page (`/organizations/[id]`) - Client component params issue
- Person detail page (`/people/[id]`) - Client component params issue

## 🔧 Next Steps to Complete

### High Priority
1. **Fix Conversations API** (`app/api/conversations/`)
   - Update participants relationship to match schema (many-to-many direct to Person)
   - Remove nested `person` includes
   - Test create/read/update/delete operations

2. **Fix Investments API** (`app/api/investments/`)
   - Fix Decimal type arithmetic (convert to Number for calculations)
   - Update field names: `investmentAmount` → `amountInvested`, `currentValuation` → `currentValue`
   - Test portfolio queries

3. **Fix Tasks and LP Commitments APIs**
   - Align field names with schema
   - Test CRUD operations

4. **Fix Detail Pages** (`app/organizations/[id]`, `app/people/[id]`)
   - Convert to server components OR properly handle async params in client components
   - Test data fetching and display

### Medium Priority
5. **Re-enable AI Brain Conversation Persistence**
   - Design conversation storage strategy (separate from Investor OS Conversations?)
   - Implement chat history tracking
   - Add conversation list endpoint

6. **Add Missing Seed Data**
   - Run `npm run db:seed` on production database
   - Verify all entities load correctly

### Low Priority
7. **Address ESLint Warnings**
   - Fix React Hook dependency arrays
   - Replace `<img>` with Next.js `<Image>` component

8. **Add Tests**
   - API endpoint tests
   - Entity resolution tests
   - Conflict detection tests

## 🚀 Deployment Status

**GitHub**: ✅ https://github.com/drewsventures/investor-os

**Vercel**: ⏸️ Ready to deploy (see [VERCEL_DEPLOYMENT_GUIDE.md](./VERCEL_DEPLOYMENT_GUIDE.md))

### To Deploy to Vercel

```bash
cd /Users/drewgreenfeld/investor-os
npx vercel
```

Or via dashboard:
1. Go to https://vercel.com/new
2. Import `drewsventures/investor-os`
3. Add environment variables:
   - `DATABASE_URL`
   - `ANTHROPIC_API_KEY`
4. Deploy

### After Deployment

```bash
# Set up database
npx vercel env pull .env.production
DATABASE_URL="$(grep DATABASE_URL .env.production | cut -d '=' -f2-)" npx prisma db push
DATABASE_URL="$(grep DATABASE_URL .env.production | cut -d '=' -f2-)" npx tsx prisma/seed-investor-os.ts
```

## 📝 Notes for Team

- The build currently has some TypeScript errors in disabled routes
- Core functionality (Organizations, People, Deals, AI Brain) is working
- Disabled APIs can be re-enabled incrementally after fixes
- Database schema is complete and ready
- All normalization and AI tools are implemented

## 🔗 Related Docs

- [README.md](./README.md) - Full project overview
- [VERCEL_DEPLOYMENT_GUIDE.md](./VERCEL_DEPLOYMENT_GUIDE.md) - Deployment instructions
- [INVESTOR_OS_VERIFICATION.md](./INVESTOR_OS_VERIFICATION.md) - Testing guide
- [GITHUB_SETUP.md](./GITHUB_SETUP.md) - Git setup instructions

---

Last Updated: 2026-01-23
