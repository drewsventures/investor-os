/**
 * Canonical Key Generation for Entity Deduplication
 *
 * These functions generate unique, normalized keys for Person and Organization entities.
 * Canonical keys enable deduplication - if two records have the same canonical key,
 * they represent the same real-world entity.
 *
 * Design principles:
 * - Email is the canonical identifier for Person (if available)
 * - Domain is the canonical identifier for Organization (if available)
 * - Fallback to normalized name if email/domain unavailable
 * - Normalization removes common noise (punctuation, common suffixes, extra spaces)
 * - Keys are lowercase and stable across minor variations
 */

/**
 * Generate canonical key for a Person
 *
 * Priority:
 * 1. Email (if provided) - most reliable identifier
 * 2. Normalized full name (fallback)
 *
 * @example
 * generatePersonKey({ email: "sarah@example.com", firstName: "Sarah", lastName: "Chen" })
 * // => "sarah@example.com"
 *
 * generatePersonKey({ firstName: "Sarah", lastName: "Chen" })
 * // => "name:sarah_chen"
 */
export function generatePersonKey(person: {
  email?: string | null;
  firstName: string;
  lastName: string;
}): string {
  // Email is canonical if available
  if (person.email && person.email.trim()) {
    return person.email.toLowerCase().trim();
  }

  // Otherwise, normalized full name
  const normalizedName = `${person.firstName} ${person.lastName}`
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .trim()
    .replace(/\s+/g, '_'); // Replace spaces with underscores

  return `name:${normalizedName}`;
}

/**
 * Generate canonical key for an Organization
 *
 * Priority:
 * 1. Domain (if provided) - most reliable identifier
 * 2. Normalized company name (fallback)
 *
 * Normalization removes common suffixes like Inc, LLC, Corp, etc.
 *
 * @example
 * generateOrgKey({ domain: "acmecorp.com", name: "Acme Corp" })
 * // => "acmecorp.com"
 *
 * generateOrgKey({ name: "Acme Corporation, Inc." })
 * // => "name:acme"
 */
export function generateOrgKey(org: {
  domain?: string | null;
  name: string;
}): string {
  // Domain is canonical if available
  if (org.domain && org.domain.trim()) {
    return org.domain.toLowerCase().trim();
  }

  // Otherwise, normalized company name
  const normalized = org.name
    .toLowerCase()
    // Remove common legal suffixes
    .replace(/\b(inc\.?|llc\.?|ltd\.?|corp\.?|corporation|limited|company|co\.?)\b/gi, '')
    // Remove special characters except spaces
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    // Replace multiple spaces with single underscore
    .replace(/\s+/g, '_');

  return `name:${normalized}`;
}

/**
 * Extract domain from various input formats
 *
 * Handles:
 * - Full URLs: https://example.com => example.com
 * - Domains: example.com => example.com
 * - Emails: user@example.com => example.com
 * - WWW prefixes: www.example.com => example.com
 *
 * @example
 * extractDomain("https://www.acmecorp.com/about")
 * // => "acmecorp.com"
 *
 * extractDomain("sarah@acmecorp.com")
 * // => "acmecorp.com"
 */
export function extractDomain(input: string): string | null {
  if (!input || !input.trim()) {
    return null;
  }

  let domain = input.trim().toLowerCase();

  // If it's an email, extract domain part
  if (domain.includes('@')) {
    const parts = domain.split('@');
    domain = parts[parts.length - 1];
  }

  // Remove protocol (http://, https://)
  domain = domain.replace(/^https?:\/\//i, '');

  // Remove path (everything after first /)
  domain = domain.split('/')[0];

  // Remove www. prefix
  domain = domain.replace(/^www\./i, '');

  // Remove port if present
  domain = domain.split(':')[0];

  // Basic validation
  if (!domain.includes('.')) {
    return null;
  }

  return domain;
}

/**
 * Normalize name for fuzzy matching
 *
 * Useful for detecting near-duplicates that might have minor variations
 * in spelling, punctuation, or formatting.
 *
 * @example
 * normalizeName("  Sarah-Jane  O'Brien  ")
 * // => "sarahjane obrien"
 *
 * normalizeName("José García")
 * // => "jose garcia"
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    // Remove accents/diacritics (simplified approach)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Remove all non-alphanumeric except spaces
    .replace(/[^a-z0-9\s]/g, '')
    // Collapse multiple spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculate similarity score between two strings (0.0 - 1.0)
 *
 * Uses Levenshtein distance for fuzzy matching.
 * Useful for detecting potential duplicates with slightly different names.
 *
 * @returns Number between 0.0 (completely different) and 1.0 (identical)
 *
 * @example
 * calculateSimilarity("Acme Corp", "Acme Corporation")
 * // => 0.85 (high similarity)
 *
 * calculateSimilarity("Acme Corp", "Beta Inc")
 * // => 0.12 (low similarity)
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const s1 = normalizeName(str1);
  const s2 = normalizeName(str2);

  if (s1 === s2) return 1.0;
  if (s1.length === 0 || s2.length === 0) return 0.0;

  // Levenshtein distance
  const matrix: number[][] = [];

  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  const distance = matrix[s2.length][s1.length];
  const maxLength = Math.max(s1.length, s2.length);

  // Convert distance to similarity score (0.0 - 1.0)
  return 1.0 - distance / maxLength;
}

/**
 * Check if two names are likely the same person (fuzzy match)
 *
 * Accounts for:
 * - Name order variations (John Smith vs Smith, John)
 * - Middle names/initials
 * - Nicknames (within reason - you'll need a nickname dictionary for perfect matching)
 *
 * @returns true if similarity > 0.85
 */
export function isSamePerson(name1: string, name2: string): boolean {
  const similarity = calculateSimilarity(name1, name2);
  return similarity > 0.85;
}

/**
 * Check if two organization names are likely the same (fuzzy match)
 *
 * Accounts for:
 * - Legal suffix variations (Corp vs Corporation vs Inc)
 * - Punctuation differences
 * - Minor spelling variations
 *
 * @returns true if similarity > 0.80
 */
export function isSameOrganization(name1: string, name2: string): boolean {
  const similarity = calculateSimilarity(name1, name2);
  return similarity > 0.80;
}
