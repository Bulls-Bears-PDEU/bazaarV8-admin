export type AdFormat = "leaderboard" | "rectangle";

export type Ad = {
	slot: string;
	sponsor: string;
	link_url: string | null;
	is_active: boolean;
	/** A backend path; resolve it with mediaUrl. */
	image_url: string;
	updated_at: string;
};

export type AdSlot = {
	slot: string;
	label: string;
	format: AdFormat;
	/** The slot's size in CSS pixels; images are stored at twice this. */
	width: number;
	height: number;
	/** Null until an image is uploaded for the slot. */
	ad: Ad | null;
};

export type AdsAdmin = {
	/** False while every ad, placeholders included, is hidden from players. */
	enabled: boolean;
	slots: AdSlot[];
};
