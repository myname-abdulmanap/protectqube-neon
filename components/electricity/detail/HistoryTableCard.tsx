'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { History, ChevronLeft, ChevronRight, Loader2, ServerCrash, Search, X } from 'lucide-react';
import { energyDashboardApi, type HistoryRow } from '@/lib/api';
import type { DateRange } from '@/components/electricity/detail/DateFilter';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 400;

const COLS: Array<{
	key: keyof HistoryRow | 'timestamp';
	label: string;
	highlight?: boolean;
	align?: 'right';
	unit?: string;
}> = [
	{ key: 'timestamp', label: 'Time' },
	{ key: 'voltage_l1', label: 'Voltage R', unit: 'V', align: 'right' },
	{ key: 'voltage_l2', label: 'Voltage S', unit: 'V', align: 'right' },
	{ key: 'voltage_l3', label: 'Voltage T', unit: 'V', align: 'right' },
	{ key: 'current_l1', label: 'Current R', unit: 'A', align: 'right' },
	{ key: 'current_l2', label: 'Current S', unit: 'A', align: 'right' },
	{ key: 'current_l3', label: 'Current T', unit: 'A', align: 'right' },
	{ key: 'current_total', label: 'Total Current', unit: 'A', align: 'right' },
	{ key: 'power_l1', label: 'Power R', unit: 'kW', align: 'right' },
	{ key: 'power_l2', label: 'Power S', unit: 'kW', align: 'right' },
	{ key: 'power_l3', label: 'Power T', unit: 'kW', align: 'right' },
	{ key: 'power_total', label: 'Total Power', unit: 'kW', align: 'right' },
	{ key: 'energy_total', label: 'Energy', unit: 'kWh', align: 'right', highlight: true },
	{ key: 'pf_sigma', label: 'Power Factor', align: 'right' },
];

const fmtTs = (ts: string) => {
	try {
		const d = new Date(ts);
		const day = String(d.getDate()).padStart(2, '0');
		const mon = d.toLocaleString('en-GB', { month: 'short' });
		const hh = String(d.getHours()).padStart(2, '0');
		const mm = String(d.getMinutes()).padStart(2, '0');
		return `${day} ${mon} ${hh}:${mm}`;
	} catch {
		return ts;
	}
};

const fmtVal = (v: number | null | undefined) => {
	if (v == null) return <span className='text-muted-foreground/30'>—</span>;
	return v.toLocaleString('id-ID', { maximumFractionDigits: 2 });
};

interface HistoryTableCardProps {
	scopeId: string;
	dateRange: DateRange;
	dataLoading?: boolean;
}

interface PageState {
	rows: HistoryRow[];
	nextCursor: string | null;
	total: number | null;
}

