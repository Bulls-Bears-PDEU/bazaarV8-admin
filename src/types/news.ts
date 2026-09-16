/** Bounds the backend enforces on a story's price impact. */
export const NEWS_LIMITS = {
	maxImpactPct: 50,
	minDurationSeconds: 1,
	maxDurationSeconds: 2 * 60 * 60,
	defaultDurationSeconds: 60,
} as const;

/**
 * How one stock reacts to a story: a percentage move priced in over
 * duration_seconds, or the story's default duration when that is null.
 */
export type NewsImpact = {
	stock_id: number;
	impact_pct: number;
	duration_seconds: number | null;
};

export type NewsImpactDetail = NewsImpact & {
	symbol: string;
	name: string;
	sector: string;
};

export type News = {
	id: number;
	title: string;
	content: string; // Markdown
	isReleased: boolean;
	release_at: string;
	created_at: string;
	// When the story first went out and moved prices; null until it has.
	first_released_at: string | null;
	default_duration_seconds: number;
	impacts: NewsImpactDetail[];
};

export type NewsPayload = {
	title?: string;
	content?: string;
	release_at?: string;
	release_now?: boolean;
	default_duration_seconds?: number;
	impacts?: NewsImpact[];
};
