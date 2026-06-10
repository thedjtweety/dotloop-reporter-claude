/**
 * Dotloop API Client
 * Handles all communication with Dotloop API v2
 */

import axios, { AxiosInstance } from 'axios';

export interface DotloopAccount {
  id: number;
  name: string;
  email: string;
  firstName?: string;
  lastName?: string;
  timeZone?: string;
  defaultProfileId?: string | number;  // present in real API responses
}

export interface DotloopLoop {
  id: number | string;
  loopId?: string;
  name: string;
  status: string;
  transactionType?: string;
  created: string;
  updated?: string;
  loopUrl?: string;
  viewUrl?: string;
  profileId?: number | string;
  ownerProfileId?: number | string;
  listingPrice?: number;
  salePrice?: number;
  closingDate?: string;
  listingDate?: string;
  address?: {
    displayName: string;
    city: string;
    state: string;
  };
  propertyType?: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFootage?: number;
  commissionRate?: number;
  totalCommission?: number;
  totalTaskCount?: number;
  completedTaskCount?: number;
}

export interface DotloopLoopDetail extends DotloopLoop {
  participants?: DotloopParticipant[];
  financials?: Record<string, unknown>;
}

export interface DotloopParticipant {
  participantId: string;
  name: string;
  email: string;
  role: 'LISTING_AGENT' | 'BUYING_AGENT' | 'BROKER' | 'OTHER';
  company?: string;
}

export interface DotloopProfile {
  profileId: string;
  name: string;
  email: string;
  phone?: string;
  type?: string;        // e.g. 'INDIVIDUAL', 'TEAM', 'OFFICE' — present in real API responses
  active?: boolean;
}

export interface TokenRefreshResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

/**
 * Dotloop API Client
 * Provides methods to interact with Dotloop API
 */
export class DotloopAPIClient {
  private client: AxiosInstance;
  private accessToken: string;
  private baseURL = 'https://api-gateway.dotloop.com/public/v2';

