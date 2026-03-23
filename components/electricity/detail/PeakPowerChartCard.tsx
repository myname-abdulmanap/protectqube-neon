'use client';

import { useMemo } from 'react';
import {
	Area,
	AreaChart,
	CartesianGrid,
	ReferenceDot,
	ReferenceLine,
	XAxis,
	YAxis,
	Tooltip,
	ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap } from 'lucide-react';
import type { OutletDetailPayload } from '@/app/dashboard/electricity/[scopeId]/page';

interface PeakPowerChartCardProps {
	timeSeries: OutletDetailPayload['timeSeries'];
	loadedFrom: string;
	loadedTo: string;
}

const DISPLAY_TIMEZONE = 'Asia/Jakarta';
const PER_HOUR_THRESHOLD_MS = 2 * 24 * 60 * 60 * 1000;
const MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

const getJakartaParts = (date: Date) => {
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone: DISPLAY_TIMEZONE,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		hour12: false,
	}).formatToParts(date);
	const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
	return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour') };
};

function CustomTooltip({
	active,
	payload,
	label,
}: {
	active?: boolean;
	payload?: Array<{ value: number }>;
	label?: string;
}) {
	if (!active || !payload?.length) return null;
	const val = Number(payload[0].value);
	return (
		<div className='rounded-md border border-border/50 bg-background shadow-xl overflow-hidden min-w-40'>
			<div className='bg-red-500 px-3 py-1.5'>
				<p className='text-[10px] font-bold uppercase tracking-widest text-red-100'>Power</p>
			</div>
			<div className='px-3 py-2.5'>
				<div className='flex items-baseline gap-1.5 mb-1'>
					<span className='text-2xl font-bold tabular-nums text-foreground'>
						{val.toLocaleString('id-ID', { maximumFractionDigits: 2 })}
					</span>
					<span className='text-sm font-semibold text-muted-foreground'>kW</span>
				</div>
				<p className='text-xs text-muted-foreground'>{label}</p>
			</div>
		</div>
	);
}

const buildSeries = (rows: OutletDetailPayload['timeSeries'], fromIso: string, toIso: string) => {
	if (!fromIso || !toIso || !rows?.length) return [];

	const fromMs = new Date(fromIso).getTime();
	const toMs = new Date(toIso).getTime();
	if (isNaN(fromMs) || isNaN(toMs)) return [];

	const perHour = toMs - fromMs <= PER_HOUR_THRESHOLD_MS;
	const buckets = new Map<string, { sum: number; count: number; firstTs: Date }>();

	for (const row of rows) {
		if (row.metricKey !== 'power_total') continue;
		const d = new Date(row.timestamp);
		if (isNaN(d.getTime())) continue;
		const rawVal = Number(row.metricValue);
		const val = rawVal > 1000 ? rawVal / 1000 : rawVal;
		if (!isFinite(val)) continue;

		const p = getJakartaParts(d);
		const key = perHour ? `${p.year}-${p.month}-${p.day} ${p.hour}` : `${p.year}-${p.month}-${p.day}`;
		const cur = buckets.get(key) ?? { sum: 0, count: 0, firstTs: d };
		cur.sum += val;
		cur.count += 1;
		buckets.set(key, cur);
	}

	if (!buckets.size) return [];

	const fromP = getJakartaParts(new Date(fromIso));
	const toP = getJakartaParts(new Date(toIso));
	const spansDays = `${fromP.year}-${fromP.month}-${fromP.day}` !== `${toP.year}-${toP.month}-${toP.day}`;

	return Array.from(buckets.entries())
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([key, bucket]) => {
			const avg = bucket.count > 0 ? bucket.sum / bucket.count : 0;
			const parts = key.split(' ');
			const datePart = parts[0]!;
			const hourPart = parts[1] ?? '00';
			const [year, month, day] = datePart.split('-').map(Number);
			const mo = month - 1;
			const dayLabel = `${String(day).padStart(2, '0')} ${MONTHS_ID[mo]}`;
			const label = perHour ? (spansDays ? `${dayLabel} ${hourPart}:00` : `${hourPart}:00`) : dayLabel;
			const fullLabel = perHour
				? `${String(day).padStart(2, '0')} ${MONTHS_ID[mo]} ${year}, ${hourPart}:00 WIB`
				: `${String(day).padStart(2, '0')} ${MONTHS_ID[mo]} ${year}`;
			return { key, label, value: Number(avg.toFixed(2)), fullLabel };
		});
};

