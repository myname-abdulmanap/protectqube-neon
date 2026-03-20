'use client';

import { motion } from 'framer-motion';
import { Gauge } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCompactNumber, formatDateTime } from '@/lib/energy-monitoring';
import { cn } from '@/lib/utils';
import { useCallback, useEffect, useRef, useState } from 'react';
import { deviceMetricsApi } from '@/lib/api';

interface RealtimePowerCardProps {
	scopeId: string;
	powerTotal: number;
	apparentTotal: number;
	capacityVa: number | null;
	isOffline: boolean;
	lastUpdated: string | null;
	refreshTick?: number;
}

const f = (v: number, d = 2) => (Number.isFinite(v) ? v.toLocaleString('id-ID', { maximumFractionDigits: d }) : '-');

const DISPLAY_TIMEZONE = 'Asia/Jakarta';

function getWibDayStart(daysAgo = 0): Date {
	const now = new Date();
	const wibStr = new Intl.DateTimeFormat('en-CA', {
		timeZone: DISPLAY_TIMEZONE,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	}).format(now);
	const todayMidnight = new Date(`${wibStr}T00:00:00+07:00`);
	return new Date(todayMidnight.getTime() - daysAgo * 24 * 60 * 60 * 1000);
}

async function fetchEnergyKwh(scopeId: string, from: Date, to: Date): Promise<number> {
	try {
		const rangeMs = to.getTime() - from.getTime();
		const isLongRange = rangeMs > 2 * 24 * 60 * 60 * 1000;
		const interval = isLongRange ? 'day' : 'hour';

		const anchorOffset = isLongRange ? 2 * 24 * 60 * 60 * 1000 : 25 * 60 * 60 * 1000;
		const anchorFrom = new Date(from.getTime() - anchorOffset);

		const res = await deviceMetricsApi.getAggregated({
			scopeId,
			moduleType: 'power_meter',
			from: anchorFrom.toISOString(),
			to: to.toISOString(),
			interval,
		});

		if (!res.success || !res.data?.length) return 0;

		const energyRows = res.data.filter((r) => r.metricKey === 'energy_total');
		if (!energyRows.length) return 0;

		const fromMs = from.getTime();
		const toMs = to.getTime();

		const slotMap = new Map<string, number>();
		for (const row of energyRows) {
			const ts = new Date(row.timestamp);
			if (isNaN(ts.getTime())) continue;
			const slotKey = isLongRange
				? new Date(ts.getFullYear(), ts.getMonth(), ts.getDate()).toISOString()
				: new Date(ts.getFullYear(), ts.getMonth(), ts.getDate(), ts.getHours()).toISOString();
			const val = Math.max(Number(row.max ?? row.avg ?? 0));
			const cur = slotMap.get(slotKey);
			if (cur === undefined || val > cur) slotMap.set(slotKey, val);
		}

		if (!slotMap.size) return 0;

		const sortedSlots = Array.from(slotMap.entries()).sort(([a], [b]) => a.localeCompare(b));
		const beforeRange: number[] = [];
		const inRange: number[] = [];

		for (const [slotKey, val] of sortedSlots) {
			const slotMs = new Date(slotKey).getTime();
			if (slotMs < fromMs) {
				beforeRange.push(val);
			} else if (slotMs <= toMs) {
				inRange.push(val);
			}
		}

		if (!inRange.length) return 0;

		const peak = Math.max(...inRange);
		const baseline = beforeRange.length > 0 ? beforeRange[beforeRange.length - 1]! : inRange[0]!;

		const delta = peak - baseline;
		return Number(Math.max(0, delta).toFixed(2));
	} catch {
		return 0;
	}
}

