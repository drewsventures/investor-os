# Investor OS

Operating system for Red Beard Ventures (VC fund) and Denarii Labs (advisory company). A knowledge graph-powered platform for investor relations, portfolio management, and deal flow - replacing Attio CRM.

## Overview

Investor OS combines **pipes (architecture) + brain (AI) + system (data model)** to create a unified operating system for venture capital operations.

### Key Features

- **Knowledge Graph**: Hybrid graph database in Postgres with flexible, evolving relationships
- **AI Brain**: Claude-powered AI assistant with 19 tools for briefings, risk detection, and relationship discovery
- **Deal Pipeline**: Kanban-style deal tracking from source to portfolio
- **Portfolio Management**: Track investments, metrics, and performance over time
- **LP Management**: Manage limited partner commitments and distributions
- **Conversation Tracking**: Record meetings, calls, and emails with automatic fact extraction
- **Provenance-First**: Every fact tracks its source, confidence, and timestamp
- **Automatic Deduplication**: Email-based for people, domain-based for organizations
- **Conflict Detection**: Smart resolution strategies for conflicting data

## Architecture

### Tech Stack

- **Framework**: Next.js 15 with React 19
- **Database**: PostgreSQL with Prisma ORM
- **AI**: Anthropic Claude Sonnet 4 with tool calling
- **Styling**: Tailwind CSS
- **Icons**: Lucide React

### Data Model

#### Core Entities

- **Person**: People in your network (founders, LPs, advisors)
- **Organization**: Companies (portfolio, prospects, LPs, service providers)
- **Relationship**: Flexible graph edges between any entities (AI can create new types)
- **Deal**: Investment opportunities through the pipeline
- **Investment**: Closed deals in your portfolio
- **LPCommitment**: Limited partner commitments and capital calls
- **Conversation**: Meetings, emails, calls with transcripts
- **Task**: Action items and follow-ups
- **Fact**: Atomic knowledge units with full provenance
- **Metrics**: Time-series data for organizations and investments

#### Privacy Tiers

- **PUBLIC**: Shareable publicly
- **INTERNAL**: Internal team only
- **SENSITIVE**: Need-to-know basis
- **HIGHLY_SENSITIVE**: Highly restricted (financials, terms)

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database
- Anthropic API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/drewsventures/investor-os.git
cd investor-os
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your database URL and Anthropic API key.

4. Set up the database:
```bash
npm run db:push
```

5. Seed with sample data (optional):
```bash
npm run db:seed
```

6. Start the development server:
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000)

## Usage

### Main Pages

- `/organizations` - Browse and manage all organizations
- `/people` - Your network of founders, LPs, and advisors
- `/deals` - Deal pipeline kanban board
- `/investments` - Portfolio overview and tracking
- `/brain` - AI Brain chat interface

### AI Brain Capabilities

The AI Brain has access to 19 tools:

**Read Tools:**
- Get organization details with metrics and relationships
- Get person details with connections and LP commitments
- Query deal pipeline by stage
- Search recent conversations
- Traverse relationship graph for warm intro paths
- Fetch time-series metrics

**Analysis Tools:**
- Detect risks (runway, burn rate, valuation multiples)
- Generate comprehensive briefings
- Find warm introduction paths through your network

**Write Tools:**
- Add facts with automatic conflict detection
- Create flexible relationships (AI invents new types as needed)
- Add organizations and people with deduplication
- Create deals and move them through the pipeline
- Create tasks and action items

### Example Queries for AI Brain

```
"Give me a briefing on Vertex Protocol"
"What deals are in diligence stage?"
"Who can introduce me to the CEO of Acme Corp?"
"What are the risks in my portfolio?"
"Show me all conversations with Sarah Chen this month"
```

## Development

### Database Management

```bash
# Push schema changes
npm run db:push

# Open Prisma Studio (database GUI)
npm run db:studio

# Seed database
npm run db:seed
```

### Key Design Decisions

1. **Hybrid Graph-in-Postgres**: Uses generic `Relationship` model with string-based types instead of enums, allowing AI to organically create new relationship types

2. **Fact Versioning**: Facts are never deleted, only invalidated with `validUntil`. Creates audit trail and enables time-travel queries.

3. **Canonical Keys**: Email for Person, domain for Organization. Prevents duplicates across data sources.

4. **Conflict Resolution**: Different strategies by fact type:
   - Metrics (MRR, ARR) → `latest_wins` (they change over time)
   - Contact info → `user_confirm` (important to verify)
   - Notes → `merge` (combine all sources)
   - High-stakes data → `user_confirm` (manual review)

5. **Privacy Enforcement**: At data level, not UI level. Ensures sensitive data never leaks.

6. **Provenance-First**: Every fact, relationship, and conversation tracks its source.

## API Endpoints

### Organizations
- `GET /api/organizations` - List all organizations
- `POST /api/organizations` - Create/update organization (with deduplication)
- `GET /api/organizations/[id]` - Get organization details
- `PATCH /api/organizations/[id]` - Update organization
- `DELETE /api/organizations/[id]` - Delete organization

### People
- `GET /api/people` - List all people
- `POST /api/people` - Create/update person (with deduplication)
- `GET /api/people/[id]` - Get person details
- `PATCH /api/people/[id]` - Update person
- `DELETE /api/people/[id]` - Delete person

### Deals
- `GET /api/deals` - List all deals
- `POST /api/deals` - Create deal
- `GET /api/deals/[id]` - Get deal details
- `PATCH /api/deals/[id]` - Update deal (including stage changes)

### AI Brain
- `POST /api/brain` - Chat with AI Brain (streaming)
- `GET /api/brain/conversations` - Get conversation history
- `DELETE /api/brain/conversations/[id]` - Delete conversation

### Facts
- `GET /api/facts` - Query facts
- `POST /api/facts` - Add fact (returns 409 if conflict detected)

### Relationships
- `GET /api/relationships` - Query relationships
- `POST /api/relationships` - Create relationship

## Deployment

See [VERCEL_DEPLOYMENT_GUIDE.md](./VERCEL_DEPLOYMENT_GUIDE.md) for detailed deployment instructions.

Quick deploy to Vercel:

```bash
npx vercel
```

## Roadmap

### Phase 1 (MVP) ✅ COMPLETE
- Schema & data model
- Normalization & deduplication
- AI brain with 19 tools
- Complete REST API layer
- Modern UI with React 19
- Seed data & testing

### Phase 2 (Post-MVP)
- Email ingestion (Gmail API)
- Fireflies.ai integration for call transcripts
- Google Sheets sync for metrics
- AngelList sync for deal flow
- Enrichment APIs (Clearbit, etc.)
- Vector search with pgvector
- Background job queue (BullMQ)
- Attio data migration tools
- Advanced conflict resolution UI
- Relationship network visualizer
- Portfolio dashboard with charts
- Authentication & multi-tenant support
- Audit logs for compliance

## License

Private - Red Beard Ventures & Denarii Labs

## Support

For questions or issues, contact the team or open an issue in the repository.
# Trigger redeploy Fri Jan 23 17:39:04 EST 2026