export function PeakPowerChartCard({ timeSeries, loadedFrom, loadedTo }: PeakPowerChartCardProps) {
	const series = useMemo(
		() => buildSeries(timeSeries ?? [], loadedFrom, loadedTo),
		[timeSeries, loadedFrom, loadedTo],
	);

	const peakPoint = useMemo(
		() => (series.length ? series.reduce((best, p) => (p.value > best.value ? p : best)) : null),
		[series],
	);
	const minPoint = useMemo(
		() => (series.length ? series.reduce((low, p) => (p.value < low.value ? p : low)) : null),
		[series],
	);
	const avgPower = useMemo(() => {
		if (!series.length) return 0;
		return Number((series.reduce((s, p) => s + p.value, 0) / series.length).toFixed(2));
	}, [series]);

	const yDomain = useMemo(() => {
		if (!series.length) return [0, 10];
		const max = Math.max(...series.map((p) => p.value));
		return [0, Number((max * 1.15).toFixed(1))];
	}, [series]);

	const xInterval = (() => {
		const n = series.length;
		if (n <= 12) return 0;
		if (n <= 24) return 1;
		if (n <= 48) return 3;
		return Math.ceil(n / 15);
	})();

	return (
		<Card className='border border-border/60 shadow-sm h-full gap-0 py-0 flex flex-col'>
			<CardHeader className='px-5 pt-5 pb-0 gap-0 shrink-0'>
				<CardTitle className='text-lg font-bold flex items-center gap-2'>
					<Zap className='h-5 w-5 text-red-500' />
					Peak Power
				</CardTitle>
			</CardHeader>

			<CardContent className='px-5 pb-5 pt-4 flex flex-col flex-1 gap-4'>
				{series.length === 0 ? (
					<div className='flex-1 flex items-center justify-center text-sm text-muted-foreground'>
						Tidak ada data power untuk periode ini
					</div>
				) : (
					<div className='flex-1 min-h-0' style={{ minHeight: 180 }}>
						<ResponsiveContainer width='100%' height='100%'>
							<AreaChart data={series} margin={{ top: 8, right: 16, bottom: 0, left: 4 }}>
								<defs>
									<linearGradient id='peakGrad' x1='0' y1='0' x2='0' y2='1'>
										<stop offset='0%' stopColor='#ef4444' stopOpacity={0.25} />
										<stop offset='100%' stopColor='#ef4444' stopOpacity={0} />
									</linearGradient>
								</defs>
								<CartesianGrid strokeDasharray='3 3' vertical={false} opacity={0.2} />
								<XAxis
									dataKey='label'
									tick={{ fontSize: 10 }}
									tickLine={false}
									axisLine={false}
									interval={xInterval}
								/>
								<YAxis
									tick={{ fontSize: 10 }}
									tickLine={false}
									axisLine={false}
									width={50}
									domain={yDomain}
									tickFormatter={(v: number) => v.toFixed(1)}
									label={{
										value: 'kW',
										angle: -90,
										position: 'insideLeft',
										offset: 12,
										style: { fontSize: 9, fill: 'hsl(var(--muted-foreground))' },
									}}
								/>
								<Tooltip content={<CustomTooltip />} />
								<ReferenceLine
									y={avgPower}
									stroke='#94a3b8'
									strokeDasharray='4 3'
									strokeWidth={1.5}
									label={{
										value: `avg ${avgPower}`,
										position: 'insideTopRight',
										fontSize: 9,
										fill: '#94a3b8',
									}}
								/>
								<Area
									type='monotone'
									dataKey='value'
									stroke='#ef4444'
									strokeWidth={2}
									fill='url(#peakGrad)'
									dot={false}
									isAnimationActive={false}
								/>
								{peakPoint && (
									<ReferenceDot
										x={peakPoint.label}
										y={peakPoint.value}
										r={5}
										fill='#ef4444'
										stroke='white'
										strokeWidth={2}
									/>
								)}
							</AreaChart>
						</ResponsiveContainer>
					</div>
				)}

				<div className='grid grid-cols-3 gap-2 shrink-0'>
					<div className='rounded-xl bg-red-500 flex flex-col px-4 py-3.5'>
						<p className='text-[10px] font-bold uppercase tracking-widest text-red-200 mb-2'>Peak</p>
						<div className='flex items-baseline gap-1 flex-wrap'>
							<p className='text-2xl font-bold tabular-nums text-white leading-none'>
								{peakPoint
									? peakPoint.value.toLocaleString('id-ID', { maximumFractionDigits: 2 })
									: '–'}
							</p>
							<p className='text-sm font-semibold text-red-200 mt-0.5'>kW</p>
						</div>
						<div className='mt-2 pt-2 border-t border-red-400/40'>
							<p className='text-[11px] font-medium text-red-100 leading-snug'>
								{peakPoint?.fullLabel ?? '–'}
							</p>
						</div>
					</div>

					<div className='rounded-xl bg-blue-500 flex flex-col px-4 py-3.5'>
						<p className='text-[10px] font-bold uppercase tracking-widest text-blue-200 mb-2'>Rata-rata</p>
						<div className='flex items-baseline gap-1 flex-wrap'>
							<p className='text-2xl font-bold tabular-nums text-white leading-none'>
								{avgPower.toLocaleString('id-ID', { maximumFractionDigits: 2 })}
							</p>
							<p className='text-sm font-semibold text-blue-200 mt-0.5'>kW</p>
						</div>
						<div className='mt-2 pt-2 border-t border-blue-400/40'>
							<p className='text-[11px] font-medium text-blue-100 leading-snug'>
								{series.length} titik data
							</p>
						</div>
					</div>

					<div className='rounded-xl bg-teal-500 flex flex-col px-4 py-3.5'>
						<p className='text-[10px] font-bold uppercase tracking-widest text-teal-200 mb-2'>Terendah</p>
						<div className='flex items-baseline gap-1 flex-wrap'>
							<p className='text-2xl font-bold tabular-nums text-white leading-none'>
								{minPoint ? minPoint.value.toLocaleString('id-ID', { maximumFractionDigits: 2 }) : '–'}
							</p>
							<p className='text-sm font-semibold text-teal-200 mt-0.5'>kW</p>
						</div>
						<div className='mt-2 pt-2 border-t border-teal-400/40'>
							<p className='text-[11px] font-medium text-teal-100 leading-snug'>
								{minPoint?.fullLabel ?? '–'}
							</p>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
