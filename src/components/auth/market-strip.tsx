import { Pause, Play } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { motionReduced, useA11yPrefs } from "#/lib/a11y";
import { cn } from "#/lib/utils";

/**
 * Candlestick charts drifting past the sign-in pitch, as plain SVG.
 *
 * Each layer is one tile of candles drawn twice side by side and slid left by
 * exactly one tile, forever, so it loops without a seam. The candles are
 * worked out once when the module loads and merged into a handful of paths;
 * after that the only work is a transform the compositor animates, so it costs
 * next to nothing and stays sharp at any zoom.
 *
 * Depth comes from parallax and focus: a square grid furthest back and
 * slowest, then small blurred candles, a softened price line, the sharp main
 * chart, and a few large, heavily blurred candles sweeping past in front. The
 * blur is an SVG filter inside the artwork, so it is rendered once with the
 * tile and only the finished image moves (a CSS blur on a moving element is
 * recomputed every frame).
 *
 * The slide runs through the Web Animations API rather than CSS keyframes so
 * the pause button works even when Reduce motion is on (the app's reduce-motion
 * rule shortens every CSS animation to nothing). It starts paused under Reduce
 * motion, and the whole thing is hidden from assistive technology.
 */

type Tile = {
	width: number;
	height: number;
	gainWicks: string;
	lossWicks: string;
	gainBodies: string;
	lossBodies: string;
	line: string;
	area: string;
};

type TileSpec = {
	seed: number;
	candles: number;
	step: number;
	height: number;
	sigma: number;
	// A moving average for candle layers; a closing-price area for the silhouette.
	average: number;
};

/** Small seeded generator, so the art is the same on every visit. */
const seeded = (seed: number) => {
	let state = seed >>> 0;
	const uniform = () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
	const normal = () => {
		let u = 0;
		while (u === 0) u = uniform();
		return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * uniform());
	};
	return { uniform, normal };
};

const round = (value: number) => Math.round(value * 100) / 100;

const buildTile = ({
	seed,
	candles,
	step,
	height,
	sigma,
	average,
}: TileSpec): Tile => {
	const random = seeded(seed);
	// A random walk in log price, bent so it ends where it began: the tile's
	// last candle then flows straight into the next copy's first.
	const walk = [0];
	for (let i = 0; i < candles; i++)
		walk.push(walk[i] + sigma * random.normal());
	const drift = walk[candles] / candles;
	const closes = walk.map((value, i) => value - drift * i);

	const bars = Array.from({ length: candles }, (_, i) => {
		const open = closes[i];
		const close = closes[i + 1];
		return {
			open,
			close,
			high: Math.max(open, close) + Math.abs(random.normal()) * sigma * 0.55,
			low: Math.min(open, close) - Math.abs(random.normal()) * sigma * 0.55,
		};
	});

	const lo = Math.min(...bars.map((bar) => bar.low));
	const hi = Math.max(...bars.map((bar) => bar.high));
	const pad = (hi - lo) * 0.08;
	const y = (value: number) =>
		round(height - ((value - lo + pad) / (hi - lo + pad * 2)) * height);
	const body = step * 0.58;

	let gainWicks = "";
	let lossWicks = "";
	let gainBodies = "";
	let lossBodies = "";
	bars.forEach((bar, i) => {
		const cx = round(i * step + step / 2);
		const top = y(Math.max(bar.open, bar.close));
		const bodyHeight = Math.max(
			1.5,
			round(y(Math.min(bar.open, bar.close)) - top),
		);
		const wick = `M${cx} ${y(bar.high)}V${y(bar.low)}`;
		const rect = `M${round(cx - body / 2)} ${top}h${round(body)}v${bodyHeight}h${-round(body)}Z`;
		if (bar.close >= bar.open) {
			gainWicks += wick;
			gainBodies += rect;
		} else {
			lossWicks += wick;
			lossBodies += rect;
		}
	});

	// The average wraps around the tile so it is seamless too.
	const points = bars.map((_, i) => {
		let sum = 0;
		for (let k = 0; k < average; k++)
			sum += closes[((((i - k) % candles) + candles) % candles) + 1];
		return [round(i * step + step / 2), y(sum / average)] as const;
	});
	// Run the line to both edges at the height halfway between the last and
	// first points, which is where they meet across the join between copies.
	const seam = round((points[0][1] + points[points.length - 1][1]) / 2);
	const joined = [[0, seam], ...points, [candles * step, seam]];
	const line = joined
		.map(([px, py], i) => `${i === 0 ? "M" : "L"}${px} ${py}`)
		.join("");

	return {
		width: candles * step,
		height,
		gainWicks,
		lossWicks,
		gainBodies,
		lossBodies,
		line,
		area: `${line}L${candles * step} ${height}L0 ${height}Z`,
	};
};

