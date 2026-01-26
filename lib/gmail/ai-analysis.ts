/**
 * AI Analysis for Gmail
 * Uses Claude to generate relationship summaries and extract action items
 */

import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/db';

const anthropic = new Anthropic();
const MODEL = 'claude-sonnet-4-20250514';

export interface RelationshipSummary {
  summary: string;
  keyTopics: string[];
  relationshipType: string;
  lastInteraction: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence: number;
}

export interface ActionItem {
  description: string;
  owner: string;
  dueDate: string | null;
  priority: 'high' | 'medium' | 'low';
  confidence: number;
  sourceEmailId: string;
}

/**
 * Generate relationship summary for a person
 */
export async function generateRelationshipSummary(
  personId: string,
  maxEmails: number = 20
): Promise<RelationshipSummary | null> {
  try {
    // Get person info
    const person = await prisma.person.findUnique({
      where: { id: personId },
      select: { id: true, fullName: true, email: true },
    });

    if (!person) return null;

    // Get recent emails involving this person
    const emails = await prisma.emailMessage.findMany({
      where: {
        personLinks: { some: { personId } },
      },
      orderBy: { sentAt: 'desc' },
      take: maxEmails,
      select: {
        subject: true,
        snippet: true,
        bodyText: true,
        fromEmail: true,
        sentAt: true,
        isInbound: true,
      },
    });

    if (emails.length === 0) return null;

    // Format emails for the prompt
    const emailContext = emails
      .map((e) => {
        const direction = e.isInbound ? 'FROM' : 'TO';
        const date = e.sentAt.toISOString().split('T')[0];
        const body = e.bodyText?.slice(0, 500) || e.snippet;
        return `[${date}] ${direction} ${person.fullName}:\nSubject: ${e.subject}\n${body}\n`;
      })
      .join('\n---\n');

    const prompt = `You are analyzing email exchanges between an investor and a contact named ${person.fullName} (${person.email || 'email not known'}).

Here are their recent email exchanges (most recent first):

${emailContext}

Based on these emails, provide a relationship analysis in the following JSON format:
{
  "summary": "2-3 sentence summary of the relationship and recent interactions",
  "keyTopics": ["topic1", "topic2", "topic3"],
  "relationshipType": "investor-founder | investor-lp | investor-advisor | co-investor | peer | service-provider | other",
  "lastInteraction": "Brief description of the most recent exchange",
  "sentiment": "positive | neutral | negative",
  "confidence": 0.0-1.0
}

Return ONLY the JSON, no other text.`;

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') return null;

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[0]) as RelationshipSummary;
  } catch (error) {
    console.error('Failed to generate relationship summary:', error);
    return null;
  }
}

/**
 * Extract action items from email threads
 */
export async function extractActionItems(
  personId: string,
  maxEmails: number = 10
): Promise<ActionItem[]> {
  try {
    // Get recent emails involving this person
    const emails = await prisma.emailMessage.findMany({
      where: {
        personLinks: { some: { personId } },
      },
      orderBy: { sentAt: 'desc' },
      take: maxEmails,
      select: {
        id: true,
        subject: true,
        bodyText: true,
        snippet: true,
        sentAt: true,
        isInbound: true,
        fromEmail: true,
        fromName: true,
      },
    });

    if (emails.length === 0) return [];

    // Format emails for the prompt
    const emailContext = emails
      .map((e) => {
        const direction = e.isInbound ? 'RECEIVED' : 'SENT';
        const date = e.sentAt.toISOString().split('T')[0];
        const body = e.bodyText?.slice(0, 800) || e.snippet;
        return `[${date}] ${direction} - From: ${e.fromName || e.fromEmail}\nSubject: ${e.subject}\n${body}\n[EMAIL_ID: ${e.id}]`;
      })
      .join('\n---\n');

    const prompt = `You are analyzing email exchanges to extract action items and follow-ups.

Here are the recent emails:

${emailContext}

Extract any action items, tasks, or follow-ups mentioned in these emails. Focus on:
- Explicit requests or asks
- Promised deliverables
- Meeting follow-ups
- Document or information requests
- Deadlines mentioned

Return a JSON array of action items:
[
  {
    "description": "Clear description of what needs to be done",
    "owner": "me" or "them" or "Name of person",
    "dueDate": "YYYY-MM-DD" or null if not specified,
    "priority": "high" | "medium" | "low",
    "confidence": 0.0-1.0 (how confident you are this is a real action item),
    "sourceEmailId": "the EMAIL_ID from the email containing this action item"
  }
]

Only include items with confidence >= 0.6. Return ONLY the JSON array, no other text.
If no action items are found, return an empty array: []`;

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') return [];

    const jsonMatch = content.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const items = JSON.parse(jsonMatch[0]) as ActionItem[];
    return items.filter((item) => item.confidence >= 0.6);
  } catch (error) {
    console.error('Failed to extract action items:', error);
    return [];
  }
}

/**
 * Generate summary for a single email thread
 */
export async function summarizeThread(threadId: string): Promise<string | null> {
  try {
    const emails = await prisma.emailMessage.findMany({
      where: { gmailThreadId: threadId },
      orderBy: { sentAt: 'asc' },
      select: {
        subject: true,
        bodyText: true,
        snippet: true,
        fromEmail: true,
        fromName: true,
        sentAt: true,
      },
    });

    if (emails.length === 0) return null;

    const threadContext = emails
      .map((e) => {
        const date = e.sentAt.toISOString().split('T')[0];
        const body = e.bodyText?.slice(0, 600) || e.snippet;
        return `[${date}] From: ${e.fromName || e.fromEmail}\n${body}`;
      })
      .join('\n---\n');

    const prompt = `Summarize this email thread in 2-3 sentences. Focus on:
- The main topic or purpose
- Key decisions or outcomes
- Any pending items

Email thread (Subject: ${emails[0].subject}):

${threadContext}

Return only the summary, no other text.`;

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') return null;

    return content.text.trim();
  } catch (error) {
    console.error('Failed to summarize thread:', error);
    return null;
  }
}

/**
 * Batch process emails for AI analysis
 * Updates aiSummary and aiActionItems fields on EmailMessage
 */
export async function processEmailsForAI(
  emailIds: string[]
): Promise<{ processed: number; errors: number }> {
  let processed = 0;
  let errors = 0;

  for (const emailId of emailIds) {
    try {
      const email = await prisma.emailMessage.findUnique({
        where: { id: emailId },
        select: {
          id: true,
          gmailThreadId: true,
          bodyText: true,
          snippet: true,
        },
      });

      if (!email) continue;

      // Generate thread summary
      const summary = await summarizeThread(email.gmailThreadId);

      // Update the email with AI fields
      await prisma.emailMessage.update({
        where: { id: emailId },
        data: {
          aiSummary: summary,
          aiProcessedAt: new Date(),
        },
      });

      processed++;
    } catch (error) {
      console.error(`Failed to process email ${emailId}:`, error);
      errors++;
    }
  }

  return { processed, errors };
}
