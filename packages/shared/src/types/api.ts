export interface SuccessEnvelope<T> {
  success: true;
  data: T;
  count: number;
}

export interface ErrorBody {
  success: false;
  message: string;
  error?: string;
  [key: string]: unknown;
}

export interface HealthStatus {
  status: 'OK' | 'healthy' | 'unhealthy';
  timestamp?: string;
  services?: Record<string, string>;
  neo4j?: string;
}