function EnergyStatBox({
	label,
	value,
	loading,
	color,
}: {
	label: string;
	value: number | null | undefined;
	loading: boolean;
	color: string;
}) {
	const hasValue = value != null && Number.isFinite(value);
	return (
		<div
			className={cn('rounded-lg border-2 flex flex-col items-center justify-center px-2 py-3 text-center', color)}
		>
			<p className='text-[10px] font-bold uppercase tracking-widest mb-1 opacity-80'>{label}</p>
			{loading && !hasValue ? (
				<div className='h-7 w-14 rounded bg-white/20 animate-pulse' />
			) : (
				<p className='text-xl font-bold tabular-nums leading-tight'>
					{hasValue ? value!.toLocaleString('id-ID', { maximumFractionDigits: 2 }) : '–'}
				</p>
			)}
			<p className='text-[10px] font-semibold mt-0.5 opacity-70'>kWh</p>
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
}: RealtimePowerCardProps) {
	const [energyToday, setEnergyToday] = useState<number | null>(null);
	const [energyWeek, setEnergyWeek] = useState<number | null>(null);
	const [energyMonth, setEnergyMonth] = useState<number | null>(null);
	const [kwhLoading, setKwhLoading] = useState(true);

	const initialFetchDone = useRef(false);

	const fetchKwh = useCallback(
		async (showLoading = false) => {
			if (showLoading) setKwhLoading(true);
			try {
				const now = new Date();
				const todayStart = getWibDayStart(0);
				const weekStart = getWibDayStart(7);
				const monthStart = getWibDayStart(30);

				const [today, week, month] = await Promise.all([
					fetchEnergyKwh(scopeId, todayStart, now),
					fetchEnergyKwh(scopeId, weekStart, now),
					fetchEnergyKwh(scopeId, monthStart, now),
				]);

				setEnergyToday(today);
				setEnergyWeek(week);
				setEnergyMonth(month);
			} catch {
			} finally {
				setKwhLoading(false);
				initialFetchDone.current = true;
			}
		},
		[scopeId],
	);

	useEffect(() => {
		initialFetchDone.current = false;
		void fetchKwh(true);
	}, [fetchKwh]);

	const prevTickRef = useRef<number | undefined>(undefined);
	useEffect(() => {
		if (refreshTick === undefined || refreshTick === prevTickRef.current) return;
		prevTickRef.current = refreshTick;
		if (!initialFetchDone.current) return;
		void fetchKwh(false);
	}, [refreshTick, fetchKwh]);

	useEffect(() => {
		const id = setInterval(() => void fetchKwh(false), 5 * 60 * 1000);
		return () => clearInterval(id);
	}, [fetchKwh]);

	const capacityKw = capacityVa ? capacityVa / 1000 : 100;
	const powerVa = apparentTotal;
	const gaugePct = capacityVa ? Math.min((powerVa / capacityVa) * 100, 100) : 0;
	const circumference = 2 * Math.PI * 76;
	const offset = circumference - (circumference * gaugePct) / 100;
	const gaugeColor = isOffline ? '#94a3b8' : gaugePct > 90 ? '#ef4444' : gaugePct > 70 ? '#f59e0b' : '#22c55e';
	const kwPct = Math.min((powerTotal / capacityKw) * 100, 100);

	return (
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
						<p className='text-xs font-bold uppercase tracking-widest text-muted-foreground'>VA Usage</p>
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
									gaugePct > 90 ? 'bg-red-500' : gaugePct > 70 ? 'bg-amber-500' : 'bg-emerald-500',
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
						<p className='text-xs font-bold uppercase tracking-widest text-muted-foreground'>Power (kW)</p>
					</div>
					<div className='px-3 py-2.5'>
						<div className='flex items-center justify-between mb-1.5'>
							<span className='text-xl font-bold tabular-nums text-foreground'>{f(powerTotal)} kW</span>
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

				<div className='grid grid-cols-3 gap-1.5 flex-1 min-h-0'>
					<EnergyStatBox
						label='Today'
						value={energyToday}
						loading={kwhLoading}
						color='border-teal-500 bg-teal-500 text-white'
					/>
					<EnergyStatBox
						label='7 Days'
						value={energyWeek}
						loading={kwhLoading}
						color='border-blue-500 bg-blue-500 text-white'
					/>
					<EnergyStatBox
						label='30 Days'
						value={energyMonth}
						loading={kwhLoading}
						color='border-purple-500 bg-purple-500 text-white'
					/>
				</div>

				{lastUpdated && (
					<p className='text-xs text-muted-foreground text-center'>Updated {formatDateTime(lastUpdated)}</p>
				)}
			</CardContent>
		</Card>
	);
}
