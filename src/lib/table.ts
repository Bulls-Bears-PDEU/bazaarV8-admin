import {
	columnVisibilityFeature,
	createSortedRowModel,
	rowSelectionFeature,
	rowSortingFeature,
	sortFn_alphanumeric,
	sortFn_basic,
	sortFn_datetime,
	sortFn_text,
	tableFeatures,
} from "@tanstack/react-table";

/**
 * Table v9 no longer bundles every feature, so each table declares what it
 * uses. The admin tables all want the same three — sorting, row selection and
 * column visibility — so they share one registration and one set of generics.
 */
export const adminTableFeatures = tableFeatures({
	rowSortingFeature,
	rowSelectionFeature,
	// getVisibleCells() lives behind this one.
	columnVisibilityFeature,
	sortedRowModel: createSortedRowModel(),
	sortFns: {
		alphanumeric: sortFn_alphanumeric,
		basic: sortFn_basic,
		datetime: sortFn_datetime,
		text: sortFn_text,
	},
});

export type AdminTableFeatures = typeof adminTableFeatures;
