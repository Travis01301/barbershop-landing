// Base class for all integrations
export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  expiresAt?: Date;
}

export interface IntegrationEvent {
  type: string;
  data: Record<string, any>;
  timestamp: Date;
}

export abstract class BaseIntegration {
  protected name: string;
  protected config: OAuthConfig;

  constructor(name: string, config: OAuthConfig) {
    this.name = name;
    this.config = config;
  }

  abstract getAuthUrl(state: string, scope: string[]): string;
  abstract exchangeCodeForToken(code: string): Promise<TokenResponse>;
  abstract refreshAccessToken(refreshToken: string): Promise<TokenResponse>;
  abstract validateToken(accessToken: string): Promise<boolean>;
  abstract logError(message: string, error: any): void;

  protected getTimestamp(): Date {
    return new Date();
  }

  protected async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
