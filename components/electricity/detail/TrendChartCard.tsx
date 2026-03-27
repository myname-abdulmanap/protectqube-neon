'use client';

import { useMemo, useRef } from 'react';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { OutletDetailPayload } from '@/app/dashboard/electricity/[scopeId]/page';
import { BarChart3, Gauge, Waves } from 'lucide-react';

interface ChartPoint {
	label: string;
	[key: string]: number | string | boolean;
}

export interface TrendChartCardProps {
	timeSeries: OutletDetailPayload['timeSeries'];
	loadedFrom: string;
	loadedTo: string;
}

const PHASE_COLORS = {
	L1: '#3b82f6',
	L2: '#f59e0b',
	L3: '#ef4444',
};

const VOLTAGE_METRICS = [
	{ key: 'voltage_l1', phase: 'R', color: PHASE_COLORS.L1 },
	{ key: 'voltage_l2', phase: 'S', color: PHASE_COLORS.L2 },
	{ key: 'voltage_l3', phase: 'T', color: PHASE_COLORS.L3 },
];

const CURRENT_METRICS = [
	{ key: 'current_l1', phase: 'R', color: PHASE_COLORS.L1 },
	{ key: 'current_l2', phase: 'S', color: PHASE_COLORS.L2 },
	{ key: 'current_l3', phase: 'T', color: PHASE_COLORS.L3 },
];

const PER_HOUR_THRESHOLD_MS = 2 * 24 * 60 * 60 * 1000;
const MIN_PX_PER_POINT = 28;

