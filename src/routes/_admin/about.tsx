import { createFileRoute } from "@tanstack/react-router";
import { AboutContent } from "#/components/about-content";

export const Route = createFileRoute("/_admin/about")({
	component: AboutContent,
});
