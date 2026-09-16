import {
	AlertCircle,
	ArrowBigUpDash,
	Check,
	Circle,
	Eye,
	EyeOff,
	LockKeyhole,
	type LucideIcon,
	X,
} from "lucide-react";
import {
	type ComponentProps,
	forwardRef,
	type ReactNode,
	useId,
	useState,
} from "react";
import { Button } from "#/components/ui/button";
import { Label } from "#/components/ui/label";
import { Spinner } from "#/components/ui/spinner";
import { cn } from "#/lib/utils";

/**
 * The pieces every sign-in, sign-up and reset form is built from, so all of
 * them share one roomy field, one error style and the same accessibility
 * wiring: labels, descriptions and errors tied to their input, and errors
 * announced as they appear.
 */

export const MIN_PASSWORD_LENGTH = 8;

const inputClass =
	"peer h-11 w-full min-w-0 rounded-xl border border-input bg-background pr-3.5 pl-10 text-base shadow-xs transition-[border-color,box-shadow] outline-none placeholder:text-muted-foreground/70 hover:border-ring/70 focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive/20 dark:bg-input/20";

type TextFieldProps = Omit<ComponentProps<"input">, "id"> & {
	label: ReactNode;
	icon: LucideIcon;
	// Shown at the end of the label row, such as "Forgot your password?".
	labelAside?: ReactNode;
	description?: ReactNode;
	error?: string | null;
	// Inside the input, on the right.
	trailing?: ReactNode;
	// Extra lines under the field, already carrying their own ids.
	after?: ReactNode;
	describedBy?: string[];
	id?: string;
};

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
	function TextField(
		{
			label,
			icon: Icon,
			labelAside,
			description,
			error,
			trailing,
			after,
			describedBy = [],
			id,
			className,
			...props
		},
		ref,
	) {
		const generatedId = useId();
		const inputId = id ?? generatedId;
		const descriptionId = `${inputId}-description`;
		const errorId = `${inputId}-error`;
		const described = [
			description ? descriptionId : null,
			error ? errorId : null,
			...describedBy,
		]
			.filter(Boolean)
			.join(" ");

		return (
			<div className="flex flex-col gap-2">
				<div className="flex min-h-5 items-center justify-between gap-3">
					<Label htmlFor={inputId}>{label}</Label>
					{labelAside}
				</div>
				<div className="relative">
					<input
						ref={ref}
						id={inputId}
						aria-invalid={error ? true : undefined}
						aria-describedby={described || undefined}
						className={cn(inputClass, trailing && "pr-12", className)}
						{...props}
					/>
					<Icon
						aria-hidden="true"
						className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground transition-colors peer-focus-visible:text-foreground"
					/>
					{trailing && (
						<div className="absolute inset-y-0 right-1 flex items-center">
							{trailing}
						</div>
					)}
				</div>
				{description && (
					<p id={descriptionId} className="text-sm text-muted-foreground">
						{description}
					</p>
				)}
				{error && (
					<p
						id={errorId}
						role="alert"
						className="flex items-start gap-1.5 text-sm text-destructive"
					>
						<AlertCircle
							className="mt-0.5 size-3.5 shrink-0"
							aria-hidden="true"
						/>
						{error}
					</p>
				)}
				{after}
			</div>
		);
	},
);

type PasswordFieldProps = Omit<TextFieldProps, "icon" | "type" | "trailing"> & {
	icon?: LucideIcon;
};

/**
 * A password field with its own show/hide button and a Caps Lock warning, so
 * a mistyped password is caught before it is sent.
 */
export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
	function PasswordField(
		{
			icon = LockKeyhole,
			onKeyDown,
			onKeyUp,
			onBlur,
			describedBy = [],
			id,
			after,
			...props
		},
		ref,
	) {
		const generatedId = useId();
		const inputId = id ?? generatedId;
		const capsId = `${inputId}-caps`;
		const [visible, setVisible] = useState(false);
		const [capsLock, setCapsLock] = useState(false);

		const readCapsLock = (event: React.KeyboardEvent<HTMLInputElement>) => {
			// Some keys (and some browsers) do not report modifier state.
			if (typeof event.getModifierState === "function")
				setCapsLock(event.getModifierState("CapsLock"));
		};

		return (
			<TextField
				ref={ref}
				id={inputId}
				icon={icon}
				type={visible ? "text" : "password"}
				autoCapitalize="none"
				autoCorrect="off"
				spellCheck={false}
				describedBy={[...(capsLock ? [capsId] : []), ...describedBy]}
				onKeyDown={(event) => {
					readCapsLock(event);
					onKeyDown?.(event);
				}}
				onKeyUp={(event) => {
					readCapsLock(event);
					onKeyUp?.(event);
				}}
				onBlur={(event) => {
					setCapsLock(false);
					onBlur?.(event);
				}}
				trailing={
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="size-9 rounded-lg text-muted-foreground hover:text-foreground"
						aria-label={visible ? "Hide password" : "Show password"}
						aria-controls={inputId}
						aria-pressed={visible}
						onClick={() => setVisible((value) => !value)}
					>
						{visible ? (
							<EyeOff className="size-4" aria-hidden="true" />
						) : (
							<Eye className="size-4" aria-hidden="true" />
						)}
					</Button>
				}
				after={
					<>
						{capsLock && (
							<p
								id={capsId}
								role="status"
								className="flex items-center gap-1.5 text-sm text-amber-700 dark:text-amber-400"
							>
								<ArrowBigUpDash
									className="size-4 shrink-0"
									aria-hidden="true"
								/>
								Caps Lock is on
							</p>
						)}
						{after}
					</>
				}
				{...props}
			/>
		);
	},
);

