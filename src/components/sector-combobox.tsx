import { useState } from "react";
import {
	Combobox,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
} from "#/components/ui/combobox";

/**
 * Picks an existing sector or names a new one.
 *
 * A combobox only keeps values from its list: typed text that matches no item
 * is thrown away when the field loses focus. So text that is not already a
 * sector joins the list as a "New sector" option, and picking it (Enter does,
 * since the first match is highlighted) makes it the value.
 */
export function SectorCombobox({
	id,
	value,
	onChange,
	onBlur,
	sectors,
	placeholder = "Choose or type a sector",
}: {
	id?: string;
	value: string;
	onChange: (value: string) => void;
	onBlur?: () => void;
	sectors: string[];
	placeholder?: string;
}) {
	const [query, setQuery] = useState(value);
	const typed = query.trim();
	const matches = (sector: string) =>
		sector.toLowerCase() === typed.toLowerCase();
	// A new sector chosen earlier stays in the list so it still shows as chosen.
	const known =
		value && !sectors.some((sector) => sector === value)
			? [...sectors, value]
			: sectors;
	const isNew = typed !== "" && !known.some(matches);
	const items = isNew ? [...known, typed] : known;

	return (
		<Combobox
			items={items}
			value={value || null}
			onValueChange={(next) => onChange(next ?? "")}
			onInputValueChange={setQuery}
			itemToStringValue={(sector) => sector}
			autoHighlight
		>
			<ComboboxInput id={id} placeholder={placeholder} onBlur={onBlur} />
			<ComboboxContent>
				<ComboboxEmpty>Type a sector name to add it.</ComboboxEmpty>
				<ComboboxList>
					{(sector: string) => (
						<ComboboxItem key={sector} value={sector}>
							{isNew && sector === typed ? (
								<span>
									<span className="text-muted-foreground">New sector: </span>
									{sector}
								</span>
							) : (
								sector
							)}
						</ComboboxItem>
					)}
				</ComboboxList>
			</ComboboxContent>
		</Combobox>
	);
}
