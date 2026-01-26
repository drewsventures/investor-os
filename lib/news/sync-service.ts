/**
 * News Sync Service
 * Fetches and stores news articles for organizations
 */

import { prisma } from '@/lib/db';
import { fetchCompanyNews, type NewsArticle } from './client';

export interface NewsSyncOptions {
  maxArticles?: number;
  fromDate?: Date;
  createUpdates?: boolean;
  authorId: string;
}

export interface NewsSyncResult {
  success: boolean;
  articlesFound: number;
  articlesCreated: number;
  articlesSkipped: number;
  errors: string[];
}

/**
 * Sync news for an organization
 */
export async function syncOrganizationNews(
  organizationId: string,
  options: NewsSyncOptions
): Promise<NewsSyncResult> {
  const result: NewsSyncResult = {
    success: false,
    articlesFound: 0,
    articlesCreated: 0,
    articlesSkipped: 0,
    errors: [],
  };

  try {
    // Get organization
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        domain: true,
      },
    });

    if (!organization) {
      result.errors.push('Organization not found');
      return result;
    }

    // Fetch news
    const articles = await fetchCompanyNews(organization.name, {
      fromDate: options.fromDate,
      pageSize: options.maxArticles || 20,
    });

    result.articlesFound = articles.length;

    if (articles.length === 0) {
      result.success = true;
      return result;
    }

    // Get existing news URLs to skip duplicates
    const existingUrls = await prisma.update.findMany({
      where: {
        organizationId,
        type: 'NEWS',
        sourceUrl: { not: null },
      },
      select: { sourceUrl: true },
    });
    const existingUrlSet = new Set(
      existingUrls.map((u) => u.sourceUrl).filter(Boolean)
    );

    // Create updates for new articles
    for (const article of articles) {
      try {
        // Skip duplicates
        if (existingUrlSet.has(article.url)) {
          result.articlesSkipped++;
          continue;
        }

        // Create update record
        await prisma.update.create({
          data: {
            type: 'NEWS',
            title: article.title,
            content: article.description || article.title,
            updateDate: article.publishedAt,
            sourceUrl: article.url,
            sourceAuthor: article.author,
            sourceName: article.source.name,
            organizationId,
            authorId: options.authorId,
            metadata: {
              imageUrl: article.imageUrl,
              autoImported: true,
            },
          },
        });

        result.articlesCreated++;
        existingUrlSet.add(article.url);
      } catch (error) {
        result.errors.push(
          `Failed to save article "${article.title}": ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );
      }
    }

    result.success = true;
  } catch (error) {
    result.errors.push(
      `News sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  return result;
}

/**
 * Sync news for multiple organizations
 */
export async function syncAllOrganizationsNews(
  authorId: string,
  options: Omit<NewsSyncOptions, 'authorId'> = {}
): Promise<{
  totalOrganizations: number;
  successfulSyncs: number;
  totalArticlesCreated: number;
  errors: string[];
}> {
  const result = {
    totalOrganizations: 0,
    successfulSyncs: 0,
    totalArticlesCreated: 0,
    errors: [] as string[],
  };

  // Get organizations with deals (prioritize active relationships)
  const organizations = await prisma.organization.findMany({
    where: {
      deals: {
        some: {},
      },
    },
    select: { id: true, name: true },
    take: 50, // Limit to avoid API rate limits
  });

  result.totalOrganizations = organizations.length;

  for (const org of organizations) {
    try {
      const syncResult = await syncOrganizationNews(org.id, {
        ...options,
        authorId,
      });

      if (syncResult.success) {
        result.successfulSyncs++;
        result.totalArticlesCreated += syncResult.articlesCreated;
      }

      if (syncResult.errors.length > 0) {
        result.errors.push(`${org.name}: ${syncResult.errors.join(', ')}`);
      }
    } catch (error) {
      result.errors.push(
        `${org.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  return result;
}

/**
 * Import a single news article manually
 */
export async function importNewsArticle(
  article: NewsArticle,
  organizationId: string,
  authorId: string
): Promise<{ success: boolean; updateId?: string; error?: string }> {
  try {
    // Check for duplicate
    const existing = await prisma.update.findFirst({
      where: {
        organizationId,
        type: 'NEWS',
        sourceUrl: article.url,
      },
    });

    if (existing) {
      return { success: true, updateId: existing.id };
    }

    const update = await prisma.update.create({
      data: {
        type: 'NEWS',
        title: article.title,
        content: article.description || article.title,
        updateDate: article.publishedAt,
        sourceUrl: article.url,
        sourceAuthor: article.author,
        sourceName: article.source.name,
        organizationId,
        authorId,
        metadata: {
          imageUrl: article.imageUrl,
          manualImport: true,
        },
      },
    });

    return { success: true, updateId: update.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
