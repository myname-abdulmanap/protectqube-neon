'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { History, ChevronLeft, ChevronRight, Loader2, ServerCrash } from 'lucide-react';
import { energyDashboardApi, type HistoryRow } from '@/lib/api';
import type { DateRange } from '@/components/electricity/detail/DateFilter';
import { cn } from '@/lib/utils';
import { fmtTs, fmtVal, HistoryColumn } from '@/app/dashboard/electricity/[scopeId]/page';

interface HistoryTableCardProps {
	columns: HistoryColumn[];
	scopeId: string;
	dateRange: DateRange;
	dataLoading?: boolean;
}

const PAGE_SIZE = 20;

export function HistoryTableCard({ columns, scopeId, dateRange, dataLoading = false }: HistoryTableCardProps) {
	const [rows, setRows] = useState<HistoryRow[]>([]);
	const [nextCursor, setNextCursor] = useState<string | null>(null);
	const [total, setTotal] = useState<number | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [cursorStack, setCursorStack] = useState<Array<string | null>>([null]);
	const [pageIdx, setPageIdx] = useState(0);
	const lastRangeKey = useRef('');

	const fetchPage = useCallback(
		async (cursor: string | null) => {
			if (dateRange.preset === 'custom' && (!dateRange.from || !dateRange.to)) return;
			setLoading(true);
			setError(null);
			try {
				const res = await energyDashboardApi.getOutletHistory(scopeId, {
					from: dateRange.from,
					to: dateRange.to,
					cursor: cursor ?? undefined,
					pageSize: PAGE_SIZE,
				});
				if (!res.success || !res.data) {
					setError(res.error ?? 'Failed to load history');
					return;
				}
				setRows(res.data.rows);
				setNextCursor(res.data.nextCursor);
				setTotal(res.data.total);
			} catch (e) {
				setError(e instanceof Error ? e.message : 'Error loading history');
			} finally {
				setLoading(false);
			}
		},
		[scopeId, dateRange],
	);

	useEffect(() => {
		if (dateRange.preset === 'custom' && (!dateRange.from || !dateRange.to)) return;

		const rangeKey = `${dateRange.from}__${dateRange.to}`;
		if (rangeKey === lastRangeKey.current) return;
		lastRangeKey.current = rangeKey;

		setCursorStack([null]);
		setPageIdx(0);

		void fetchPage(null);
	}, [dateRange, fetchPage]);

	const handleNext = () => {
		if (!nextCursor) return;
		const nextIdx = pageIdx + 1;
		setCursorStack([...cursorStack.slice(0, nextIdx + 1), nextCursor]);
		setPageIdx(nextIdx);
		void fetchPage(nextCursor);
	};

	const handlePrev = () => {
		if (pageIdx <= 0) return;
		const prevIdx = pageIdx - 1;
		setPageIdx(prevIdx);
		void fetchPage(cursorStack[prevIdx] ?? null);
	};

	const handleRetry = () => {
		void fetchPage(cursorStack[pageIdx] ?? null);
	};

	const totalLabel = total ? `${total.toLocaleString('en-US')} records` : '';
	const currentPage = pageIdx + 1;
	const hasNext = !!nextCursor;
	const hasPrev = pageIdx > 0;

	return (
		<Card className='border-0 shadow-sm'>
			<CardHeader className='px-5 py-4 pb-0 flex flex-row items-center justify-between flex-wrap gap-3'>
				<CardTitle className='text-base font-semibold flex items-center gap-2'>
					<History className='h-5 w-5 text-slate-400' />
					History
					{totalLabel && <span className='text-sm font-normal text-muted-foreground'>({totalLabel})</span>}
				</CardTitle>
				{loading && !dataLoading && (
					<div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
						<Loader2 className='h-3.5 w-3.5 animate-spin' />
						Loading...
					</div>
				)}
			</CardHeader>

			<CardContent className='p-4 pt-3'>
				{error && !loading && (
					<div className='flex flex-col items-center justify-center py-10 gap-3 text-destructive'>
						<ServerCrash className='h-8 w-8 opacity-60' />
						<p className='text-sm'>{error}</p>
						<Button variant='outline' size='sm' onClick={handleRetry}>
							Retry
						</Button>
					</div>
				)}

				{!error && (
					<div className='rounded-xl border border-border/40 overflow-x-auto'>
						<Table className='text-sm min-w-max'>
							<TableHeader>
								<TableRow className='bg-muted/20 hover:bg-muted/20'>
									{columns.map((c) => (
										<TableHead
											key={c.key}
											className={cn(
												'text-xs font-semibold h-8 px-3 whitespace-nowrap',
												c.align === 'right' && 'text-right',
												c.highlight && 'text-orange-500',
											)}
										>
											{c.label}
										</TableHead>
									))}
								</TableRow>
							</TableHeader>

							<TableBody>
								{loading &&
									Array.from({ length: PAGE_SIZE }).map((_, i) => (
										<TableRow key={`sk-${i}`} className='animate-pulse border-border/20'>
											{columns.map((c) => (
												<TableCell key={c.key} className='px-3 py-2'>
													<div className='h-3 bg-muted/50 rounded w-14' />
												</TableCell>
											))}
										</TableRow>
									))}

								{!loading && rows.length === 0 && (
									<TableRow>
										<TableCell
											colSpan={columns.length}
											className='text-center text-sm text-muted-foreground py-10'
										>
											No data for this period
										</TableCell>
									</TableRow>
								)}

								{!loading &&
									rows.map((row, i) => (
										<TableRow
											key={`${row.timestamp}-${i}`}
											className='hover:bg-muted/10 transition-colors border-border/20'
										>
											{columns.map((c) => (
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
						{rows.length > 0 && !loading && (
							<span className='ml-1 text-muted-foreground/60'>
								· {PAGE_SIZE * (currentPage - 1) + 1}–{PAGE_SIZE * (currentPage - 1) + rows.length} rows
							</span>
						)}
					</span>
					<div className='flex items-center gap-1.5'>
						<Button
							variant='outline'
							size='icon'
							className='h-8 w-8'
							disabled={!hasPrev || loading}
							onClick={handlePrev}
						>
							<ChevronLeft className='h-4 w-4' />
						</Button>
						<Button
							variant='outline'
							size='icon'
							className='h-8 w-8'
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
