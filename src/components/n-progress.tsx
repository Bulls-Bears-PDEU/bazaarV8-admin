import { useNProgress } from "@tanem/react-nprogress";
import { Progress } from "./ui/progress";

const NProgress = ({ isAnimating }: { isAnimating: boolean }) => {
	const { animationDuration, isFinished, progress } = useNProgress({
		isAnimating,
	});

	return (
		<div
			style={{
				opacity: isFinished ? 0 : 1,
				transition: `opacity ${animationDuration}ms linear`,
				zIndex: 9999,
				position: "fixed",
				top: 0,
				left: 0,
				right: 0,
			}}
		>
			<Progress
				style={{
					transitionDuration: `${animationDuration}ms`,
				}}
				value={progress * 100}
			/>
		</div>
	);
};

export default NProgress;
