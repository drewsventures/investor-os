/**
 * Fireflies.ai GraphQL Client
 * Handles API communication with Fireflies for meeting transcripts
 */

const FIREFLIES_API_URL = 'https://api.fireflies.ai/graphql';

export interface FirefliesConfig {
  apiKey: string;
}

export interface FirefliesUser {
  user_id: string;
  email: string;
  name: string;
  minutes_consumed: number;
  is_admin: boolean;
}

export interface FirefliesSentence {
  text: string;
  speaker_name: string;
  start_time: number;
  end_time: number;
}

export interface FirefliesSummary {
  overview: string;
  action_items: string[];
  keywords: string[];
}

export interface FirefliesAttendee {
  email: string;
  name: string;
}

export interface FirefliesTranscript {
  id: string;
  title: string;
  date: string;
  duration: number; // in seconds
  transcript_url: string;
  audio_url?: string;
  video_url?: string;
  summary?: FirefliesSummary;
  sentences: FirefliesSentence[];
  participants: string[];
  organizer_email?: string;
  meeting_attendees: FirefliesAttendee[];
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

export class FirefliesClient {
  private apiKey: string;

  constructor(config: FirefliesConfig) {
    this.apiKey = config.apiKey;
  }

  /**
   * Execute GraphQL query
   */
  private async query<T>(
    query: string,
    variables?: Record<string, unknown>
  ): Promise<T> {
    const response = await fetch(FIREFLIES_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Fireflies API error (${response.status}): ${errorText}`);
    }

    const result: GraphQLResponse<T> = await response.json();

    if (result.errors && result.errors.length > 0) {
      throw new Error(`Fireflies GraphQL error: ${result.errors[0].message}`);
    }

    if (!result.data) {
      throw new Error('No data returned from Fireflies API');
    }

    return result.data;
  }

  /**
   * Verify API key and get user info
   */
  async verifyApiKey(): Promise<FirefliesUser> {
    const query = `
      query {
        user {
          user_id
          email
          name
          minutes_consumed
          is_admin
        }
      }
    `;

    const data = await this.query<{ user: FirefliesUser }>(query);
    return data.user;
  }

  /**
   * List transcripts with pagination
   */
  async listTranscripts(options: {
    limit?: number;
    skip?: number;
    fromDate?: Date;
  } = {}): Promise<FirefliesTranscript[]> {
    const { limit = 50, skip = 0, fromDate } = options;

    // Build date filter if provided
    const dateFilter = fromDate
      ? `, from_date: "${fromDate.toISOString()}"`
      : '';

    const query = `
      query Transcripts {
        transcripts(limit: ${limit}, skip: ${skip}${dateFilter}) {
          id
          title
          date
          duration
          transcript_url
          audio_url
          video_url
          summary {
            overview
            action_items
            keywords
          }
          sentences {
            text
            speaker_name
            start_time
            end_time
          }
          participants
          organizer_email
          meeting_attendees {
            email
            name
          }
        }
      }
    `;

    const data = await this.query<{ transcripts: FirefliesTranscript[] }>(query);
    return data.transcripts || [];
  }

  /**
   * Get single transcript by ID
   */
  async getTranscript(transcriptId: string): Promise<FirefliesTranscript | null> {
    const query = `
      query Transcript($id: String!) {
        transcript(id: $id) {
          id
          title
          date
          duration
          transcript_url
          audio_url
          video_url
          summary {
            overview
            action_items
            keywords
          }
          sentences {
            text
            speaker_name
            start_time
            end_time
          }
          participants
          organizer_email
          meeting_attendees {
            email
            name
          }
        }
      }
    `;

    const data = await this.query<{ transcript: FirefliesTranscript | null }>(
      query,
      { id: transcriptId }
    );
    return data.transcript;
  }

  /**
   * Build full transcript text from sentences
   */
  static buildTranscriptText(transcript: FirefliesTranscript): string {
    if (!transcript.sentences || transcript.sentences.length === 0) {
      return '';
    }

    return transcript.sentences
      .map((s) => `[${s.speaker_name}]: ${s.text}`)
      .join('\n');
  }

  /**
   * Get all participant emails from a transcript
   */
  static getParticipantEmails(transcript: FirefliesTranscript): string[] {
    const emails = new Set<string>();

    // Add from meeting_attendees (more reliable, has names)
    for (const attendee of transcript.meeting_attendees || []) {
      if (attendee.email) {
        emails.add(attendee.email.toLowerCase());
      }
    }

    // Add from participants array (fallback)
    for (const email of transcript.participants || []) {
      if (email && email.includes('@')) {
        emails.add(email.toLowerCase());
      }
    }

    // Add organizer
    if (transcript.organizer_email) {
      emails.add(transcript.organizer_email.toLowerCase());
    }

    return Array.from(emails);
  }
}