export function HistoryTableCard({ scopeId, dateRange, dataLoading = false }: HistoryTableCardProps) {
	const [cursorStack, setCursorStack] = useState<Array<string | null>>([null]);
	const [currentPageIdx, setCurrentPageIdx] = useState(0);
	const [pageState, setPageState] = useState<PageState>({ rows: [], nextCursor: null, total: null });

	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const [searchInput, setSearchInput] = useState('');
	const [searchQuery, setSearchQuery] = useState('');
	const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const lastRangeKey = useRef('');

	const fetchPage = useCallback(
		async (cursor: string | null, search: string) => {
			setLoading(true);
			setError(null);
			try {
				const res = await energyDashboardApi.getOutletHistory(scopeId, {
					from: dateRange.from,
					to: dateRange.to,
					cursor: cursor ?? undefined,
					pageSize: PAGE_SIZE,
					...(search.trim() ? { search: search.trim() } : {}),
				});
				if (!res.success || !res.data) {
					setError(res.error ?? 'Failed to load history');
					return;
				}
				setPageState({ rows: res.data.rows, nextCursor: res.data.nextCursor, total: res.data.total });
			} catch (e) {
				setError(e instanceof Error ? e.message : 'Error loading history');
			} finally {
				setLoading(false);
			}
		},
		[scopeId, dateRange.from, dateRange.to],
	);

	useEffect(() => {
		if (dateRange.preset === 'custom' && (!dateRange.from || !dateRange.to)) return;
		const rangeKey = `${dateRange.from}__${dateRange.to}`;
		if (rangeKey === lastRangeKey.current) return;
		lastRangeKey.current = rangeKey;
		setCursorStack([null]);
		setCurrentPageIdx(0);
		setSearchInput('');
		setSearchQuery('');
		void fetchPage(null, '');
	}, [dateRange, fetchPage]);

	useEffect(() => {
		setCursorStack([null]);
		setCurrentPageIdx(0);
		void fetchPage(null, searchQuery);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [searchQuery]);

	const handleSearchChange = (value: string) => {
		setSearchInput(value);
		if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
		debounceTimerRef.current = setTimeout(() => {
			setSearchQuery(value);
		}, SEARCH_DEBOUNCE_MS);
	};

	const handleSearchClear = () => {
		if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
		setSearchInput('');
		setSearchQuery('');
	};

	const handleNext = () => {
		if (!pageState.nextCursor) return;
		const nextIdx = currentPageIdx + 1;
		setCursorStack([...cursorStack.slice(0, nextIdx + 1), pageState.nextCursor]);
		setCurrentPageIdx(nextIdx);
		void fetchPage(pageState.nextCursor, searchQuery);
	};

	const handlePrev = () => {
		if (currentPageIdx <= 0) return;
		const prevIdx = currentPageIdx - 1;
		setCurrentPageIdx(prevIdx);
		void fetchPage(cursorStack[prevIdx] ?? null, searchQuery);
	};

	const isSearchActive = searchQuery.trim().length > 0;
	const isTyping = searchInput !== searchQuery;

	const currentPage = currentPageIdx + 1;
	const hasNext = !!pageState.nextCursor;
	const hasPrev = currentPageIdx > 0;
	const totalLabel = pageState.total ? `${pageState.total.toLocaleString('id-ID')} records` : '';

	return (
		<Card className='border border-border/60 shadow-sm h-full lg:col-span-2 gap-0 py-0 flex flex-col'>
			<CardHeader className='px-5 pt-5 pb-0 flex flex-row items-center justify-between flex-wrap gap-2'>
				<CardTitle className='text-base font-bold flex items-center gap-2'>
					<History className='h-5 w-5 text-slate-400' />
					History
					{!isSearchActive && totalLabel && (
						<span className='text-sm font-normal text-muted-foreground'>({totalLabel})</span>
					)}
					{isSearchActive && pageState.total != null && !loading && (
						<span className='text-sm font-normal text-muted-foreground'>
							({pageState.total.toLocaleString('id-ID')} records)
						</span>
					)}
				</CardTitle>
				<div className='flex items-center gap-2'>
					{(loading || isTyping) && !dataLoading && (
						<div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
							<Loader2 className='h-3.5 w-3.5 animate-spin' />
							{isTyping && !loading ? 'Mengetik...' : 'Loading...'}
						</div>
					)}
					<div className='relative'>
						<Search className='absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none' />
						<Input
							className='pl-8 pr-8 h-8 text-sm w-48 bg-muted/30 border-border/50 focus:w-64 transition-all'
							placeholder='Cari data...'
							value={searchInput}
							onChange={(e) => handleSearchChange(e.target.value)}
						/>
						{searchInput && (
							<button
								onClick={handleSearchClear}
								className='absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground'
							>
								<X className='h-3.5 w-3.5' />
							</button>
						)}
					</div>
				</div>
			</CardHeader>

			<CardContent className='p-5 flex flex-col flex-1 gap-4'>
				{error && !loading && (
					<div className='flex flex-col items-center justify-center py-10 gap-3 text-destructive'>
						<ServerCrash className='h-8 w-8 opacity-60' />
						<p className='text-sm'>{error}</p>
						<Button
							variant='outline'
							size='sm'
							onClick={() => void fetchPage(cursorStack[currentPageIdx] ?? null, searchQuery)}
						>
							Retry
						</Button>
					</div>
				)}

				{!error && (
					<div className='rounded-xl border border-border/40 overflow-x-auto'>
						<Table className='text-sm min-w-max'>
							<TableHeader>
								<TableRow className='bg-muted/20 hover:bg-muted/20'>
									{COLS.map((c) => (
										<TableHead
											key={c.key}
											className={cn(
												'text-xs font-semibold h-9 px-3 whitespace-nowrap',
												c.align === 'right' && 'text-right',
												c.highlight && 'text-orange-500',
											)}
										>
											{c.label}
											{c.unit && (
												<span className='ml-1 font-normal text-muted-foreground/60'>
													({c.unit})
												</span>
											)}
										</TableHead>
									))}
								</TableRow>
							</TableHeader>

							<TableBody>
								{loading &&
									Array.from({ length: PAGE_SIZE }).map((_, i) => (
										<TableRow key={`sk-${i}`} className='animate-pulse border-border/20'>
											{COLS.map((c) => (
												<TableCell key={c.key} className='px-3 py-2'>
													<div className='h-3 bg-muted/50 rounded w-14' />
												</TableCell>
											))}
										</TableRow>
									))}

								{!loading && pageState.rows.length === 0 && (
									<TableRow>
										<TableCell
											colSpan={COLS.length}
											className='text-center text-sm text-muted-foreground py-10'
										>
											{isSearchActive
												? `Tidak ada data yang cocok dengan "${searchQuery}"`
												: 'No data for this period'}
										</TableCell>
									</TableRow>
								)}

								{!loading &&
									pageState.rows.map((row, i) => (
										<TableRow
											key={`${row.timestamp}-${i}`}
											className='hover:bg-muted/10 transition-colors border-border/20'
										>
											{COLS.map((c) => (
												<TableCell
													key={c.key}
													className={cn(
														'px-3 py-1.5 tabular-nums whitespace-nowrap',
														c.align === 'right' && 'text-right',
														c.highlight && 'text-orange-500 font-medium',
													)}
												>
													{c.key === 'timestamp'
														? fmtTs(row.timestamp)
														: fmtVal(row[c.key as keyof HistoryRow] as number | null)}
												</TableCell>
											))}
										</TableRow>
									))}
							</TableBody>
						</Table>
					</div>
				)}

				<div className='flex items-center justify-between mt-3'>
					<span className='text-sm text-muted-foreground'>
						Page {currentPage}
						{pageState.rows.length > 0 && !loading && (
							<span className='ml-1 text-muted-foreground/60'>
								· {PAGE_SIZE * (currentPage - 1) + 1}–
								{PAGE_SIZE * (currentPage - 1) + pageState.rows.length} rows
								{isSearchActive && ' (filtered)'}
							</span>
						)}
					</span>
					<div className='flex items-center gap-1.5'>
						<Button
							type='button'
							variant='outline'
							size='icon'
							className='h-8 w-8 cursor-pointer disabled:cursor-not-allowed'
							disabled={!hasPrev || loading}
							onClick={handlePrev}
						>
							<ChevronLeft className='h-4 w-4' />
						</Button>
						<Button
							type='button'
							variant='outline'
							size='icon'
							className='h-8 w-8 cursor-pointer disabled:cursor-not-allowed'
							disabled={!hasNext || loading}
							onClick={handleNext}
						>
							<ChevronRight className='h-4 w-4' />
						</Button>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
