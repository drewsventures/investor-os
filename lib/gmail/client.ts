/**
 * Gmail API Client
 * Handles OAuth authentication and Gmail API interactions
 */

const GOOGLE_OAUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1';

// Gmail API scopes
const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
];

export interface GmailConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface GmailTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  email: string;
}

export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload: {
    headers: Array<{ name: string; value: string }>;
    mimeType: string;
    body?: { data?: string; size: number };
    parts?: Array<{
      mimeType: string;
      body?: { data?: string; size: number };
      parts?: Array<{
        mimeType: string;
        body?: { data?: string; size: number };
      }>;
    }>;
  };
  internalDate: string;
}

export interface GmailMessageList {
  messages?: Array<{ id: string; threadId: string }>;
  nextPageToken?: string;
  resultSizeEstimate?: number;
}

export interface ParsedEmail {
  id: string;
  threadId: string;
  subject: string | null;
  snippet: string;
  bodyText: string | null;
  fromEmail: string;
  fromName: string | null;
  toEmails: string[];
  ccEmails: string[];
  sentAt: Date;
  hasAttachments: boolean;
  labels: string[];
}

/**
 * Gmail API Client
 */
export class GmailClient {
  private config: GmailConfig;
  private accessToken: string;

  constructor(config: GmailConfig, accessToken: string) {
    this.config = config;
    this.accessToken = accessToken;
  }

  /**
   * Generate OAuth authorization URL
   */
  static getAuthUrl(config: GmailConfig, state?: string): string {
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: GMAIL_SCOPES.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      ...(state && { state }),
    });

    return `${GOOGLE_OAUTH_URL}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  static async exchangeCodeForTokens(
    config: GmailConfig,
    code: string
  ): Promise<GmailTokens> {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: 'authorization_code',
        code,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to exchange code for tokens: ${error}`);
    }

    const data = await response.json();
    const expiresAt = new Date(Date.now() + data.expires_in * 1000);

    // Get user email from the id_token or userinfo endpoint
    const userEmail = await GmailClient.getUserEmail(data.access_token);

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt,
      email: userEmail,
    };
  }

  /**
   * Refresh access token
   */
  static async refreshAccessToken(
    config: GmailConfig,
    refreshToken: string
  ): Promise<{ accessToken: string; expiresAt: Date }> {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to refresh token: ${error}`);
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  /**
   * Get user email from userinfo endpoint
   */
  static async getUserEmail(accessToken: string): Promise<string> {
    const response = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to get user email');
    }

    const data = await response.json();
    return data.email;
  }

  /**
   * Make authenticated request to Gmail API
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${GMAIL_API_BASE}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gmail API error (${response.status}): ${error}`);
    }

    return response.json();
  }

  /**
   * List messages with pagination
   */
  async listMessages(options: {
    maxResults?: number;
    pageToken?: string;
    q?: string;
  } = {}): Promise<GmailMessageList> {
    const params = new URLSearchParams();
    if (options.maxResults) params.set('maxResults', options.maxResults.toString());
    if (options.pageToken) params.set('pageToken', options.pageToken);
    if (options.q) params.set('q', options.q);

    return this.request<GmailMessageList>(
      `/users/me/messages?${params.toString()}`
    );
  }

  /**
   * Get a single message by ID
   */
  async getMessage(messageId: string): Promise<GmailMessage> {
    return this.request<GmailMessage>(
      `/users/me/messages/${messageId}?format=full`
    );
  }

  /**
   * Get user profile (email, history ID)
   */
  async getProfile(): Promise<{ emailAddress: string; historyId: string }> {
    return this.request('/users/me/profile');
  }

  /**
   * Get history changes since a given history ID (for incremental sync)
   */
  async getHistory(startHistoryId: string, pageToken?: string): Promise<{
    history?: Array<{
      id: string;
      messagesAdded?: Array<{ message: { id: string; threadId: string } }>;
    }>;
    historyId: string;
    nextPageToken?: string;
  }> {
    const params = new URLSearchParams({
      startHistoryId,
      historyTypes: 'messageAdded',
    });
    if (pageToken) params.set('pageToken', pageToken);

    return this.request(`/users/me/history?${params.toString()}`);
  }

  /**
   * Parse a Gmail message into a structured format
   */
  parseMessage(message: GmailMessage, userEmail: string): ParsedEmail {
    const headers = message.payload.headers;
    const getHeader = (name: string): string | null => {
      const header = headers.find(
        (h) => h.name.toLowerCase() === name.toLowerCase()
      );
      return header?.value || null;
    };

    // Parse email addresses
    const parseAddresses = (header: string | null): string[] => {
      if (!header) return [];
      // Handle "Name <email@example.com>, Name2 <email2@example.com>" format
      const matches = header.match(/[\w.-]+@[\w.-]+\.\w+/g);
      return matches || [];
    };

    // Parse "From" header to get name and email
    const parseFrom = (header: string | null): { email: string; name: string | null } => {
      if (!header) return { email: '', name: null };
      const match = header.match(/^(?:"?([^"<]*)"?\s*)?<?([^>]+@[^>]+)>?$/);
      if (match) {
        return {
          name: match[1]?.trim() || null,
          email: match[2].trim(),
        };
      }
      return { email: header.trim(), name: null };
    };

    // Extract body text
    const extractBody = (payload: GmailMessage['payload']): string | null => {
      // Try to get plain text body
      if (payload.mimeType === 'text/plain' && payload.body?.data) {
        return decodeBase64Url(payload.body.data);
      }

      // Check parts for text/plain
      if (payload.parts) {
        for (const part of payload.parts) {
          if (part.mimeType === 'text/plain' && part.body?.data) {
            return decodeBase64Url(part.body.data);
          }
          // Check nested parts (for multipart/alternative inside multipart/mixed)
          if (part.parts) {
            for (const nestedPart of part.parts) {
              if (nestedPart.mimeType === 'text/plain' && nestedPart.body?.data) {
                return decodeBase64Url(nestedPart.body.data);
              }
            }
          }
        }
      }

      return null;
    };

    // Check for attachments
    const hasAttachments = message.payload.parts?.some(
      (part) => part.body?.size && part.body.size > 0 && !part.mimeType.startsWith('text/')
    ) || false;

    const from = parseFrom(getHeader('From'));
    const toEmails = parseAddresses(getHeader('To'));
    const isInbound = toEmails.some(
      (email) => email.toLowerCase() === userEmail.toLowerCase()
    );

    return {
      id: message.id,
      threadId: message.threadId,
      subject: getHeader('Subject'),
      snippet: message.snippet,
      bodyText: extractBody(message.payload),
      fromEmail: from.email,
      fromName: from.name,
      toEmails,
      ccEmails: parseAddresses(getHeader('Cc')),
      sentAt: new Date(parseInt(message.internalDate)),
      hasAttachments,
      labels: message.labelIds || [],
    };
  }
}

/**
 * Decode base64url encoded string
 */
function decodeBase64Url(data: string): string {
  // Convert base64url to base64
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  // Decode base64
  try {
    return Buffer.from(base64, 'base64').toString('utf-8');
  } catch {
    return '';
  }
}

/**
 * Create Gmail config from environment variables
 */
export function getGmailConfig(): GmailConfig {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/gmail/callback';

  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables are required');
  }

  return { clientId, clientSecret, redirectUri };
}