  constructor(accessToken: string) {
    this.accessToken = accessToken;
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 second timeout
    });
  }

  /**
   * Get all profiles - Dotloop wraps response in data envelope
   */
  async getProfiles(): Promise<DotloopProfile[]> {
    try {
      const response = await this.client.get('/profile');
      console.log('[DotloopClient] getProfiles raw response.data:', JSON.stringify(response.data));
      // Account endpoint uses { data: {...} } envelope — profiles may too.
      // Try response.data.data first, then response.data.profiles, then response.data as array.
      const profiles: DotloopProfile[] =
        response.data?.data ??
        response.data?.profiles ??
        (Array.isArray(response.data) ? response.data : []);
      console.log('[DotloopClient] getProfiles parsed:', profiles.length, 'profiles');
      return profiles;
    } catch (error) {
      throw new Error(`Failed to fetch profiles: ${DotloopAPIClient.getErrorMessage(error)}`);
    }
  }

  /**
   * Get all loops for a specific profile
   */
  async getLoops(
    profileId: string,
    startDate?: string,
    endDate?: string,
    params?: {
      limit?: number;
      offset?: number;
      status?: string;
    }
  ): Promise<DotloopLoop[]> {
    try {
      const response = await this.client.get(`/profile/${profileId}/loop`, {
        params: {
          limit: params?.limit || 100,
          offset: params?.offset || 0,
          start_date: startDate,
          end_date: endDate,
          ...params,
        },
      });
      return response.data.loops || [];
    } catch (error) {
      throw new Error(`Failed to fetch loops: ${DotloopAPIClient.getErrorMessage(error)}`);
    }
  }

  /**
   * Get detailed information about a specific loop
   */
  async getLoopDetails(loopId: string): Promise<DotloopLoop> {
    try {
      const response = await this.client.get(`/loop/${loopId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch loop details: ${DotloopAPIClient.getErrorMessage(error)}`);
    }
  }

  /**
   * Get participants (agents) for a specific loop
   */
  async getLoopParticipants(profileId: string, loopId: string): Promise<DotloopParticipant[]> {
    try {
      const response = await this.client.get(`/profile/${profileId}/loop/${loopId}/participant`);
      return response.data.participants || [];
    } catch (error) {
      throw new Error(`Failed to fetch participants: ${DotloopAPIClient.getErrorMessage(error)}`);
    }
  }

  /**
   * Get documents for a specific loop
   */
  async getLoopDocuments(loopId: string): Promise<any[]> {
    try {
      const response = await this.client.get(`/loop/${loopId}/document`);
      return response.data.documents || [];
    } catch (error) {
      throw new Error(`Failed to fetch documents: ${DotloopAPIClient.getErrorMessage(error)}`);
    }
  }

  /**
   * Get activity/timeline for a specific loop
   */
  async getLoopActivity(loopId: string): Promise<any[]> {
    try {
      const response = await this.client.get(`/loop/${loopId}/activity`);
      return response.data.activities || [];
    } catch (error) {
      throw new Error(`Failed to fetch activity: ${DotloopAPIClient.getErrorMessage(error)}`);
    }
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshToken(
    refreshToken: string,
    clientId: string,
    clientSecret: string
  ): Promise<TokenRefreshResponse> {
    try {
      const response = await axios.post(
        'https://auth.dotloop.com/oauth/token',
        {
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to refresh token: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Get the authenticated Dotloop account
   */
  async getAccount(): Promise<DotloopAccount> {
    try {
      const response = await this.client.get('/account');
      // Dotloop wraps the account in a "data" envelope: { "data": { "id": ..., "defaultProfileId": ... } }
      // response.data is that envelope, so the actual account is response.data.data
      const account = (response.data?.data ?? response.data) as DotloopAccount;
      console.log('[DotloopClient] getAccount raw response.data:', JSON.stringify(response.data));
      console.log('[DotloopClient] getAccount unwrapped account:', JSON.stringify(account));
      return account;
    } catch (error) {
      throw new Error(`Failed to fetch account: ${DotloopAPIClient.getErrorMessage(error)}`);
    }
  }

  /**
   * Get a single loop with full detail
   */
  async getLoopDetail(profileId: string, loopId: string): Promise<DotloopLoopDetail> {
    try {
      const response = await this.client.get(`/profile/${profileId}/loop/${loopId}/detail`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch loop detail: ${DotloopAPIClient.getErrorMessage(error)}`);
    }
  }

  /**
   * Fetch ALL loops for a profile by paginating with batchSize=100.
   * Adds a 100ms delay between requests to respect rate limits.
   * Logs progress to console.
   */
  async getAllLoops(profileId: string): Promise<DotloopLoop[]> {
    if (!profileId || profileId === 'null' || profileId === 'undefined') {
      throw new Error(
        `getAllLoops called with invalid profileId: "${profileId}". ` +
        'Reconnect your Dotloop account in Settings to re-save a valid profile ID.'
      );
    }

    const all: DotloopLoop[] = [];
    const batchSize = 100;
    let batchNumber = 1;
    let hasMore = true;

    while (hasMore) {
      console.log(`[DotloopClient] Fetching page ${batchNumber} for profile ${profileId}...`);
      try {
        const response = await this.client.get(`/profile/${profileId}/loop`, {
          params: {
            batch_size: batchSize,
            batch_number: batchNumber,
          },
        });

        console.log(`[DotloopClient] Page ${batchNumber} raw response status:`, response.status);
        console.log(`[DotloopClient] Page ${batchNumber} raw response.data:`, JSON.stringify(response.data));

        const loops: DotloopLoop[] = response.data?.data || [];

        if (loops.length === 0) {
          console.warn(`[DotloopClient] Page ${batchNumber} returned 0 loops. Full response.data keys:`,
            Object.keys(response.data ?? {}));
        }

        all.push(...loops);

        // Dotloop returns fewer than batchSize items on the last page
        hasMore = loops.length === batchSize;
        batchNumber++;

        if (hasMore) {
          await new Promise(res => setTimeout(res, 100));
        }
      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.error(`[DotloopClient] Axios error on page ${batchNumber}:`, {
            status:       error.response?.status,
            statusText:   error.response?.statusText,
            responseData: JSON.stringify(error.response?.data),
            message:      error.message,
            url:          error.config?.url,
          });
        } else {
          console.error(`[DotloopClient] Non-axios error on page ${batchNumber}:`, error);
        }
        throw new Error(
          `Failed to fetch loops page ${batchNumber} for profile ${profileId}: ` +
          `${DotloopAPIClient.getErrorMessage(error)}`
        );
      }
    }

    console.log(`[DotloopClient] Fetched ${all.length} loops total for profile ${profileId}.`);
    return all;
  }

  /**
   * Check if API connection is valid
   */
  async isConnected(): Promise<boolean> {
    try {
      const profiles = await this.getProfiles();
      return profiles.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Get error message from various error types
   */
  private static getErrorMessage(error: any): string {
    if (axios.isAxiosError(error)) {
      if (error.response?.data?.message) {
        return error.response.data.message;
      }
      if (error.response?.status === 401) {
        return 'Unauthorized - token may be expired';
      }
      if (error.response?.status === 403) {
        return 'Forbidden - insufficient permissions';
      }
      if (error.response?.status === 404) {
        return 'Not found';
      }
      return error.message;
    }
    return String(error);
  }
}
