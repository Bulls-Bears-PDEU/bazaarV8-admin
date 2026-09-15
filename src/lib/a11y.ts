import { useSyncExternalStore } from "react";

/**
 * Display preferences that make the app easier to read and use. Applied as
 * classes on <html>, so CSS and the charts (which re-read the theme whenever
 * those classes change) both follow them. Kept per browser.
 */
export type TextSize = "default" | "large" | "larger";

export type A11yPrefs = {
	textSize: TextSize;
	// Stops the ticker, count-ups and other movement, whatever the OS says.
	reduceMotion: boolean;
	// Blue for rises, orange for falls: distinguishable with red-green colour blindness.
	colorSafe: boolean;
	highContrast: boolean;
	// Underlines every link so they do not rely on colour alone.
	underlineLinks: boolean;
};

const KEY = "bazaar:a11y";
const DEFAULTS: A11yPrefs = {
	textSize: "default",
	reduceMotion: false,
	colorSafe: false,
	highContrast: false,
	underlineLinks: false,
};

const load = (): A11yPrefs => {
	try {
		return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
	} catch {
		return DEFAULTS;
	}
};

let prefs = load();
const listeners = new Set<() => void>();

export const applyA11yPrefs = (next: A11yPrefs = prefs) => {
	const root = document.documentElement.classList;
	root.toggle("a11y-text-large", next.textSize === "large");
	root.toggle("a11y-text-larger", next.textSize === "larger");
	root.toggle("a11y-reduce-motion", next.reduceMotion);
	root.toggle("a11y-color-safe", next.colorSafe);
	root.toggle("a11y-high-contrast", next.highContrast);
	root.toggle("a11y-underline-links", next.underlineLinks);
};

export const setA11yPrefs = (patch: Partial<A11yPrefs>) => {
	prefs = { ...prefs, ...patch };
	try {
		localStorage.setItem(KEY, JSON.stringify(prefs));
	} catch {
		// Storage unavailable: the preference lasts for this visit.
	}
	applyA11yPrefs(prefs);
	for (const listener of listeners) listener();
};

export const resetA11yPrefs = () => setA11yPrefs(DEFAULTS);

const subscribe = (listener: () => void) => {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
};

export const useA11yPrefs = () => useSyncExternalStore(subscribe, () => prefs);

/** True when movement should stop: the player's setting or the OS setting. */
export const motionReduced = () =>
	prefs.reduceMotion ||
	(typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