// Height of every tile in its own units; blur is measured in the same units,
// so it scales with the layer.
const TILE_HEIGHT = 220;

type LayerKind = "silhouette" | "candles";

type LayerConfig = {
	name: string;
	tile: Tile;
	kind: LayerKind;
	// Draw the moving average over the candles.
	line: boolean;
	// Gaussian blur, in tile units; 0 for sharp.
	blur: number;
	// Seconds to slide one tile.
	seconds: number;
	className: string;
};

const LAYERS: LayerConfig[] = [
	{
		// Far away: small, soft and slow.
		name: "far",
		tile: buildTile({
			seed: 11,
			candles: 120,
			step: 9,
			height: TILE_HEIGHT,
			sigma: 0.05,
			average: 1,
		}),
		kind: "candles",
		line: false,
		blur: 2.2,
		seconds: 220,
		className: "top-[2%] h-[46%] opacity-35",
	},
	{
		name: "silhouette",
		tile: buildTile({
			seed: 7,
			candles: 96,
			step: 10,
			height: TILE_HEIGHT,
			sigma: 0.05,
			average: 3,
		}),
		kind: "silhouette",
		line: true,
		blur: 0.8,
		seconds: 150,
		className: "top-[8%] h-[60%] opacity-70",
	},
	{
		// In focus.
		name: "focus",
		tile: buildTile({
			seed: 42,
			candles: 60,
			step: 24,
			height: TILE_HEIGHT,
			sigma: 0.045,
			average: 8,
		}),
		kind: "candles",
		line: true,
		blur: 0,
		seconds: 70,
		className: "top-[24%] h-[64%]",
	},
	{
		// Out of focus, close to the viewer: big, very soft and quick.
		name: "near",
		tile: buildTile({
			seed: 99,
			candles: 14,
			step: 64,
			height: TILE_HEIGHT,
			sigma: 0.09,
			average: 1,
		}),
		kind: "candles",
		line: false,
		blur: 7,
		seconds: 34,
		className: "-top-[6%] h-[80%] opacity-20",
	},
];

/** Slides an element left by `distance`, forever, on the compositor. */
const useSlide = (
	ref: React.RefObject<HTMLElement | null>,
	distance: string,
	seconds: number,
	playing: boolean,
) => {
	const animationRef = useRef<Animation | null>(null);

	useEffect(() => {
		const element = ref.current;
		if (!element?.animate) return;
		const animation = element.animate(
			[
				{ transform: "translate3d(0, 0, 0)" },
				{ transform: `translate3d(-${distance}, 0, 0)` },
			],
			{
				duration: seconds * 1000,
				iterations: Number.POSITIVE_INFINITY,
				easing: "linear",
			},
		);
		animationRef.current = animation;
		return () => animation.cancel();
	}, [ref, distance, seconds]);

	useEffect(() => {
		const animation = animationRef.current;
		if (!animation) return;
		if (playing) animation.play();
		else animation.pause();
	}, [playing]);
};

function TileArt({
	config,
	ids,
}: {
	config: LayerConfig;
	ids: { gradient: string; blur: string };
}) {
	const { tile, kind, line, blur } = config;
	const stroke = {
		strokeWidth: 1.25,
		vectorEffect: "non-scaling-stroke" as const,
	};
	return (
		<svg
			viewBox={`0 0 ${tile.width} ${tile.height}`}
			preserveAspectRatio="xMinYMid meet"
			className="block h-full w-auto shrink-0 overflow-visible"
			aria-hidden="true"
			focusable="false"
		>
			<g filter={blur ? `url(#${ids.blur})` : undefined}>
				{kind === "silhouette" ? (
					<path d={tile.area} fill={`url(#${ids.gradient})`} />
				) : (
					<>
						<path d={tile.gainWicks} className="stroke-gain" {...stroke} />
						<path d={tile.lossWicks} className="stroke-loss" {...stroke} />
						<path d={tile.gainBodies} className="fill-gain" />
						<path d={tile.lossBodies} className="fill-loss" />
					</>
				)}
				{line && (
					<path
						d={tile.line}
						fill="none"
						className={
							kind === "silhouette"
								? "stroke-foreground/40"
								: "stroke-foreground/35"
						}
						strokeWidth="1.5"
						strokeLinejoin="round"
						strokeLinecap="round"
						vectorEffect="non-scaling-stroke"
					/>
				)}
			</g>
		</svg>
	);
}

