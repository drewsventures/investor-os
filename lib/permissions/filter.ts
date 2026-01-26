/**
 * Content Filtering Utilities
 * Filter content based on user permissions
 */

import type { ContentAccessResult } from './service';

/**
 * Filter email content based on access level
 */
export interface FilteredEmail {
  id: string;
  gmailMessageId: string;
  gmailThreadId: string;
  subject: string | null;
  snippet: string | null;
  bodyText: string | null;
  fromEmail: string;
  fromName: string | null;
  toEmails: string[];
  ccEmails: string[];
  sentAt: Date;
  isInbound: boolean;
  hasAttachments: boolean;
  _permission: {
    visibility: string;
    canViewFull: boolean;
    isPrivate: boolean;
  };
}

export function filterEmailForAccess(
  email: {
    id: string;
    gmailMessageId: string;
    gmailThreadId: string;
    subject: string | null;
    snippet: string | null;
    bodyText: string | null;
    fromEmail: string;
    fromName: string | null;
    toEmails: string[];
    ccEmails: string[];
    sentAt: Date;
    isInbound: boolean;
    hasAttachments: boolean;
  },
  access: ContentAccessResult
): FilteredEmail {
  if (access.canViewFull) {
    return {
      ...email,
      _permission: {
        visibility: access.visibility,
        canViewFull: true,
        isPrivate: false,
      },
    };
  }

  // Return metadata only
  return {
    id: email.id,
    gmailMessageId: email.gmailMessageId,
    gmailThreadId: email.gmailThreadId,
    subject: email.subject, // Keep subject as metadata
    snippet: null, // Hide snippet
    bodyText: null, // Hide body
    fromEmail: access.canViewMetadata ? email.fromEmail : '[Hidden]',
    fromName: access.canViewMetadata ? email.fromName : null,
    toEmails: access.canViewMetadata ? email.toEmails : [],
    ccEmails: access.canViewMetadata ? email.ccEmails : [],
    sentAt: email.sentAt,
    isInbound: email.isInbound,
    hasAttachments: email.hasAttachments,
    _permission: {
      visibility: access.visibility,
      canViewFull: false,
      isPrivate: true,
    },
  };
}

/**
 * Filter conversation content based on access level
 */
export interface FilteredConversation {
  id: string;
  title: string;
  summary: string | null;
  transcript: string | null;
  medium: string;
  conversationDate: Date;
  duration: number | null;
  _permission: {
    visibility: string;
    canViewFull: boolean;
    isPrivate: boolean;
  };
}

export function filterConversationForAccess(
  conversation: {
    id: string;
    title: string;
    summary: string | null;
    transcript: string | null;
    medium: string;
    conversationDate: Date;
    duration: number | null;
  },
  access: ContentAccessResult
): FilteredConversation {
  if (access.canViewFull) {
    return {
      ...conversation,
      _permission: {
        visibility: access.visibility,
        canViewFull: true,
        isPrivate: false,
      },
    };
  }

  return {
    id: conversation.id,
    title: conversation.title,
    summary: null, // Hide summary
    transcript: null, // Hide transcript
    medium: conversation.medium,
    conversationDate: conversation.conversationDate,
    duration: conversation.duration,
    _permission: {
      visibility: access.visibility,
      canViewFull: false,
      isPrivate: true,
    },
  };
}

/**
 * Filter investment content based on access level
 */
export interface FilteredInvestment {
  id: string;
  organizationId: string;
  investmentDate: Date;
  amountInvested: number | null;
  instrumentType: string;
  ownership: number | null;
  valuation: number | null;
  status: string;
  _permission: {
    visibility: string;
    canViewFull: boolean;
    isPrivate: boolean;
  };
}

export function filterInvestmentForAccess(
  investment: {
    id: string;
    organizationId: string;
    investmentDate: Date;
    amountInvested: number;
    instrumentType: string;
    ownership: number | null;
    valuation: number | null;
    status: string;
  },
  access: ContentAccessResult
): FilteredInvestment {
  if (access.canViewFull) {
    return {
      ...investment,
      _permission: {
        visibility: access.visibility,
        canViewFull: true,
        isPrivate: false,
      },
    };
  }

  return {
    id: investment.id,
    organizationId: investment.organizationId,
    investmentDate: investment.investmentDate,
    amountInvested: null, // Hide amount
    instrumentType: investment.instrumentType,
    ownership: null, // Hide ownership
    valuation: null, // Hide valuation
    status: investment.status,
    _permission: {
      visibility: access.visibility,
      canViewFull: false,
      isPrivate: true,
    },
  };
}

/**
 * Filter deal content based on access level
 */
export interface FilteredDeal {
  id: string;
  name: string;
  organizationId: string;
  stage: string;
  dealType: string;
  askAmount: number | null;
  ourAllocation: number | null;
  valuation: number | null;
  _permission: {
    visibility: string;
    canViewFull: boolean;
    isPrivate: boolean;
  };
}

export function filterDealForAccess(
  deal: {
    id: string;
    name: string;
    organizationId: string;
    stage: string;
    dealType: string;
    askAmount: number | null;
    ourAllocation: number | null;
    valuation: number | null;
  },
  access: ContentAccessResult
): FilteredDeal {
  if (access.canViewFull) {
    return {
      ...deal,
      _permission: {
        visibility: access.visibility,
        canViewFull: true,
        isPrivate: false,
      },
    };
  }

  return {
    id: deal.id,
    name: deal.name,
    organizationId: deal.organizationId,
    stage: deal.stage,
    dealType: deal.dealType,
    askAmount: null, // Hide financials
    ourAllocation: null,
    valuation: null,
    _permission: {
      visibility: access.visibility,
      canViewFull: false,
      isPrivate: true,
    },
  };
}
