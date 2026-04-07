import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ArrowRight, Dot, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "#/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "#/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group";
import { authClient } from "#/lib/auth-client";

export const Route = createFileRoute("/_admin/market")({
	component: RouteComponent,
});

function RouteComponent() {
	const activeSessions = useQuery({
		queryKey: ["activeSessions"],
		queryFn: async () => {
			const res = await authClient.listSessions();
			return res;
		},
	});
	return (
		<div className="p-4 w-full h-full">
			<h1 className="text-2xl font-bold mb-4">Market</h1>
			<Field>
				<FieldLabel>Pause Market</FieldLabel>
				<FieldDescription>
					Pause the market to prevent any new trades from being executed.
				</FieldDescription>

				<Button variant="destructive" size="lg">
					Pause Market <ArrowRight className="size-4" />
				</Button>
			</Field>

			<Field className="mt-6">
				<FieldLabel>Market Sentiment</FieldLabel>
				<FieldDescription>
					Select the current market sentiment based on your analysis.
				</FieldDescription>
				<ToggleGroup type="single" variant="outline" spacing={2} size="lg">
					<ToggleGroupItem
						value="bullish"
						aria-label="Bullish"
						className="flex size-16 flex-col items-center justify-center rounded-xl data-[state=on]:bg-green-500 data-[state=on]:text-white"
					>
						<TrendingUp />
						Bullish
					</ToggleGroupItem>
					<ToggleGroupItem
						value="bearish"
						aria-label="Bearish"
						className="flex size-16 flex-col items-center justify-center rounded-xl data-[state=on]:bg-red-500 data-[state=on]:text-white"
						color="red"
					>
						<TrendingDown />
						Bearish
					</ToggleGroupItem>
					<ToggleGroupItem
						value="neutral"
						aria-label="Neutral"
						variant="outline"
						className="flex size-16 flex-col items-center justify-center rounded-xl data-[state=on]:bg-gray-500 data-[state=on]:text-white"
					>
						<Dot />
						Neutral
					</ToggleGroupItem>
				</ToggleGroup>
			</Field>

			<div className="mt-6">
				<FieldLabel>Active Users</FieldLabel>
				<FieldDescription>
					Monitor the number of active users on the platform in real-time.
				</FieldDescription>
				<div className="flex items-center space-x-4 mt-2">
					<span className="text-lg font-medium">
						{activeSessions.data?.data?.length ?? 0} Active Users
					</span>
					<div>
						{activeSessions.data?.data?.map((session) => (
							<div key={session.id} className="text-sm text-gray-500">
								{session.userId} -{" "}
								{new Date(session.createdAt).toLocaleTimeString()}
							</div>
						))}
					</div>
					<Button
						variant="outline"
						size="sm"
						onClick={() => activeSessions.refetch()}
					>
						Refresh
					</Button>
				</div>
			</div>
		</div>
	);
}
