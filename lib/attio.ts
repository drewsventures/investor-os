/**
 * Attio CRM API Client
 * Fetches companies and people from Attio to enrich Investor OS data
 */

const ATTIO_API_BASE = 'https://api.attio.com/v2';

interface AttioConfig {
  apiKey: string;
}

interface AttioRecord {
  id: { record_id: string; object_id?: string };
  values: Record<string, any[]>;
  created_at?: string;
}

interface AttioListResponse {
  data: AttioRecord[];
  next_cursor?: string;
}

export interface AttioCompany {
  id: string;
  name: string | null;
  domain: string | null;
  description: string | null;
  industry: string | null;
  city: string | null;
  country: string | null;
  linkedinUrl: string | null;
  twitterHandle: string | null;
  raw: AttioRecord;
}

export interface AttioPerson {
  id: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  jobTitle: string | null;
  linkedinUrl: string | null;
  twitterHandle: string | null;
  city: string | null;
  country: string | null;
  companyRecordId: string | null; // Attio company record ID for linking
  raw: AttioRecord;
}

function getTextValue(values: Record<string, any[]>, key: string): string | null {
  const arr = values[key];
  if (!arr || arr.length === 0) return null;
  const first = arr[0];
  return first.value || null;
}

function getDomainValue(values: Record<string, any[]>): string | null {
  const arr = values['domains'];
  if (!arr || arr.length === 0) return null;
  return arr[0].domain || arr[0].root_domain || null;
}

function getNameValue(values: Record<string, any[]>): { firstName: string | null; lastName: string | null; fullName: string | null } {
  const arr = values['name'];
  if (!arr || arr.length === 0) return { firstName: null, lastName: null, fullName: null };
  const first = arr[0];

  // For companies, name is just a text value
  if (first.value) {
    return { firstName: null, lastName: null, fullName: first.value };
  }

  // For people, name has first_name, last_name, full_name
  return {
    firstName: first.first_name || null,
    lastName: first.last_name || null,
    fullName: first.full_name || null,
  };
}

function getEmailValue(values: Record<string, any[]>): string | null {
  const arr = values['email_addresses'];
  if (!arr || arr.length === 0) return null;
  return arr[0].email_address || arr[0].original_email_address || null;
}

function getPhoneValue(values: Record<string, any[]>): string | null {
  const arr = values['phone_numbers'];
  if (!arr || arr.length === 0) return null;
  return arr[0].phone_number || arr[0].original_phone_number || null;
}

function getLocationValue(values: Record<string, any[]>): { city: string | null; country: string | null } {
  const arr = values['primary_location'];
  if (!arr || arr.length === 0) return { city: null, country: null };
  const loc = arr[0];
  return {
    city: loc.locality || loc.city || null,
    country: loc.country_code || loc.country || null,
  };
}

function getCategoryValue(values: Record<string, any[]>): string | null {
  const arr = values['categories'];
  if (!arr || arr.length === 0) return null;
  // Get the first category title
  const first = arr[0];
  return first.option?.title || null;
}

function getCompanyReference(values: Record<string, any[]>): string | null {
  const arr = values['company'];
  if (!arr || arr.length === 0) return null;
  return arr[0].target_record_id || null;
}

export class AttioClient {
  private apiKey: string;
  private companyCache: Map<string, AttioCompany> = new Map();

  constructor(config: AttioConfig) {
    this.apiKey = config.apiKey;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${ATTIO_API_BASE}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Attio API error (${response.status}): ${error}`);
    }

    return response.json();
  }

  /**
   * List all companies from Attio
   */
  async listCompanies(limit = 500): Promise<AttioCompany[]> {
    const companies: AttioCompany[] = [];
    let offset = 0;

    while (true) {
      const response = await this.request<AttioListResponse>(
        '/objects/companies/records/query',
        {
          method: 'POST',
          body: JSON.stringify({ limit: Math.min(limit - companies.length, 100), offset }),
        }
      );

      for (const record of response.data) {
        const company = this.parseCompany(record);
        companies.push(company);
        // Cache for person lookups
        this.companyCache.set(record.id.record_id, company);
      }

      if (response.data.length < 100 || companies.length >= limit) break;
      offset += response.data.length;
    }

    return companies;
  }

  /**
   * List all people from Attio
   */
  async listPeople(limit = 500): Promise<AttioPerson[]> {
    const people: AttioPerson[] = [];
    let offset = 0;

    while (true) {
      const response = await this.request<AttioListResponse>(
        '/objects/people/records/query',
        {
          method: 'POST',
          body: JSON.stringify({ limit: Math.min(limit - people.length, 100), offset }),
        }
      );

      for (const record of response.data) {
        people.push(this.parsePerson(record));
      }

      if (response.data.length < 100 || people.length >= limit) break;
      offset += response.data.length;
    }

    return people;
  }

  /**
   * Get company by record ID (for linking people)
   */
  async getCompanyById(recordId: string): Promise<AttioCompany | null> {
    // Check cache first
    if (this.companyCache.has(recordId)) {
      return this.companyCache.get(recordId)!;
    }

    try {
      const response = await this.request<{ data: AttioRecord }>(
        `/objects/companies/records/${recordId}`
      );
      const company = this.parseCompany(response.data);
      this.companyCache.set(recordId, company);
      return company;
    } catch {
      return null;
    }
  }

  private parseCompany(record: AttioRecord): AttioCompany {
    const values = record.values;
    const { fullName } = getNameValue(values);
    const location = getLocationValue(values);

    return {
      id: record.id.record_id,
      name: fullName,
      domain: getDomainValue(values),
      description: getTextValue(values, 'description'),
      industry: getCategoryValue(values),
      city: location.city,
      country: location.country,
      linkedinUrl: getTextValue(values, 'linkedin'),
      twitterHandle: getTextValue(values, 'twitter'),
      raw: record,
    };
  }

  private parsePerson(record: AttioRecord): AttioPerson {
    const values = record.values;
    const { firstName, lastName, fullName } = getNameValue(values);
    const location = getLocationValue(values);

    return {
      id: record.id.record_id,
      firstName,
      lastName,
      fullName,
      email: getEmailValue(values),
      phone: getPhoneValue(values),
      jobTitle: getTextValue(values, 'job_title'),
      linkedinUrl: getTextValue(values, 'linkedin'),
      twitterHandle: getTextValue(values, 'twitter'),
      city: location.city,
      country: location.country,
      companyRecordId: getCompanyReference(values),
      raw: record,
    };
  }
}

/**
 * Create an Attio client with the API key from environment
 */
export function createAttioClient(): AttioClient {
  const apiKey = process.env.ATTIO_API_KEY;
  if (!apiKey) {
    throw new Error('ATTIO_API_KEY environment variable is required');
  }
  return new AttioClient({ apiKey });
}
