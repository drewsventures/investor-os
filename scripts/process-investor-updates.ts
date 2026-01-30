/**
 * Process Investor Update Emails
 *
 * Finds investor update emails, summarizes them with AI,
 * and creates Update records linked to organizations.
 */

import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../lib/db';
import { UpdateType } from '@prisma/client';

// Initialize Anthropic client
const anthropic = new Anthropic();

// Patterns that indicate an investor update email
const INVESTOR_UPDATE_PATTERNS = [
  'investor update',
  'monthly update',
  'quarterly update',
  'q1 update', 'q2 update', 'q3 update', 'q4 update',
  'q1 2025', 'q2 2025', 'q3 2025', 'q4 2025',
  'q1 2026', 'q2 2026', 'q3 2026', 'q4 2026',
  'company update',
  'portfolio update',
  'shareholder update',
  'board update',
  'founder update',
  'ceo update',
  'status update for investors',
  'operations update',
  'January 2026', 'February 2026', 'December 2025', 'November 2025',
];

// Patterns to exclude (newsletters, marketing, etc.)
const EXCLUDE_PATTERNS = [
  'newsletter',
  'weekly newsletter',
  'capital markets update',
  'market data update',
  'daily update',
  'product update',
  'pricing update',
  'annual report is due',
  'viewed the document',
  'slack]',
];

interface InvestorUpdateSummary {
  companyName: string;
  period: string; // e.g., "Q4 2025", "December 2025"
  keyHighlights: string[];
  metrics?: {
    revenue?: string;
    users?: string;
    growth?: string;
    runway?: string;
    other?: string[];
  };
  challenges?: string[];
  nextSteps?: string[];
  summary: string; // 2-3 sentence summary
}

async function summarizeInvestorUpdate(
  subject: string,
  body: string,
  fromEmail: string
): Promise<InvestorUpdateSummary | null> {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: `You are analyzing an investor update email. Extract and summarize the key information.

Subject: ${subject}
From: ${fromEmail}

Email Body:
${body?.substring(0, 8000) || '(no body)'}

---

Please extract the following in JSON format:
{
  "companyName": "The company sending the update",
  "period": "The time period covered (e.g., 'Q4 2025', 'December 2025', 'January 2026')",
  "keyHighlights": ["List of 3-5 key highlights/achievements"],
  "metrics": {
    "revenue": "Revenue figure if mentioned",
    "users": "User/customer count if mentioned",
    "growth": "Growth rate if mentioned",
    "runway": "Runway/burn info if mentioned",
    "other": ["Any other notable metrics"]
  },
  "challenges": ["List of challenges mentioned, if any"],
  "nextSteps": ["List of upcoming plans/goals, if any"],
  "summary": "A 2-3 sentence executive summary of the update"
}

If any field is not mentioned in the email, use null for that field.
Return ONLY valid JSON, no other text.`
        }
      ]
    });

    const content = response.content[0];
    if (content.type !== 'text') return null;

    // Parse JSON response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[0]) as InvestorUpdateSummary;
  } catch (error) {
    console.error('Error summarizing update:', error);
    return null;
  }
}

async function findOrganizationByName(companyName: string): Promise<string | null> {
  if (!companyName) return null;

  // Try exact match first
  const exactMatch = await prisma.organization.findFirst({
    where: { name: { equals: companyName, mode: 'insensitive' } },
    select: { id: true }
  });
  if (exactMatch) return exactMatch.id;

  // Try contains match
  const containsMatch = await prisma.organization.findFirst({
    where: { name: { contains: companyName, mode: 'insensitive' } },
    select: { id: true }
  });
  if (containsMatch) return containsMatch.id;

  // Try with common variations
  const variations = [
    companyName.replace(/ Labs$/i, ''),
    companyName.replace(/ Inc\.?$/i, ''),
    companyName.replace(/ LLC$/i, ''),
    companyName.replace(/ Co\.?$/i, ''),
  ];

  for (const variation of variations) {
    if (variation !== companyName) {
      const match = await prisma.organization.findFirst({
        where: { name: { contains: variation, mode: 'insensitive' } },
        select: { id: true }
      });
      if (match) return match.id;
    }
  }

  return null;
}

async function getSystemUser(): Promise<string> {
  // Get or create a system user for automated updates
  let user = await prisma.user.findFirst({
    where: { email: 'system@investor-os.local' }
  });

  if (!user) {
    // Try to find any user to attribute to
    user = await prisma.user.findFirst();
  }

  if (!user) {
    throw new Error('No user found in database. Please create a user first.');
  }

  return user.id;
}

