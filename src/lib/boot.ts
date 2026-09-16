/**
 * Clears the splash in index.html once React has put something on screen.
 *
 * The splash and the Loading component draw the same mark, so the crossfade
 * between them is invisible; all this has to do is start the fade and then get
 * the element out of the way of clicks.
 */
export const dismissBootSplash = () => {
	const splash = document.getElementById("boot");
	if (!splash) return;
	splash.dataset.done = "";
	// Matches the fade in index.html.
	setTimeout(() => splash.remove(), 400);
};
