'use client';

import { useMemo, useRef, useState } from 'react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { OutletDetailPayload } from '@/app/dashboard/electricity/[scopeId]/page';
import { TrendingUp } from 'lucide-react';

type TrendMetric = 'energy' | 'power' | 'voltage' | 'current';

const METRIC_CFG: Record<TrendMetric, { key: string; color: string; label: string; unit: string }> = {
	energy: { key: 'energy_total', color: '#f97316', label: 'Energy', unit: 'kWh' },
	power: { key: 'power_total', color: '#3b82f6', label: 'Power', unit: 'kW' },
	voltage: { key: 'voltage_l1', color: '#22c55e', label: 'Voltage', unit: 'V' },
	current: { key: 'current_total', color: '#a855f7', label: 'Current', unit: 'A' },
};

interface ChartPoint {
	label: string;
	value: number;
	hasData: boolean;
}

export interface TrendChartCardProps {
	timeSeries: OutletDetailPayload['timeSeries'];
	analytics: OutletDetailPayload['analytics'];
	loadedFrom: string;
	loadedTo: string;
}

const PER_HOUR_THRESHOLD_MS = 2 * 24 * 60 * 60 * 1000;
const MIN_PX_PER_POINT = 28;

function generateHourSlots(fromIso: string, toIso: string): Array<{ key: string; label: string }> {
	const slots: Array<{ key: string; label: string }> = [];

	const cursor = new Date(fromIso);
	cursor.setMinutes(0, 0, 0);

	const end = new Date(toIso);

	const spansDays =
		cursor.getDate() !== end.getDate() ||
		cursor.getMonth() !== end.getMonth() ||
		cursor.getFullYear() !== end.getFullYear();

	while (cursor <= end) {
		const y = cursor.getFullYear();
		const mo = String(cursor.getMonth() + 1).padStart(2, '0');
		const d = String(cursor.getDate()).padStart(2, '0');
		const hh = String(cursor.getHours()).padStart(2, '0');
		const key = `${y}-${mo}-${d} ${hh}`;

		const label = spansDays
			? `${cursor.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })} ${hh}:00`
			: `${hh}:00`;

		slots.push({ key, label });
		cursor.setHours(cursor.getHours() + 1);
	}

	return slots;
}

function generateDaySlots(fromIso: string, toIso: string): Array<{ key: string; label: string }> {
	const slots: Array<{ key: string; label: string }> = [];

	const cursor = new Date(fromIso);
	cursor.setHours(0, 0, 0, 0);

	const end = new Date(toIso);
	end.setHours(23, 59, 59, 999);

	while (cursor <= end) {
		const y = cursor.getFullYear();
		const mo = String(cursor.getMonth() + 1).padStart(2, '0');
		const d = String(cursor.getDate()).padStart(2, '0');
		slots.push({
			key: `${y}-${mo}-${d}`,
			label: cursor.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
		});
		cursor.setDate(cursor.getDate() + 1);
	}

	return slots;
}

function aggregateSeries(
	rows: OutletDetailPayload['timeSeries'],
	metricKey: string,
	fromIso: string,
	toIso: string,
): ChartPoint[] {
	if (!fromIso || !toIso) return [];

	const perHour = new Date(toIso).getTime() - new Date(fromIso).getTime() <= PER_HOUR_THRESHOLD_MS;
	const buckets = new Map<string, { sum: number; count: number }>();

	for (const r of rows) {
		if (r.metricKey !== metricKey) continue;
		const d = new Date(r.timestamp);
		const y = d.getFullYear();
		const mo = String(d.getMonth() + 1).padStart(2, '0');
		const dd = String(d.getDate()).padStart(2, '0');
		const hh = String(d.getHours()).padStart(2, '0');

		const key = perHour ? `${y}-${mo}-${dd} ${hh}` : `${y}-${mo}-${dd}`;

		const cur = buckets.get(key) ?? { sum: 0, count: 0 };
		cur.sum += r.metricValue;
		cur.count += 1;
		buckets.set(key, cur);
	}

	const slots = perHour ? generateHourSlots(fromIso, toIso) : generateDaySlots(fromIso, toIso);
	return slots.map(({ key, label }) => {
		const b = buckets.get(key);
		return {
			label,
			value: b ? Number((b.sum / b.count).toFixed(2)) : 0,
			hasData: !!b,
		};
	});
}

