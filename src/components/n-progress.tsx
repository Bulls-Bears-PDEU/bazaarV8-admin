import { useNProgress } from "@tanem/react-nprogress";
import { Progress } from "./ui/progress";

/**
 * The thread at the top of the window while a route loads. Thin and quick on
 * purpose: navigations that resolve immediately should barely register, and the
 * ones that do not should still not cover anything.
 */
const NProgress = ({ isAnimating }: { isAnimating: boolean }) => {
	const { animationDuration, isFinished, progress } = useNProgress({
		isAnimating,
	});

	return (
		<div
			aria-hidden="true"
			className="pointer-events-none fixed inset-x-0 top-0 z-9999"
			style={{
				opacity: isFinished ? 0 : 1,
				transition: `opacity ${animationDuration}ms linear`,
			}}
		>
			<Progress
				className="h-0.5 rounded-none bg-transparent [&>[data-slot=progress-indicator]]:shadow-[0_0_10px_2px] [&>[data-slot=progress-indicator]]:shadow-primary/40"
				style={{ transitionDuration: `${animationDuration}ms` }}
				value={progress * 100}
			/>
		</div>
	);
};

export default NProgress;
