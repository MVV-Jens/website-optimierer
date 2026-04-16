// ─── Pipeline Options ───────────────────────────────────────────────────────

export type OptimizationFocus =
  | "all"
  | "navigation"
  | "form-ux"
  | "content-hierarchy"
  | "mobile";

export type OptimizationDepth = "conservative" | "moderate";

export interface AnalysisOptions {
  optimizationFocus: OptimizationFocus;
  depth: OptimizationDepth;
}

// ─── Crawl Result ────────────────────────────────────────────────────────────

export interface CrawlResult {
  url: string;
  baseUrl: string;
  html: string;
  statusCode: number;
  title: string;
  metaDescription: string;
  metaKeywords: string;
  canonicalUrl: string;
  ogTags: Record<string, string>;
  headings: { level: number; text: string }[];
  images: { src: string; alt: string | null; width?: number; height?: number }[];
  links: { href: string; text: string; isInternal: boolean }[];
  navigation: { text: string; href: string }[];
  forms: {
    action: string;
    method: string;
    inputs: {
      type: string;
      name: string;
      id: string;
      label: string | null;
      placeholder: string;
      required: boolean;
    }[];
  }[];
  cssFiles: string[];
  inlineCssBlocks: string[];
  scriptCount: number;
  hasViewportMeta: boolean;
  hasLangAttribute: boolean;
  langValue: string;
  hasSkipLink: boolean;
  htmlSizeBytes: number;
  robotsAllowed: boolean;
  robotsReason?: string;
  loadTimeMs: number;
}

// ─── Analysis ────────────────────────────────────────────────────────────────

export type IssuePriority = "P0" | "P1" | "P2";

export type AnalysisCategory =
  | "information-architecture"
  | "interaction"
  | "readability"
  | "accessibility"
  | "responsiveness"
  | "performance"
  | "seo";

export interface Issue {
  id: string;
  category: AnalysisCategory;
  priority: IssuePriority;
  title: string;
  description: string;
  fix: string;
  count?: number;
}

export interface CategoryScore {
  category: AnalysisCategory;
  label: string;
  score: number;
  description: string;
  quickWins: string[];
}

export interface AnalysisResult {
  url: string;
  analyzedAt: string;
  scores: Record<AnalysisCategory, number>;
  overallScore: number;
  categories: CategoryScore[];
  issues: Issue[];
  topIssues: Issue[];
  recommendations: string[];
}

// ─── Style Lock ──────────────────────────────────────────────────────────────

export interface StyleLock {
  typography: {
    primaryFamily: string;
    secondaryFamily: string;
    baseSizeRem: number;
    sizes: string[];
    weights: string[];
    lineHeight: string;
  };
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textMuted: string;
    border: string;
    error: string;
    success: string;
  };
  components: {
    buttonPrimary: string;
    buttonSecondary: string;
    inputStyle: string;
    cardStyle: string;
    linkStyle: string;
  };
  layout: {
    borderRadius: string;
    boxShadow: string;
    spacingUnit: string;
    maxWidth: string;
    breakpoints: string[];
  };
  cssVars: Record<string, string>;
  hasDesignTokens: boolean;
  originalCssFiles: string[];
}

// ─── Redesign ────────────────────────────────────────────────────────────────

export interface RedesignChange {
  category: AnalysisCategory;
  before: string;
  after: string;
  reason: string;
  impact: "high" | "medium" | "low";
  /** CSS-Selector des primär betroffenen Elements (für Overlay-Highlight) */
  selector?: string;
  /** Kurze Vorschau des Element-Inhalts (Text, Dateiname, Tag) */
  elementPreview?: string;
}

export interface IAOutlineSection {
  name: string;
  purpose: string;
  order: number;
  isNew: boolean;
}

export interface RedesignResult {
  html: string;
  css: string;
  changes: RedesignChange[];
  iaOutline: IAOutlineSection[];
  changeCount: number;
}

// ─── Creation (API response shape) ───────────────────────────────────────────

export interface CreationSummary {
  id: string;
  url: string;
  createdAt: string;
  status: "ANALYZING" | "DESIGNING" | "DONE" | "ERROR";
  optimizationFocus: string | null;
  depth: string | null;
  errorMessage: string | null;
  overallScore?: number;
}

export interface CreationDetail extends CreationSummary {
  analysis: AnalysisResult | null;
  styleLock: StyleLock | null;
  redesignChanges: RedesignChange[];
  iaOutline: IAOutlineSection[];
  hasRedesign: boolean;
  hasZip: boolean;
}