export function TrendChartCard({ timeSeries, analytics, loadedFrom, loadedTo }: TrendChartCardProps) {
	const [metric, setMetric] = useState<TrendMetric>('energy');
	const scrollRef = useRef<HTMLDivElement>(null);

	const cfg = METRIC_CFG[metric];
	const perHour =
		loadedFrom && loadedTo
			? new Date(loadedTo).getTime() - new Date(loadedFrom).getTime() <= PER_HOUR_THRESHOLD_MS
			: true;

	const chartData = useMemo(
		() => aggregateSeries(timeSeries ?? [], cfg.key, loadedFrom, loadedTo),
		[timeSeries, cfg.key, loadedFrom, loadedTo],
	);

	const hasAnyData = chartData.some((d) => d.hasData);
	const chartMinWidth = Math.max(chartData.length * MIN_PX_PER_POINT, 400);
	const xAxisInterval = (() => {
		const n = chartData.length;
		if (n <= 24) return 1;
		if (n <= 48) return 3;
		if (n <= 96) return 6;
		return Math.ceil(n / 15);
	})();

	const peakHourLabel = analytics.peakHour !== null ? `${String(analytics.peakHour).padStart(2, '0')}:00` : null;

	return (
		<Card className='border-0 shadow-sm lg:col-span-2'>
			<CardHeader className='px-5 py-4 pb-0 flex flex-row items-center justify-between gap-2'>
				<div className='flex items-center gap-2.5 shrink-0'>
					<CardTitle className='text-base font-semibold flex items-center gap-2'>
						<TrendingUp className='h-5 w-5 text-orange-500' />
						Trend
					</CardTitle>
					<Select value={metric} onValueChange={(v) => setMetric(v as TrendMetric)}>
						<SelectTrigger className='h-7 min-w-max text-sm border-0 bg-muted/50 px-2 cursor-pointer'>
							<SelectValue />
						</SelectTrigger>

						<SelectContent align='start' position='popper'>
							<SelectItem value='energy' className='text-sm cursor-pointer'>
								Energy (kWh)
							</SelectItem>
							<SelectItem value='power' className='text-sm cursor-pointer'>
								Power (kW)
							</SelectItem>
							<SelectItem value='voltage' className='text-sm cursor-pointer'>
								Voltage (V)
							</SelectItem>
							<SelectItem value='current' className='text-sm cursor-pointer'>
								Current (A)
							</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<div className='flex items-center gap-2'>
					{chartData.length > 0 && (
						<span className='text-xs text-muted-foreground/60'>
							{chartData.length} {perHour ? 'hours' : 'days'}
						</span>
					)}
				</div>
			</CardHeader>

			<CardContent className='p-5 pt-3'>
				{!hasAnyData && chartData.length === 0 ? (
					<div
						className={`${metric !== 'energy' ? 'sm:h-92.5' : 'sm:h-81.25'} h-60 flex items-center justify-center text-sm text-muted-foreground`}
					>
						No data available for this period
					</div>
				) : (
					<div
						ref={scrollRef}
						className='overflow-x-auto pb-1'
						style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
					>
						<div style={{ minWidth: `${chartMinWidth}px` }}>
							<ChartContainer
								config={{ value: { label: `${cfg.label} (${cfg.unit})`, color: cfg.color } }}
								className={`${metric !== 'energy' ? 'sm:h-92.5' : 'sm:h-81.25'} h-60 w-full`}
							>
								<AreaChart data={chartData} margin={{ top: 10, right: 8, bottom: 0, left: -5 }}>
									<defs>
										<linearGradient id={`grad-${metric}`} x1='0' y1='0' x2='0' y2='1'>
											<stop offset='0%' stopColor={cfg.color} stopOpacity={0.35} />
											<stop offset='100%' stopColor={cfg.color} stopOpacity={0} />
										</linearGradient>
									</defs>
									<CartesianGrid
										strokeDasharray='3 3'
										vertical={false}
										stroke='hsl(var(--border))'
										opacity={0.3}
									/>
									<XAxis
										dataKey='label'
										tick={{ fontSize: 11 }}
										tickLine={false}
										axisLine={false}
										interval={xAxisInterval}
									/>
									<YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={48} />
									<ChartTooltip content={<ChartTooltipContent />} />
									<Area
										type='monotone'
										dataKey='value'
										stroke={cfg.color}
										strokeWidth={2.5}
										fill={`url(#grad-${metric})`}
										dot={false}
										connectNulls={false}
									/>
								</AreaChart>
							</ChartContainer>
						</div>
					</div>
				)}

				{metric === 'energy' && peakHourLabel && (
					<div className='mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-sm'>
						<div className='flex items-center gap-2'>
							<div className='w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse' />
							<span className='text-muted-foreground'>Peak Hour:</span>
							<span className='font-bold text-orange-500'>{peakHourLabel}</span>
							<span className='text-xs text-muted-foreground'>({analytics.peakHourAvgKwh} kWh avg)</span>
						</div>
						<div className='flex items-center gap-1.5 text-xs'>
							<span className='text-muted-foreground'>Avg/hr:</span>
							<span className='font-semibold'>{analytics.overallAvgKwhPerHour} kWh</span>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