async function main() {
  console.log('Processing investor update emails...\n');

  // Get system user for attribution
  const authorId = await getSystemUser();
  console.log('Using author ID:', authorId);

  // Find investor update emails
  const emails = await prisma.emailMessage.findMany({
    where: {
      OR: INVESTOR_UPDATE_PATTERNS.map(pattern => ({
        subject: { contains: pattern, mode: 'insensitive' as const }
      }))
    },
    orderBy: { sentAt: 'asc' }, // Process oldest first for timeline order
    select: {
      id: true,
      subject: true,
      fromEmail: true,
      fromName: true,
      sentAt: true,
      snippet: true,
      bodyText: true,
      orgLinks: {
        select: { organization: { select: { id: true, name: true } } }
      }
    }
  });

  // Filter out newsletters and marketing emails
  const filteredEmails = emails.filter(email => {
    const subject = (email.subject || '').toLowerCase();
    return !EXCLUDE_PATTERNS.some(pattern => subject.includes(pattern.toLowerCase()));
  });

  console.log(`Found ${emails.length} potential investor update emails.`);
  console.log(`After filtering: ${filteredEmails.length} emails to process.\n`);

  // Check for existing updates to avoid duplicates
  const existingUpdates = await prisma.update.findMany({
    where: { type: UpdateType.INVESTOR_UPDATE },
    select: { metadata: true }
  });
  const existingEmailIds = new Set(
    existingUpdates
      .filter(u => u.metadata && typeof u.metadata === 'object')
      .map(u => (u.metadata as { emailId?: string })?.emailId)
      .filter(Boolean)
  );

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const email of filteredEmails) {
    // Skip if already processed
    if (existingEmailIds.has(email.id)) {
      console.log(`[SKIP] Already processed: ${email.subject?.substring(0, 50)}`);
      skipped++;
      continue;
    }

    console.log(`\n[PROCESSING] ${email.subject?.substring(0, 60)}`);
    console.log(`  From: ${email.fromName || email.fromEmail}`);
    console.log(`  Date: ${email.sentAt?.toISOString().split('T')[0]}`);

    // Summarize with AI
    const summary = await summarizeInvestorUpdate(
      email.subject || '',
      email.bodyText || email.snippet || '',
      email.fromEmail || ''
    );

    if (!summary) {
      console.log('  [FAILED] Could not summarize email');
      failed++;
      continue;
    }

    console.log(`  Company: ${summary.companyName}`);
    console.log(`  Period: ${summary.period}`);

    // Find organization
    let organizationId: string | null = null;

    // First check if already linked
    if (email.orgLinks.length > 0) {
      organizationId = email.orgLinks[0].organization.id;
      console.log(`  Linked to: ${email.orgLinks[0].organization.name}`);
    } else {
      // Try to find by company name from AI summary
      organizationId = await findOrganizationByName(summary.companyName);
      if (organizationId) {
        const org = await prisma.organization.findUnique({
          where: { id: organizationId },
          select: { name: true }
        });
        console.log(`  Matched to: ${org?.name}`);
      } else {
        console.log(`  [WARNING] Could not find organization: ${summary.companyName}`);
      }
    }

    // Format the content
    const formattedContent = formatUpdateContent(summary);

    // Create Update record
    try {
      await prisma.update.create({
        data: {
          type: UpdateType.INVESTOR_UPDATE,
          title: `${summary.companyName} - ${summary.period}`,
          content: formattedContent,
          updateDate: email.sentAt || new Date(),
          organizationId,
          authorId,
          sourceAuthor: email.fromName || email.fromEmail || undefined,
          sourceName: 'Email',
          metadata: {
            emailId: email.id,
            emailSubject: email.subject,
            companyName: summary.companyName,
            period: summary.period,
            keyHighlights: summary.keyHighlights,
            metrics: summary.metrics,
            challenges: summary.challenges,
            nextSteps: summary.nextSteps,
          }
        }
      });
      console.log('  [CREATED] Update added successfully');
      created++;
    } catch (error) {
      console.error('  [ERROR] Failed to create update:', error);
      failed++;
    }

    // Rate limit to avoid API throttling
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n=== Summary ===');
  console.log(`Created: ${created}`);
  console.log(`Skipped (already exists): ${skipped}`);
  console.log(`Failed: ${failed}`);
}

function formatUpdateContent(summary: InvestorUpdateSummary): string {
  let content = `## Summary\n${summary.summary}\n\n`;

  if (summary.keyHighlights?.length > 0) {
    content += `## Key Highlights\n`;
    summary.keyHighlights.forEach(h => {
      content += `- ${h}\n`;
    });
    content += '\n';
  }

  if (summary.metrics) {
    const metrics = summary.metrics;
    const hasMetrics = metrics.revenue || metrics.users || metrics.growth || metrics.runway || (metrics.other?.length ?? 0) > 0;

    if (hasMetrics) {
      content += `## Metrics\n`;
      if (metrics.revenue) content += `- **Revenue:** ${metrics.revenue}\n`;
      if (metrics.users) content += `- **Users/Customers:** ${metrics.users}\n`;
      if (metrics.growth) content += `- **Growth:** ${metrics.growth}\n`;
      if (metrics.runway) content += `- **Runway:** ${metrics.runway}\n`;
      metrics.other?.forEach(m => {
        content += `- ${m}\n`;
      });
      content += '\n';
    }
  }

  if (summary.challenges && summary.challenges.length > 0) {
    content += `## Challenges\n`;
    summary.challenges.forEach(c => {
      content += `- ${c}\n`;
    });
    content += '\n';
  }

  if (summary.nextSteps && summary.nextSteps.length > 0) {
    content += `## Next Steps / Outlook\n`;
    summary.nextSteps.forEach(n => {
      content += `- ${n}\n`;
    });
  }

  return content.trim();
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