// ---------------------------------------------------------------------------
// Password strength
// ---------------------------------------------------------------------------

const STRENGTH = [
	{ label: "Too short", bar: "bg-destructive", text: "text-destructive" },
	{ label: "Weak", bar: "bg-destructive", text: "text-destructive" },
	{
		label: "Fair",
		bar: "bg-amber-500",
		text: "text-amber-700 dark:text-amber-400",
	},
	{ label: "Good", bar: "bg-gain", text: "text-gain" },
	{ label: "Strong", bar: "bg-gain", text: "text-gain" },
] as const;

/** 0 (too short) to 4 (strong): length first, then variety. */
export const passwordScore = (password: string) => {
	if (password.length < MIN_PASSWORD_LENGTH) return 0;
	let score = 1;
	if (password.length >= 12) score++;
	if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
	if (/\d/.test(password)) score++;
	if (/[^A-Za-z0-9]/.test(password)) score++;
	return Math.min(score, 4);
};

/**
 * The strength meter, shown under a new password. Only the length rule is
 * required; the rest is advice.
 */
export function PasswordStrength({
	password,
	id,
}: {
	password: string;
	id: string;
}) {
	if (!password) {
		return (
			<p id={id} className="text-sm text-muted-foreground">
				At least {MIN_PASSWORD_LENGTH} characters. Longer, with a mix of
				letters, numbers and symbols, is stronger.
			</p>
		);
	}
	const score = passwordScore(password);
	const level = STRENGTH[score];
	const hint =
		score === 0
			? `${MIN_PASSWORD_LENGTH - password.length} more character${MIN_PASSWORD_LENGTH - password.length === 1 ? "" : "s"} needed.`
			: score < 3
				? "Add length, capitals, numbers or symbols to make it stronger."
				: null;

	return (
		<div id={id} className="flex flex-col gap-1.5">
			<div className="flex gap-1" aria-hidden="true">
				{[1, 2, 3, 4].map((segment) => (
					<span
						key={segment}
						className={cn(
							"h-1.5 flex-1 rounded-full bg-muted transition-colors",
							(score >= segment || (score === 0 && segment === 1)) && level.bar,
						)}
					/>
				))}
			</div>
			<p className="text-sm text-muted-foreground">
				{/* Announced when the level changes, not on every keystroke. */}
				<span aria-live="polite" className={cn("font-medium", level.text)}>
					Strength: {level.label}.
				</span>{" "}
				{hint}
			</p>
		</div>
	);
}

/** The requirements, ticked off as they are met. */
export function PasswordChecklist({
	password,
	confirm,
	id,
}: {
	password: string;
	confirm: string;
	id?: string;
}) {
	const items = [
		{
			label: `At least ${MIN_PASSWORD_LENGTH} characters`,
			met: password.length >= MIN_PASSWORD_LENGTH,
			pending: !password,
		},
		{
			label: "Both passwords match",
			met: Boolean(confirm) && password === confirm,
			pending: !confirm,
		},
	];
	return (
		<ul
			id={id}
			className="flex flex-col gap-1.5 rounded-xl bg-muted/50 px-3.5 py-3 text-sm"
			aria-label="Password requirements"
		>
			{items.map((item) => {
				const Icon = item.met ? Check : item.pending ? Circle : X;
				return (
					<li
						key={item.label}
						className={cn(
							"flex items-center gap-2",
							item.met
								? "text-foreground"
								: item.pending
									? "text-muted-foreground"
									: "text-destructive",
						)}
					>
						<Icon
							className={cn(
								"size-4 shrink-0",
								item.met && "text-gain",
								item.pending && "size-3.5 opacity-60",
							)}
							aria-hidden="true"
						/>
						{item.label}
						<span className="sr-only">{item.met ? ", done" : ", not yet"}</span>
					</li>
				);
			})}
		</ul>
	);
}

// ---------------------------------------------------------------------------
// Layout pieces
// ---------------------------------------------------------------------------

export function AuthHeading({
	title,
	description,
	icon: Icon,
}: {
	title: string;
	description?: ReactNode;
	icon?: LucideIcon;
}) {
	return (
		<div className="flex flex-col gap-2">
			{Icon && (
				<div className="mb-2 flex size-11 items-center justify-center rounded-xl border bg-muted/50">
					<Icon className="size-5" aria-hidden="true" />
				</div>
			)}
			<h1 className="text-3xl font-semibold tracking-tight text-balance">
				{title}
			</h1>
			{description && (
				<p className="text-base text-pretty text-muted-foreground">
					{description}
				</p>
			)}
		</div>
	);
}

/** An error about the whole form, announced as it appears. */
export function FormAlert({
	message,
	id,
}: {
	message: string | null;
	id?: string;
}) {
	if (!message) return null;
	return (
		<div
			id={id}
			role="alert"
			className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-3.5 py-3 text-sm text-destructive"
		>
			<AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
			<p className="text-pretty">{message}</p>
		</div>
	);
}

export function SubmitButton({
	pending,
	children,
	className,
	...props
}: ComponentProps<typeof Button> & { pending?: boolean }) {
	return (
		<Button
			type="submit"
			size="lg"
			aria-disabled={pending || undefined}
			className={cn("h-11 w-full rounded-xl text-base", className)}
			{...props}
			onClick={(event) => {
				// Stays focusable while busy, but a second press does nothing.
				if (pending) event.preventDefault();
				props.onClick?.(event);
			}}
		>
			{pending && <Spinner data-icon="inline-start" />}
			{children}
		</Button>
	);
}

export const authLinkClass =
	"font-medium text-foreground underline decoration-foreground/30 underline-offset-4 transition-colors hover:decoration-foreground focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";
