import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { getAllStocks } from "#/api/stocks";
export const Route = createFileRoute("/_admin/stocks")({
	component: RouteComponent,
});

function RouteComponent() {
	const stocks = useQuery({
		queryKey: ["stocks"],
		queryFn: getAllStocks,
	});

	return <div>Hello "/_admin/stocks"!</div>;
}
