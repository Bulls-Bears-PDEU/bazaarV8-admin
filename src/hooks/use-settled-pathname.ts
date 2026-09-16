import { useRouterState } from "@tanstack/react-router";
import { useRef } from "react";

/**
 * The path of the page actually on screen.
 *
 * `location.pathname` changes the moment a navigation starts, while the old
 * page is still what is rendered. Keying a transition on it therefore replays
 * the entrance on the page being left, and then the page that arrives does not
 * animate at all, because by the time it renders the key has already changed.
 *
 * This holds the last path the router settled on, so the key changes in the
 * same commit that brings the new page in.
 */
export const useSettledPathname = () => {
	const { pathname, status } = useRouterState({
		select: (state) => ({ pathname: state.location.pathname, status: state.status }),
	});
	const settled = useRef(pathname);
	if (status === "idle") settled.current = pathname;
	return settled.current;
};
