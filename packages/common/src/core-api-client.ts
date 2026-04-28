/**
 * Core API Client for TestivAI
 * Handles all HTTP communication with the Core API
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { ApiKeyValidationResponse, VisualCheckResult, CaptureData } from './types';

const DEFAULT_API_URL = 'https://core-api.testiv.ai';

export class CoreApiClient {
  private client: AxiosInstance;
  private apiKey: string;

  constructor(apiKey: string, baseUrl?: string) {
    this.apiKey = apiKey;
    this.client = axios.create({
      baseURL: baseUrl || DEFAULT_API_URL,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      timeout: 30000,
    });
  }

  /**
   * Validate an API key against the Core API
   */
  async validateApiKey(): Promise<ApiKeyValidationResponse> {
    try {
      const response = await this.client.get('/api/v1/auth/validate-key');
      return {
        valid: true,
        projectId: response.data.project_id,
        projectName: response.data.project_name,
        organizationId: response.data.organization_id,
        organizationName: response.data.organization_name,
      };
    } catch (error) {
      if (error instanceof AxiosError) {
        if (error.response?.status === 401) {
          return { valid: false, error: 'Invalid API key' };
        }
        if (error.response?.status === 403) {
          return { valid: false, error: 'API key is disabled or expired' };
        }
        return { valid: false, error: error.message };
      }
      return { valid: false, error: 'Unknown error occurred' };
    }
  }

  /**
   * Submit a visual check to the Core API
   * Note: This method is deprecated and should not be used.
   * The correct approach is to use the batch ingest endpoints.
   */
  async submitVisualCheck(data: CaptureData): Promise<VisualCheckResult> {
    throw new Error(
      'submitVisualCheck is deprecated. The /api/v1/visual-check endpoint does not exist. ' +
      'Please use the batch ingest flow with /api/v1/ingest/start-batch and /api/v1/ingest/finish-batch endpoints.'
    );
  }

  /**
   * Get the status of a test run
   */
  async getTestRunStatus(testRunId: string): Promise<VisualCheckResult> {
    const response = await this.client.get(`/api/v1/test-runs/${testRunId}`);
    return {
      testRunId: response.data.id,
      status: response.data.status,
      hasDiff: response.data.has_diff || response.data.status === 'failed',
      diffUrl: response.data.diff_url,
      dashboardUrl: response.data.dashboard_url,
      pixelsChanged: response.data.pixels_changed,
      percentChanged: response.data.percent_changed,
    };
  }
}

export const DEFAULT_CORE_API_URL = DEFAULT_API_URL;
