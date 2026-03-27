'use client';

import { motion } from 'framer-motion';
import { Gauge, Info, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCompactNumber, formatDateTime } from '@/lib/energy-monitoring';
import { cn } from '@/lib/utils';
import { useCallback, useEffect, useRef, useState } from 'react';
import { energyDashboardApi } from '@/lib/api';
import type { DateRange } from '@/components/electricity/detail/DateFilter';
import * as Tooltip from '@radix-ui/react-tooltip';
import { DataLoadingOverlay } from './DataLoadingOverlay';

interface RealtimePowerCardProps {
	scopeId: string;
	powerTotal: number;
	apparentTotal: number;
	capacityVa: number | null;
	isOffline: boolean;
	lastUpdated: string | null;
	refreshTick?: number;
	dateRange?: DateRange;
	dateRangeLabel?: string;
}

const f = (v: number, d = 2) => (Number.isFinite(v) ? v.toLocaleString('id-ID', { maximumFractionDigits: d }) : '-');

function KvarhTooltipContent({
	kvarh,
	kvarhLimit,
	penaltyKvarh,
	energyTotal,
	isOver,
}: {
	kvarh: number;
	kvarhLimit: number;
	penaltyKvarh: number;
	energyTotal: number;
	isOver: boolean;
}) {
	const actualPct = kvarhLimit > 0 ? (kvarh / kvarhLimit) * 100 : 0;
	const barPct = Math.min(actualPct, 100);

	return (
		<div className='w-80 rounded-xl overflow-hidden shadow-2xl border border-border bg-popover text-popover-foreground'>
			<div
				className={cn(
					'px-4 py-3 border-b border-border/40 flex items-center gap-2',
					isOver ? 'bg-rose-500 dark:bg-rose-600' : 'bg-blue-500 dark:bg-blue-600',
				)}
			>
				<Info className='w-4 h-4 text-white/80 shrink-0' />
				<p className='text-xs font-black uppercase tracking-widest text-white/80'>Detail kVARh</p>
			</div>

			<div className='px-4 py-4 space-y-4'>
				<div
					className={cn(
						'flex items-center gap-2 rounded-lg px-3 py-2.5',
						isOver
							? 'bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30'
							: 'bg-blue-50 dark:bg-blue-500/15 border border-blue-200 dark:border-blue-500/30',
					)}
				>
					{isOver ? (
						<AlertTriangle className='w-4 h-4 text-rose-500 shrink-0' />
					) : (
						<CheckCircle className='w-4 h-4 text-blue-500 shrink-0' />
					)}
					<p
						className={cn(
							'text-sm font-bold',
							isOver ? 'text-rose-600 dark:text-rose-400' : 'text-blue-600 dark:text-blue-400',
						)}
					>
						{isOver ? 'Melebihi batas PLN' : 'Dalam batas normal'}
					</p>
				</div>

				<div className='grid grid-cols-2 gap-2'>
					<div className='rounded-lg bg-muted/50 dark:bg-muted/30 px-3 py-2.5'>
						<p className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1'>
							kVARh Aktual
						</p>
						<p
							className={cn(
								'text-xl font-bold tabular-nums',
								isOver ? 'text-rose-500 dark:text-rose-400' : 'text-foreground',
							)}
						>
							{f(kvarh)}
						</p>
					</div>
					<div className='rounded-lg bg-muted/50 dark:bg-muted/30 px-3 py-2.5'>
						<p className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1'>
							Batas Maks
						</p>
						<p className='text-xl font-bold tabular-nums text-foreground'>{f(kvarhLimit)}</p>
					</div>
				</div>

				<div className='rounded-lg bg-muted/40 dark:bg-muted/20 px-4 py-3'>
					<p className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2'>
						Formula Batas PLN
					</p>
					<p className='text-sm text-foreground font-mono leading-relaxed'>
						0,62 &times; {f(energyTotal)} kWh
					</p>
					<p className='text-sm font-mono leading-relaxed'>
						<span className='text-muted-foreground'>= </span>
						<span className='font-bold text-foreground'>{f(kvarhLimit)} kVARh</span>
					</p>
				</div>

				<div>
					<div className='flex justify-between items-center mb-1.5'>
						<p className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
							Penggunaan
						</p>
						<p
							className={cn(
								'text-xs font-bold',
								isOver ? 'text-rose-500 dark:text-rose-400' : 'text-blue-500 dark:text-blue-400',
							)}
						>
							{actualPct.toFixed(1)}%
							{isOver && <span className='ml-1 text-muted-foreground font-normal'>(melebihi 100%)</span>}
						</p>
					</div>
					<div className='h-2.5 rounded-full bg-muted overflow-hidden'>
						<div
							className={cn(
								'h-full rounded-full transition-all duration-500',
								isOver ? 'bg-rose-500' : 'bg-blue-500',
							)}
							style={{ width: `${barPct}%` }}
						/>
					</div>
				</div>

				{isOver && (
					<div className='rounded-lg border border-rose-200 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-500/10 px-4 py-3 flex items-center justify-between gap-3'>
						<div>
							<p className='text-xs font-bold uppercase tracking-wider text-rose-500 dark:text-rose-400 mb-0.5'>
								Selisih Over
							</p>
							<p className='text-xs text-rose-400 dark:text-rose-500 leading-snug'>
								kVARh yang melebihi batas PLN
							</p>
						</div>
						<p className='text-2xl font-black tabular-nums text-rose-500 dark:text-rose-400 shrink-0'>
							+{f(penaltyKvarh)}
						</p>
					</div>
				)}
			</div>
		</div>
	);
}

