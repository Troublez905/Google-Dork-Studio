export type ExposureKind = "sensitive-file" | "backup" | "admin-portal" | "keyword";
export type Severity = "critical" | "high" | "medium" | "low";
export type ExposureStatus = "open" | "resolved";

export interface MonitorConfig {
  domain: string;
  keywords: string[];
  fileTypes: string[];
  adminPaths: string[];
  scheduleLabel: string;
}

export interface Exposure {
  id: string;
  url: string;
  title: string;
  query: string;
  kind: ExposureKind;
  severity: Severity;
  status: ExposureStatus;
  firstSeen: string;
  lastSeen: string;
  resolvedAt?: string;
}

export interface ScanPoint {
  at: string;
  open: number;
  discovered: number;
  resolved: number;
  queries: number;
  durationMs: number;
  error?: string;
  alertWarnings?: string[];
}

export interface MonitorState {
  version: 1;
  config: MonitorConfig;
  exposures: Exposure[];
  scans: ScanPoint[];
  lastRun?: ScanPoint;
}

export interface SearchMatch {
  title: string;
  url: string;
}

export interface QueryDefinition {
  query: string;
  kind: ExposureKind;
  severity: Severity;
}
