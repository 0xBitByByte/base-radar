/**
 * The health-check capability a backend must provide. Interface only —
 * no implementation lives here.
 */

export type BackendHealth = {
  healthy: boolean;
  message?: string;
};

export type HealthService = {
  check(): Promise<BackendHealth>;
};