function Layer({ config, playing }: { config: LayerConfig; playing: boolean }) {
	const trackRef = useRef<HTMLDivElement>(null);
	const id = useId();
	const ids = { gradient: `${id}-fill`, blur: `${id}-blur` };
	const { tile, blur } = config;
	useSlide(trackRef, "50%", config.seconds, playing);

	return (
		<div className={cn("absolute inset-x-0", config.className)}>
			<svg
				width="0"
				height="0"
				className="absolute"
				aria-hidden="true"
				focusable="false"
			>
				<defs>
					<linearGradient id={ids.gradient} x1="0" y1="0" x2="0" y2="1">
						<stop
							offset="0"
							style={{ stopColor: "var(--foreground)", stopOpacity: 0.12 }}
						/>
						<stop
							offset="1"
							style={{ stopColor: "var(--foreground)", stopOpacity: 0 }}
						/>
					</linearGradient>
					{blur > 0 && (
						// Room for the blur to spill past the tile, so the two copies
						// blend into each other at the join instead of showing a seam.
						<filter
							id={ids.blur}
							filterUnits="userSpaceOnUse"
							x={-blur * 4}
							y={-blur * 4}
							width={tile.width + blur * 8}
							height={tile.height + blur * 8}
							colorInterpolationFilters="sRGB"
						>
							<feGaussianBlur stdDeviation={blur} />
						</filter>
					)}
				</defs>
			</svg>
			<div ref={trackRef} className="flex h-full w-max will-change-transform">
				<TileArt config={config} ids={ids} />
				<TileArt config={config} ids={ids} />
			</div>
		</div>
	);
}

/** The square grid furthest back, drifting slowest of all. It slides by exactly one 4rem cell to loop. */
function Grid({ playing }: { playing: boolean }) {
	const gridRef = useRef<HTMLDivElement>(null);
	useSlide(gridRef, "4rem", 24, playing);
	return (
		<div className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_55%_45%,black_10%,transparent_72%)]">
			<div
				ref={gridRef}
				className="absolute inset-y-0 right-[-4rem] left-0 will-change-transform [background-image:linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] [background-size:4rem_4rem]"
			/>
		</div>
	);
}

export function MarketStrip({ className }: { className?: string }) {
	const a11y = useA11yPrefs();
	const [systemReduced, setSystemReduced] = useState(() => motionReduced());
	// null follows the motion preference; a press of the button overrides it.
	const [override, setOverride] = useState<boolean | null>(null);
	const reduced = a11y.reduceMotion || systemReduced;
	const playing = override ?? !reduced;

	useEffect(() => {
		const query = window.matchMedia("(prefers-reduced-motion: reduce)");
		const onChange = () => setSystemReduced(query.matches);
		query.addEventListener("change", onChange);
		return () => query.removeEventListener("change", onChange);
	}, []);

	// Changing the motion preference hands control back to it.
	// biome-ignore lint/correctness/useExhaustiveDependencies: reset only when the preference changes
	useEffect(() => {
		setOverride(null);
	}, [reduced]);

	return (
		<div className={cn("relative overflow-hidden", className)}>
			<div aria-hidden="true" className="absolute inset-0">
				<Grid playing={playing} />
				{/* Charts fade out at the sides and towards the headline below. */}
				<div className="absolute inset-0 [mask-composite:intersect] [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent),linear-gradient(to_bottom,black_75%,transparent)]">
					{LAYERS.map((config) => (
						<Layer key={config.name} config={config} playing={playing} />
					))}
				</div>
			</div>
			{/* In flow, so it lines up with the panel padding above the charts. */}
			<div className="relative flex justify-end">
				<button
					type="button"
					onClick={() => setOverride(!playing)}
					aria-pressed={!playing}
					aria-label={
						playing ? "Pause background animation" : "Play background animation"
					}
					className="relative flex size-9 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-xs transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
				>
					{playing ? (
						<Pause className="size-4" aria-hidden="true" />
					) : (
						<Play className="size-4" aria-hidden="true" />
					)}
				</button>
			</div>
		</div>
	);
}
