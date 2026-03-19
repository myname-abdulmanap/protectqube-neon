'use client';

import { Activity, Clock, Gauge, Layers, Zap, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { OutletDetailPayload } from '@/app/dashboard/electricity/[scopeId]/page-new-old';

const f = (v: number, d = 2) => (Number.isFinite(v) ? v.toLocaleString('id-ID', { maximumFractionDigits: d }) : '-');

const formatTimestamp = (value: string | null) => {
	if (!value) return null;
	const parsed = new Date(value);
	if (isNaN(parsed.getTime())) return null;
	return (
		new Intl.DateTimeFormat('id-ID', {
			timeZone: 'Asia/Jakarta',
			day: '2-digit',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit',
			hour12: false,
		}).format(parsed) + ' WIB'
	);
};

const formatPeakHour = (hour: number | null) => {
	if (hour === null || !Number.isFinite(hour)) return '-';
	const start = Math.max(0, Math.min(23, Math.trunc(hour)));
	const end = (start + 1) % 24;
	return `${String(start).padStart(2, '0')}:00 – ${String(end).padStart(2, '0')}:00`;
};

interface AnalyticsCardProps {
	analytics: OutletDetailPayload['analytics'];
	devices: OutletDetailPayload['devices'];
}

export function AnalyticsCard({ analytics, devices }: AnalyticsCardProps) {
	const peakHourAvgKwh = Number(analytics.peakHourAvgKwh ?? analytics.peakHourAvgKw ?? 0);

	const totalDevices = devices.length;
	const onlineDevices = devices.filter((d) => d.status === 'online' || d.status === 'active').length;
	const offlineDevices = totalDevices - onlineDevices;

	return (
		<Card className='border border-border/60 shadow-sm h-full gap-0 py-0 flex flex-col'>
			<CardHeader className='px-5 pt-5 pb-0 gap-0 shrink-0'>
				<CardTitle className='text-lg font-bold flex items-center gap-2'>
					<BarChart3 className='h-5 w-5 text-purple-500' />
					Analytics
				</CardTitle>
			</CardHeader>

			<CardContent className='p-0 flex flex-col flex-1 text-sm sm:text-base'>
				<div className='grid grid-cols-3 divide-x border-b'>
					{[
						{ label: 'Peak Power', value: analytics.peakPowerKw, unit: 'kW', ts: analytics.peakPowerAt },
						{ label: 'Total Energy', value: analytics.totalEnergyKwh, unit: 'kWh', sub: 'Cumulative' },
						{ label: 'Reactive', value: analytics.totalKvarh, unit: 'kVARh', sub: 'Total' },
					].map((item, i) => (
						<div key={i} className='px-4 py-4 sm:px-5 sm:py-5'>
							<p className='text-[10px] sm:text-xs text-muted-foreground uppercase mb-1'>{item.label}</p>
							<div className='flex items-baseline gap-1'>
								<span className='text-lg sm:text-2xl font-bold tabular-nums'>{f(item.value)}</span>
								<span className='text-xs text-muted-foreground'>{item.unit}</span>
							</div>
							<p className='text-[10px] text-muted-foreground mt-1'>
								{item.ts ? formatTimestamp(item.ts) : item.sub}
							</p>
						</div>
					))}
				</div>

				<div className='grid grid-cols-2 divide-x divide-y border-b bg-muted/10'>
					{[
						{ icon: Activity, label: 'AVG Voltage', value: f(analytics.avgVoltageV, 1), unit: 'V' },
						{ icon: Zap, label: 'AVG Current', value: f(analytics.avgCurrentA), unit: 'A' },
						{ icon: Gauge, label: 'Avg Power', value: f(analytics.avgPowerKw), unit: 'kW' },
						{ icon: Layers, label: 'AVG Power Factor', value: f(analytics.avgPfSigma, 3), unit: '' },
					].map((item, i) => (
						<div key={i} className='px-4 py-4 sm:px-5 sm:py-5'>
							<div className='flex items-center gap-1 mb-1 text-muted-foreground'>
								<item.icon className='w-3 h-3' />
								<span className='text-[10px] sm:text-xs uppercase'>{item.label}</span>
							</div>
							<p className='text-base sm:text-lg font-bold tabular-nums'>
								{item.value}
								<span className='text-xs opacity-70 ml-1'>{item.unit}</span>
							</p>
						</div>
					))}
				</div>

				<div className='px-4 py-3 sm:px-5 sm:py-4 flex items-center justify-between border-b'>
					<div className='flex items-center gap-3'>
						<div className='p-2 bg-primary/5 rounded-full'>
							<Clock className='w-4 h-4 text-primary' />
						</div>
						<div>
							<p className='text-[10px] sm:text-xs text-muted-foreground uppercase'>Peak Usage Hour</p>
							<p className='text-sm sm:text-base font-bold'>{formatPeakHour(analytics.peakHour)}</p>
						</div>
					</div>
					<div className='text-right'>
						<p className='text-[10px] sm:text-xs text-muted-foreground uppercase'>Avg Load</p>
						<p className='text-sm sm:text-base font-bold tabular-nums'>{f(peakHourAvgKwh)} kWh</p>
					</div>
				</div>

				<div className='flex-1 px-4 py-3 sm:px-5 sm:py-4'>
					<p className='text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase mb-3'>
						Connected Devices
					</p>

					<div className='grid grid-cols-3 gap-3'>
						<div className='rounded-md border p-3'>
							<p className='text-[10px] text-muted-foreground uppercase mb-1'>Total</p>
							<p className='text-lg font-bold tabular-nums'>{totalDevices}</p>
						</div>

						<div className='rounded-md border p-3'>
							<p className='text-[10px] text-muted-foreground uppercase mb-1'>Online</p>
							<p className='text-lg font-bold text-emerald-600 tabular-nums'>{onlineDevices}</p>
						</div>

						<div className='rounded-md border p-3'>
							<p className='text-[10px] text-muted-foreground uppercase mb-1'>Offline</p>
							<p className='text-lg font-bold text-rose-600 tabular-nums'>{offlineDevices}</p>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