function generateHourSlots(fromIso: string, toIso: string) {
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

function generateDaySlots(fromIso: string, toIso: string) {
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

function buildMultiLineData(
	rows: OutletDetailPayload['timeSeries'],
	metricKeys: string[],
	fromIso: string,
	toIso: string,
	perHour: boolean,
): ChartPoint[] {
	if (!fromIso || !toIso) return [];

	const buckets = new Map<string, Map<string, { sum: number; count: number }>>();

	for (const r of rows) {
		if (!metricKeys.includes(r.metricKey)) continue;
		const d = new Date(r.timestamp);
		const y = d.getFullYear();
		const mo = String(d.getMonth() + 1).padStart(2, '0');
		const dd = String(d.getDate()).padStart(2, '0');
		const hh = String(d.getHours()).padStart(2, '0');
		const key = perHour ? `${y}-${mo}-${dd} ${hh}` : `${y}-${mo}-${dd}`;

		const metricMap = buckets.get(key) ?? new Map<string, { sum: number; count: number }>();
		const cur = metricMap.get(r.metricKey) ?? { sum: 0, count: 0 };
		cur.sum += Number(r.metricValue);
		cur.count += 1;
		metricMap.set(r.metricKey, cur);
		buckets.set(key, metricMap);
	}

	const slots = perHour ? generateHourSlots(fromIso, toIso) : generateDaySlots(fromIso, toIso);

	return slots.map(({ key, label }) => {
		const metricMap = buckets.get(key);
		const point: ChartPoint = { label, hasData: !!metricMap };
		for (const mk of metricKeys) {
			const entry = metricMap?.get(mk);
			point[mk] = entry ? Number((entry.sum / entry.count).toFixed(2)) : 0;
		}
		return point;
	});
}

function MultiLineTooltip({
	active,
	payload,
	label,
	unit,
	metrics,
}: {
	active?: boolean;
	payload?: Array<{ dataKey: string; value: number; color: string }>;
	label?: string;
	unit: string;
	metrics: Array<{ key: string; phase: string; color: string }>;
}) {
	if (!active || !payload?.length) return null;

	const headerBg = unit === 'V' ? 'bg-green-500' : 'bg-purple-500';
	const title = unit === 'V' ? 'Voltage' : 'Current';

	return (
		<div className='rounded-md border border-border/50 bg-background shadow-xl overflow-hidden min-w-44'>
			<div className={`${headerBg} px-3 py-1.5`}>
				<p className='text-[10px] font-bold uppercase tracking-widest text-white'>{title}</p>
			</div>
			<div className='px-3 py-2 border-b border-border/30'>
				<p className='text-xs font-semibold text-foreground'>{label}</p>
			</div>
			<div className='px-3 py-2 space-y-1.5'>
				{metrics.map((m) => {
					const entry = payload.find((p) => p.dataKey === m.key);
					if (!entry) return null;
					return (
						<div key={m.key} className='flex items-center justify-between gap-4'>
							<div className='flex items-center gap-1.5'>
								<div className='w-2.5 h-2.5 rounded-full' style={{ background: m.color }} />
								<span className='text-xs text-muted-foreground'>{m.phase}</span>
							</div>
							<span className='text-xs font-bold tabular-nums'>
								{entry.value.toLocaleString('id-ID', { maximumFractionDigits: 2 })}{' '}
								<span className='font-normal text-muted-foreground'>{unit}</span>
							</span>
						</div>
					);
				})}
			</div>
		</div>
	);
}

function MultiLineChart({
	title,
	unit,
	icon: Icon,
	iconClass,
	metrics,
	chartData,
	perHour,
}: {
	title: string;
	unit: string;
	icon: React.ElementType;
	iconClass: string;
	metrics: Array<{ key: string; phase: string; color: string }>;
	chartData: ChartPoint[];
	perHour: boolean;
}) {
	const scrollRef = useRef<HTMLDivElement>(null);
	const chartMinWidth = Math.max(chartData.length * MIN_PX_PER_POINT, 400);

	const xAxisInterval = (() => {
		const n = chartData.length;
		if (n <= 24) return 1;
		if (n <= 48) return 3;
		if (n <= 96) return 6;
		return Math.ceil(n / 15);
	})();

	const hasAnyData = chartData.some((d) => d.hasData);

	return (
		<Card className='border border-border/60 shadow-sm h-full gap-0 py-0 flex flex-col'>
			<CardHeader className='px-5 pt-5 pb-0 flex flex-row items-center justify-between gap-2'>
				<div className='flex items-center gap-2'>
					<Icon className={`h-4 w-4 ${iconClass}`} />
					<CardTitle className='text-lg font-bold'>{title}</CardTitle>
					<span className='text-xs text-muted-foreground font-medium bg-muted/60 px-2 py-0.5 rounded-full'>
						{unit}
					</span>
				</div>
				{chartData.length > 0 && (
					<span className='text-xs text-muted-foreground/50'>
						{chartData.length} {perHour ? 'jam' : 'hari'}
					</span>
				)}
			</CardHeader>

			<CardContent className='px-5 pb-5 pt-4'>
				{chartData.length === 0 ? (
					<div className='h-44 flex items-center justify-center text-sm text-muted-foreground'>
						Tidak ada data untuk periode ini
					</div>
				) : (
					<>
						{!hasAnyData ? (
							<div className='relative h-37.5 w-full flex flex-col items-center justify-center rounded-md overflow-hidden bg-muted/5'>
								<div
									className='absolute inset-0 opacity-[0.08] dark:opacity-[0.15]'
									style={{
										backgroundImage: `radial-gradient(circle, currentColor 1px, transparent 1px)`,
										backgroundSize: '12px 12px',
									}}
								/>

								<div className='relative z-10 flex flex-col items-center'>
									<div className='mb-2 p-2 rounded-xl bg-background/60 border border-border/60 shadow-sm'>
										<BarChart3 className='w-4 h-4 text-muted-foreground/40' />
									</div>
									<p className='text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.2em]'>
										Tidak Ada Data
									</p>
								</div>
							</div>
						) : (
							<div
								ref={scrollRef}
								className='overflow-x-auto pb-1'
								style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
							>
								<div style={{ minWidth: `${chartMinWidth}px` }}>
									<ResponsiveContainer width='100%' height={176}>
										<LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 4 }}>
											<CartesianGrid
												strokeDasharray='3 3'
												vertical={false}
												stroke='hsl(var(--border))'
												opacity={0.3}
											/>
											<XAxis
												dataKey='label'
												tick={{ fontSize: 10 }}
												tickLine={false}
												axisLine={false}
												interval={xAxisInterval}
											/>
											<YAxis
												tick={{ fontSize: 10 }}
												tickLine={false}
												axisLine={false}
												width={52}
												label={{
													value: unit,
													angle: -90,
													position: 'insideLeft',
													offset: 12,
													style: {
														fontSize: 10,
														fontWeight: 700,
														textAnchor: 'middle',
													},
												}}
											/>
											<Tooltip content={<MultiLineTooltip unit={unit} metrics={metrics} />} />
											<Legend
												iconType='circle'
												iconSize={8}
												formatter={(value) => {
													const m = metrics.find((mx) => mx.key === value);
													return <span style={{ fontSize: 11 }}>{m?.phase ?? value}</span>;
												}}
											/>
											{metrics.map((m) => (
												<Line
													key={m.key}
													type='monotone'
													dataKey={m.key}
													stroke={m.color}
													strokeWidth={1.75}
													dot={false}
													activeDot={{ r: 4, fill: m.color, stroke: '#fff', strokeWidth: 2 }}
													connectNulls={false}
												/>
											))}
										</LineChart>
									</ResponsiveContainer>
								</div>
							</div>
						)}
					</>
				)}
			</CardContent>
		</Card>
	);
}

export function TrendChartCard({ timeSeries, loadedFrom, loadedTo }: TrendChartCardProps) {
	const perHour =
		loadedFrom && loadedTo
			? new Date(loadedTo).getTime() - new Date(loadedFrom).getTime() <= PER_HOUR_THRESHOLD_MS
			: true;

	const voltageKeys = VOLTAGE_METRICS.map((m) => m.key);
	const voltageData = useMemo(
		() => buildMultiLineData(timeSeries ?? [], voltageKeys, loadedFrom, loadedTo, perHour),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[timeSeries, loadedFrom, loadedTo, perHour],
	);

	const currentKeys = CURRENT_METRICS.map((m) => m.key);
	const currentData = useMemo(
		() => buildMultiLineData(timeSeries ?? [], currentKeys, loadedFrom, loadedTo, perHour),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[timeSeries, loadedFrom, loadedTo, perHour],
	);

	return (
		<div className='grid grid-cols-2 gap-4 h-full'>
			<MultiLineChart
				title='Voltage'
				unit='V'
				icon={Gauge}
				iconClass='text-green-500'
				metrics={VOLTAGE_METRICS}
				chartData={voltageData}
				perHour={perHour}
			/>
			<MultiLineChart
				title='Current'
				unit='A'
				icon={Waves}
				iconClass='text-purple-500'
				metrics={CURRENT_METRICS}
				chartData={currentData}
				perHour={perHour}
			/>
		</div>
	);
}
