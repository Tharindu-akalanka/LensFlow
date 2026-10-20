export type Mode = 'fast' | 'balanced' | 'detailed';
export type ShootType = 'wedding' | 'portrait' | 'sports' | 'events' | 'other';
export const SHOOT_LABELS: Record<ShootType, string> = { wedding: 'Wedding', portrait: 'Portrait', sports: 'Sports', events: 'Events', other: 'Other' };
export type Decision = 'keep' | 'reject' | 'undecided';
export interface Face {
  index: number;
  box: [number, number, number, number];
  eyes: 'unknown' | 'likely_open' | 'possibly_closed';
  sharpness: number;
  crop_source: string;
}
export interface Photo {
  framing?: string;
  framing_hints?: string[];
  selection_warnings?: string[];
  rejection_reason?: string;
  id: string;
  name: string;
  status: string;
  decision: Decision;
  rating: number;
  label: string;
  preview_basis?: string;
  source_format?: string;
  error?: string;
  thumbnail?: string;
  original_width?: number;
  original_height?: number;
  analysis: null | {
    aesthetics?: {status:string;score?:number;spread?:number;model?:string};
    blur_hint?: string;
    exposure_hint?: string;
    embedding_provider?: string;
    key_face?: number;
    sharpness: number;
    score: number;
    faces: Face[];
    face_status: string;
    face_limit_reached: boolean;
    reasons: string[];
    model_error?: string;
    luminance_histogram?: number[];
  };
}
export interface Group {
  manual?: boolean;
  close_candidates?: string[];
  variants?: {framing:string;suggested:string}[];
  close_call?: boolean;
  review_reasons?: string[];
  id: string;
  photos: Photo[];
  suggested: string | null;
  alternatives: string[];
  explanation: string;
}
export interface SessionSummary {
  shoot_type: ShootType;
  id: string;
  name: string;
  mode: Mode;
  status: string;
  total: number;
  kept: number;
  completed: number;
  cover?: string;
  created: string;
}
export interface CullingOptions {
  grouping: boolean;
  faces: boolean;
  alternatives: boolean;
}
export interface SelectionPreferences {
  workflow: 'assisted' | 'automated'; target:number; avoid_blur:boolean; avoid_closed:boolean; avoid_exposure:boolean; auto_xmp:boolean;
}
export interface Session extends SessionSummary {
  can_undo_groups?: boolean;
  has_manual_groups?: boolean;
  photos: Photo[];
  groups: Group[];
  completed: number;
  failed: number;
  elapsed: number;
  error?: string;
  can_undo: boolean;
  imported: number;
  analyzed: number;
  pending: number;
  import_errors: number;
  preview_pending: number;
  options: CullingOptions;
  preferences: SelectionPreferences;
  recommendations: string[];
  recommendation_count: number;
  recommendation_summary?: {available:number;groups_covered:number;additional_from_groups:number;shortfall:number};
  review_recommendations?: string[];
  watch: {enabled:boolean;folder:string;auto_cull:boolean};
  watch_error?: string;
  xmp_error?: string;
}
export async function request<T>(path: string, body?: object): Promise<T> {
  const response = await fetch(
    `/api${path}`,
    body
      ? {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      : undefined,
  );
  const data = await response.json().catch(() => ({
    error: 'Local engine is not responding. Start the local engine and retry.',
  }));
  if (!response.ok) throw new Error(data.error || 'Local request failed');
  return data as T;
}
export const photoUrl = (photo: Photo, kind: string, index?: number) =>
  `/api/photos/${photo.id}/${kind}${index === undefined ? '' : `?index=${index}`}`;