function EnergyStatBox({
	label,
	value,
	unit,
	colorClass,
}: {
	label: string;
	value: number | null | undefined;
	unit: string;
	colorClass: string;
}) {
	const hasValue = value != null && Number.isFinite(value);
	return (
		<div
			className={cn(
				'rounded-lg border-2 flex flex-col items-center justify-center px-2 py-3 text-center',
				colorClass,
			)}
		>
			<p className='text-[10px] font-bold uppercase tracking-widest mb-1 opacity-80'>{label}</p>
			<p className='text-xl font-bold tabular-nums leading-tight'>
				{hasValue ? value!.toLocaleString('id-ID', { maximumFractionDigits: 3 }) : '–'}
			</p>
			<p className='text-[10px] font-semibold mt-0.5 opacity-70'>{unit}</p>
		</div>
	);
}

export function RealtimePowerCard({
	scopeId,
	powerTotal,
	apparentTotal,
	capacityVa,
	isOffline,
	lastUpdated,
	refreshTick,
	dateRange,
	dateRangeLabel,
}: RealtimePowerCardProps) {
	const [totalKwh, setTotalKwh] = useState<number | null>(null);
	const [totalKvarh, setTotalKvarh] = useState<number | null>(null);
	const [energyLoading, setEnergyLoading] = useState(true);

	const initialFetchDone = useRef(false);
	const prevDateRangeRef = useRef<string | undefined>(undefined);

	const fetchTotals = useCallback(
		async (showLoading = false) => {
			if (showLoading) setEnergyLoading(true);
			try {
				const from = dateRange?.from;
				const to = dateRange?.to;
				if (!from || !to) return;

				const res = await energyDashboardApi.getOutletDetail(scopeId, { from, to });
				if (!res.success || !res.data) return;

				const kwh = Number(
					(res.data as unknown as { analytics?: { totalEnergyKwh?: number } }).analytics?.totalEnergyKwh ?? 0,
				);
				const kvarh = Number(
					(res.data as unknown as { analytics?: { totalKvarhDelta?: number } }).analytics?.totalKvarhDelta ??
						0,
				);

				setTotalKwh(Number.isFinite(kwh) ? kwh : 0);
				setTotalKvarh(Number.isFinite(kvarh) ? kvarh : 0);
			} catch {
				// silent
			} finally {
				setEnergyLoading(false);
				initialFetchDone.current = true;
			}
		},
		[scopeId, dateRange?.from, dateRange?.to],
	);

	useEffect(() => {
		const rangeKey = `${dateRange?.from ?? ''}-${dateRange?.to ?? ''}`;
		if (rangeKey === prevDateRangeRef.current) return;
		prevDateRangeRef.current = rangeKey;
		initialFetchDone.current = false;
		void fetchTotals(true);
	}, [fetchTotals, dateRange?.from, dateRange?.to]);

	const prevTickRef = useRef<number | undefined>(undefined);
	useEffect(() => {
		if (refreshTick === undefined || refreshTick === prevTickRef.current) return;
		prevTickRef.current = refreshTick;
		if (!initialFetchDone.current) return;
		void fetchTotals(false);
	}, [refreshTick, fetchTotals]);

	const kvarhLimit = totalKwh !== null && totalKwh > 0 ? Number((0.62 * totalKwh).toFixed(2)) : null;
	const isOverKvarh = kvarhLimit !== null && totalKvarh !== null && totalKvarh > kvarhLimit;
	const penaltyKvarh =
		isOverKvarh && kvarhLimit !== null && totalKvarh !== null
			? Number(Math.max(0, totalKvarh - kvarhLimit).toFixed(2))
			: 0;

	const capacityKw = capacityVa ? capacityVa / 1000 : 100;
	const powerVa = apparentTotal;
	const gaugePct = capacityVa ? Math.min((powerVa / capacityVa) * 100, 100) : 0;
	const circumference = 2 * Math.PI * 76;
	const offset = circumference - (circumference * gaugePct) / 100;
	const gaugeColor = isOffline ? '#94a3b8' : gaugePct > 90 ? '#ef4444' : gaugePct > 70 ? '#f59e0b' : '#22c55e';
	const kwPct = Math.min((powerTotal / capacityKw) * 100, 100);

	return (
		<Tooltip.Provider delayDuration={200}>
			<Card className='border border-border/60 shadow-sm h-full gap-0 py-0 flex flex-col'>
				<CardHeader className='px-5 pt-5 pb-0 gap-0 shrink-0'>
					<CardTitle className='text-lg font-bold flex items-center justify-between'>
						<div className='flex items-center gap-2'>
							<motion.div
								animate={!isOffline ? { rotate: [0, 360] } : {}}
								transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
							>
								<Gauge className='h-5 w-5 text-emerald-500' />
							</motion.div>
							Daya Realtime
						</div>
						<Badge
							variant='outline'
							className={cn(
								'text-[10px] px-2 py-0.5 gap-1 font-semibold',
								isOffline
									? 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700'
									: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30',
							)}
						>
							<motion.span
								className={cn(
									'inline-block w-1.5 h-1.5 rounded-full',
									isOffline ? 'bg-slate-400' : 'bg-emerald-500',
								)}
								animate={!isOffline ? { scale: [1, 1.5, 1], opacity: [1, 0.5, 1] } : {}}
								transition={{ duration: 1.5, repeat: Infinity }}
							/>
							{isOffline ? 'OFFLINE' : 'ONLINE'}
						</Badge>
					</CardTitle>
				</CardHeader>

				<CardContent className='p-5 flex flex-col flex-1 gap-4'>
					<div className='flex justify-center'>
						<div className='relative'>
							<svg className='w-44 h-44 -rotate-90' viewBox='0 0 192 192'>
								<circle cx='96' cy='96' r='76' strokeWidth='13' fill='none' className='stroke-muted' />
								<motion.circle
									cx='96'
									cy='96'
									r='76'
									strokeWidth='13'
									fill='none'
									stroke={gaugeColor}
									strokeDasharray={circumference}
									strokeLinecap='round'
									initial={{ strokeDashoffset: circumference }}
									animate={{ strokeDashoffset: offset }}
									transition={{ duration: 0.8, ease: 'easeOut' }}
								/>
							</svg>
							<div className='absolute inset-0 flex flex-col items-center justify-center'>
								<motion.span
									className='text-3xl font-bold tabular-nums leading-none'
									key={Math.round(gaugePct)}
									initial={{ scale: 0.92, opacity: 0.6 }}
									animate={{ scale: 1, opacity: 1 }}
									transition={{ type: 'spring', stiffness: 300 }}
								>
									{Math.round(gaugePct)}%
								</motion.span>
								<span className='text-xs text-muted-foreground font-medium mt-1'>VA Usage</span>
							</div>
						</div>
					</div>

					<div className='rounded-lg border border-border/50 bg-card overflow-hidden'>
						<div className='px-3 py-1.5 border-b border-border/40 bg-muted/40 dark:bg-muted/20'>
							<p className='text-xs font-bold uppercase tracking-widest text-muted-foreground'>
								VA Usage
							</p>
						</div>
						<div className='px-3 py-2.5'>
							<div className='flex items-center justify-between mb-1.5'>
								<span className='text-xl font-bold tabular-nums text-foreground'>
									{formatCompactNumber(powerVa)} VA
								</span>
								<span className='text-sm text-muted-foreground'>
									/ {formatCompactNumber(capacityVa ?? 0)} VA
									<span className='ml-1 font-bold text-foreground'>({Math.round(gaugePct)}%)</span>
								</span>
							</div>
							<div className='h-2 rounded-full bg-muted/40 overflow-hidden'>
								<motion.div
									className={cn(
										'h-full rounded-full',
										gaugePct > 90
											? 'bg-red-500'
											: gaugePct > 70
												? 'bg-amber-500'
												: 'bg-emerald-500',
									)}
									initial={{ width: 0 }}
									animate={{ width: `${gaugePct}%` }}
									transition={{ duration: 0.8, ease: 'easeOut' }}
								/>
							</div>
						</div>
					</div>

					<div className='rounded-lg border border-border/50 bg-card overflow-hidden'>
						<div className='px-3 py-1.5 border-b border-border/40 bg-muted/40 dark:bg-muted/20'>
							<p className='text-xs font-bold uppercase tracking-widest text-muted-foreground'>
								Power (kW)
							</p>
						</div>
						<div className='px-3 py-2.5'>
							<div className='flex items-center justify-between mb-1.5'>
								<span className='text-xl font-bold tabular-nums text-foreground'>
									{f(powerTotal)} kW
								</span>
								<span className='text-sm text-muted-foreground'>
									/ {f(capacityKw)} kW
									<span className='ml-1 font-bold text-foreground'>({Math.round(kwPct)}%)</span>
								</span>
							</div>
							<div className='h-2 rounded-full bg-muted/40 overflow-hidden'>
								<motion.div
									className={cn(
										'h-full rounded-full',
										kwPct > 90 ? 'bg-red-500' : kwPct > 70 ? 'bg-amber-500' : 'bg-emerald-500',
									)}
									initial={{ width: 0 }}
									animate={{ width: `${kwPct}%` }}
									transition={{ duration: 0.8, ease: 'easeOut' }}
								/>
							</div>
						</div>
					</div>

					<div className='relative grid grid-cols-2 gap-1.5 flex-1 min-h-0'>
						<DataLoadingOverlay isLoading={energyLoading} label={dateRangeLabel} />

						<EnergyStatBox
							label='Total kWh'
							value={totalKwh}
							unit='kWh'
							colorClass='border-teal-500 bg-teal-500 text-white'
						/>

						<Tooltip.Root>
							<Tooltip.Trigger asChild>
								<div
									className={cn(
										'rounded-lg border-2 flex flex-col items-center justify-center px-2 py-3 text-center relative overflow-hidden cursor-help select-none',
										isOverKvarh ? 'border-rose-500 bg-rose-500' : 'border-blue-500 bg-blue-500',
									)}
								>
									{isOverKvarh ? (
										<span className='absolute top-1.5 right-1.5 flex items-center gap-1 text-[9px] font-black bg-white/25 text-white px-1.5 py-0.5 rounded-full leading-none'>
											OVER <Info className='w-2.5 h-2.5' />
										</span>
									) : (
										<span className='absolute top-1.5 right-1.5'>
											<Info className='w-3 h-3 text-white/40' />
										</span>
									)}

									<p className='text-white text-[10px] font-bold uppercase tracking-widest mb-1 opacity-80'>
										Total kVArh
									</p>

									{energyLoading && totalKvarh === null ? (
										<div className='h-7 w-20 rounded bg-white/20 animate-pulse' />
									) : (
										<p className='text-xl font-bold tabular-nums text-white leading-tight'>
											{totalKvarh !== null
												? totalKvarh.toLocaleString('id-ID', { maximumFractionDigits: 3 })
												: '–'}
										</p>
									)}

									<p className='text-white text-[10px] font-semibold mt-0.5 opacity-70'>kVArh</p>
								</div>
							</Tooltip.Trigger>

							<Tooltip.Portal>
								<Tooltip.Content side='top' align='center' sideOffset={8} className='z-50'>
									<KvarhTooltipContent
										kvarh={totalKvarh ?? 0}
										kvarhLimit={kvarhLimit ?? 0}
										penaltyKvarh={penaltyKvarh}
										energyTotal={totalKwh ?? 0}
										isOver={isOverKvarh}
									/>
									<Tooltip.Arrow
										className={cn(
											isOverKvarh
												? 'fill-rose-500 dark:fill-rose-600'
												: 'fill-blue-500 dark:fill-blue-600',
										)}
									/>
								</Tooltip.Content>
							</Tooltip.Portal>
						</Tooltip.Root>
					</div>

					{lastUpdated && (
						<p className='text-xs text-muted-foreground text-center'>
							Updated {formatDateTime(lastUpdated)}
						</p>
					)}
				</CardContent>
			</Card>
		</Tooltip.Provider>
	);
}
