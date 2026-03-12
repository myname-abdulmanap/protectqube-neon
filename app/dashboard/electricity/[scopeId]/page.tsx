'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageTransition } from '@/components/ui/page-transition';

import { RealtimePowerCard } from '@/components/electricity/detail/RealtimePowerCard';
import { PowerMeterCard } from '@/components/electricity/detail/PowerMeterCard';
import { TrendChartCard } from '@/components/electricity/detail/TrendChartCard';
import { AnalyticsCard } from '@/components/electricity/detail/AnalyticsCard';
import { HistoryTableCard } from '@/components/electricity/detail/HistoryTableCard';
import { OutletProfileCard } from '@/components/electricity/detail/OutletProfileCard';
import { DateFilter, type DateRange, buildRange } from '@/components/electricity/detail/DateFilter';
import { DataLoadingOverlay } from '@/components/electricity/detail/DataLoadingOverlay';

import { deviceMetricsApi, energyDashboardApi, type EnergyOutletDetail } from '@/lib/api';
import { exportToExcel, exportToPdf } from '@/lib/report-export';
import { ExportModal, type ExportFormat, type ExportPeriod } from '@/components/dashboard/ExportModal';
import { formatCompactNumber } from '@/lib/energy-monitoring';

export interface OutletDetailPayload {
	id: string;
	name: string;
	region: string | null;
	city: string | null;
	address: string | null;
	period: {
		from: string;
		to: string;
		days: number;
		isSingleDay: boolean;
		label: string;
	};
	latestMetrics: Record<string, { value: number; unit: string | null; timestamp: string }>;
	capacityVa: number | null;
	maxLoadKw: number | null;
	timeSeries: Array<{
		timestamp: string;
		metricKey: string;
		metricValue: number;
	}>;
	analytics: {
		peakPowerKw: number;
		avgPowerKw: number;
		avgVoltageV: number;
		avgCurrentA: number;
		avgPfSigma: number;
		totalEnergyKwh: number;
		totalKvarh: number;
		peakHour: number | null;
		peakHourAvgKwh: number;
		overallAvgKwhPerHour: number;
	};
	devices: Array<{
		id: string;
		name: string;
		serialNo: string;
		locationName: string | null;
		locationType: string | null;
		status: string;
		lastSeenAt: string | null;
		moduleTypes: string[];
	}>;
}

function adaptApiResponse(raw: EnergyOutletDetail): OutletDetailPayload {
	type ExtendedRaw = EnergyOutletDetail & {
		latestMetrics?: Record<string, { value: number; unit: string | null; timestamp: string }>;
		timeSeries?: Array<{ timestamp: string; metricKey: string; metricValue: unknown }>;
		analytics?: Partial<OutletDetailPayload['analytics']>;
		capacityVa?: number | null;
		maxLoadKw?: number | null;
	};
	const ext = raw as ExtendedRaw;
	return {
		id: raw.id,
		name: raw.name,
		region: raw.region ?? null,
		city: raw.city ?? null,
		address: raw.address ?? null,
		period: {
			from: raw.period.from,
			to: raw.period.to,
			days: raw.period.days,
			isSingleDay: raw.period.isSingleDay,
			label: raw.period.label,
		},
		latestMetrics: ext.latestMetrics ?? {},
		capacityVa: ext.capacityVa ?? null,
		maxLoadKw: ext.maxLoadKw ?? null,
		timeSeries: (ext.timeSeries ?? []).map((r) => ({
			timestamp: r.timestamp,
			metricKey: r.metricKey,
			metricValue: Number(r.metricValue ?? 0),
		})),
		analytics: {
			peakPowerKw: Number(ext.analytics?.peakPowerKw ?? raw.peakPower ?? 0),
			avgPowerKw: Number(ext.analytics?.avgPowerKw ?? 0),
			avgVoltageV: Number(ext.analytics?.avgVoltageV ?? 0),
			avgCurrentA: Number(ext.analytics?.avgCurrentA ?? 0),
			avgPfSigma: Number(ext.analytics?.avgPfSigma ?? 0),
			totalEnergyKwh: Number(ext.analytics?.totalEnergyKwh ?? raw.kpiData?.totalUsage ?? 0),
			totalKvarh: Number(ext.analytics?.totalKvarh ?? 0),
			peakHour: ext.analytics?.peakHour ?? null,
			peakHourAvgKwh: Number(ext.analytics?.peakHourAvgKwh ?? 0),
			overallAvgKwhPerHour: Number(ext.analytics?.overallAvgKwhPerHour ?? 0),
		},
		devices: (raw.devices ?? []).map((d) => ({
			id: d.id,
			name: d.name,
			serialNo: d.serialNo ?? '',
			locationName: d.locationName ?? null,
			locationType: d.locationType ?? null,
			status: d.status ?? 'unknown',
			lastSeenAt: d.lastSeenAt ?? null,
			moduleTypes: d.moduleTypes ?? [],
		})),
	};
}

const container = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const itemVariant = {
	hidden: { opacity: 0, y: 12 },
	visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
};

const roundN = (v: number, d = 2) => Number(v.toFixed(d));
function mv(metrics: OutletDetailPayload['latestMetrics'], key: string): number {
	return metrics[key]?.value ?? 0;
}

export default function ElectricityOutletDetailPage() {
	const params = useParams<{ scopeId: string }>();
	const scopeId = params.scopeId;

	const [dateRange, setDateRange] = useState<DateRange>(buildRange('today'));
	const [detail, setDetail] = useState<OutletDetailPayload | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [timeSeries, setTimeSeries] = useState<OutletDetailPayload['timeSeries']>([]);
	const [analyticsData, setAnalyticsData] = useState<OutletDetailPayload['analytics'] | null>(null);

	const [dataLoading, setDataLoading] = useState(false);
	const [loadedFrom, setLoadedFrom] = useState('');
	const [loadedTo, setLoadedTo] = useState('');

	const [latestMetrics, setLatestMetrics] = useState<OutletDetailPayload['latestMetrics']>({});
	const [realtimeLastUpdated, setRealtimeLastUpdated] = useState<string | null>(null);
	const [isMounted, setIsMounted] = useState(false);

	useEffect(() => {
		setIsMounted(true);
	}, []);

	const isOffline = useMemo(() => {
		if (!isMounted || !realtimeLastUpdated) return true;
		return Date.now() - new Date(realtimeLastUpdated).getTime() > 5 * 60 * 1000;
	}, [isMounted, realtimeLastUpdated]);

	const fetchForRange = useCallback(
		async (range: DateRange, isInitial = false) => {
			if (range.preset === 'custom' && (!range.from || !range.to)) return;
			try {
				// eslint-disable-next-line @typescript-eslint/no-unused-expressions
				isInitial ? setLoading(true) : setDataLoading(true);
				setError(null);
				const res = await energyDashboardApi.getOutletDetail(scopeId, { from: range.from, to: range.to });
				if (!res.success || !res.data) {
					setError(res.error ?? 'Failed to load outlet');
					return;
				}
				const payload = adaptApiResponse(res.data);
				if (isInitial) setDetail(payload);
				setTimeSeries(payload.timeSeries);
				setAnalyticsData(payload.analytics);
				setLoadedFrom(range.from);
				setLoadedTo(range.to);
			} catch (e: unknown) {
				setError(e instanceof Error ? e.message : 'Error loading outlet');
			} finally {
				// eslint-disable-next-line @typescript-eslint/no-unused-expressions
				isInitial ? setLoading(false) : setDataLoading(false);
			}
		},
		[scopeId],
	);

	useEffect(() => {
		void fetchForRange(buildRange('today'), true);
	}, [fetchForRange]);

	const handleDateRangeChange = (range: DateRange) => {
		setDateRange(range);
		if (range.preset === 'custom' && (!range.from || !range.to)) return;
		void fetchForRange(range, false);
	};

	const pollRealtimeMetrics = useCallback(async () => {
		const res = await deviceMetricsApi.getAll({ scopeId, moduleType: 'power_meter', limit: 50 });
		if (!res.success || !res.data?.length) return;
		const latestByKey = new Map<string, (typeof res.data)[0]>();
		for (const m of res.data) {
			const cur = latestByKey.get(m.metricKey);
			if (!cur || new Date(m.timestamp) > new Date(cur.timestamp)) latestByKey.set(m.metricKey, m);
		}
		const updated: OutletDetailPayload['latestMetrics'] = {};
		for (const [key, m] of latestByKey)
			updated[key] = { value: Number(m.metricValue), unit: m.unit ?? null, timestamp: m.timestamp };
		setLatestMetrics(updated);
		const latestTs = Array.from(latestByKey.values())
			.map((m) => m.timestamp)
			.sort()
			.pop();
		if (latestTs) setRealtimeLastUpdated(latestTs);
	}, [scopeId]);

	useEffect(() => {
		void pollRealtimeMetrics();
		const id = setInterval(() => void pollRealtimeMetrics(), 15_000);
		return () => clearInterval(id);
	}, [pollRealtimeMetrics]);

	const pmValues = useMemo(() => {
		const g = (key: string) => mv(latestMetrics, key);
		const kw = (key: string) => {
			const m = latestMetrics[key];
			if (!m) return 0;
			return m.unit === 'W' ? m.value / 1000 : m.value;
		};
		return {
			voltageL1: roundN(g('voltage_l1'), 1),
			voltageL2: roundN(g('voltage_l2'), 1),
			voltageL3: roundN(g('voltage_l3'), 1),
			voltageAB: roundN(g('voltage_ab'), 1),
			voltageBC: roundN(g('voltage_bc'), 1),
			voltageCA: roundN(g('voltage_ca'), 1),
			currentL1: roundN(g('current_l1')),
			currentL2: roundN(g('current_l2')),
			currentL3: roundN(g('current_l3')),
			currentTotal: roundN(g('current_total')),
			powerL1: roundN(kw('power_l1')),
			powerL2: roundN(kw('power_l2')),
			powerL3: roundN(kw('power_l3')),
			powerTotal: roundN(kw('power_total')),
			reactiveL1: roundN(g('reactive_l1')),
			reactiveL2: roundN(g('reactive_l2')),
			reactiveL3: roundN(g('reactive_l3')),
			reactiveSigma: roundN(g('reactive_sigma')),
			vaA: roundN(g('va_a')),
			vaB: roundN(g('va_b')),
			vaC: roundN(g('va_c')),
			vaSigma: roundN(g('va_sigma')),
			pfA: roundN(g('pf_a'), 3),
			pfB: roundN(g('pf_b'), 3),
			pfC: roundN(g('pf_c'), 3),
			pfSigma: roundN(g('pf_sigma'), 3),
			energyTotal: roundN(g('energy_total')),
			kvarh: roundN(g('kvarh')),
			frequency: roundN(g('frequency'), 1),
		};
	}, [latestMetrics]);

	const handleExport = async (format: ExportFormat, period: ExportPeriod) => {
		if (!detail) return;
		const metricsRes = await deviceMetricsApi.getAll({
			scopeId,
			moduleType: 'power_meter',
			from: new Date(period.from).toISOString(),
			to: new Date(period.to).toISOString(),
			limit: 50_000,
		});
		type FlatMetric = { timestamp: string; metricKey: string; metricValue: number };
		const pivotRows = (input: FlatMetric[]): Array<Record<string, string | number>> => {
			const map = new Map<string, Record<string, string | number>>();
			for (const r of input) {
				if (!map.has(r.timestamp)) map.set(r.timestamp, { timestamp: r.timestamp });
				map.get(r.timestamp)![r.metricKey] = r.metricValue;
			}
			return Array.from(map.values()).sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
		};
		const rows = metricsRes.success && metricsRes.data ? pivotRows(metricsRes.data as FlatMetric[]) : [];
		if (format === 'excel') {
			await exportToExcel(`outlet-${detail.id}.xlsx`, [
				{
					name: 'Summary',
					rows: [
						{
							outlet: detail.name,
							region: detail.region ?? '-',
							address: detail.address ?? '-',
							capacityVa: detail.capacityVa ?? '-',
							devices: detail.devices.length,
						},
					],
				},
				{ name: 'Metrics', rows },
			]);
		} else {
			await exportToPdf({
				fileName: `outlet-${detail.id}.pdf`,
				title: 'Detail Outlet',
				scopeName: detail.name,
				period: `${period.from} - ${period.to}`,
				generatedAt: new Date().toLocaleString('id-ID'),
				summary: [
					`Outlet: ${detail.name} | Region: ${detail.region ?? '-'}`,
					`Capacity: ${detail.capacityVa ? `${formatCompactNumber(detail.capacityVa)} VA` : '-'}`,
					`Devices: ${detail.devices.length}`,
				],
				tables: [
					{
						title: 'Metrics',
						columns: ['Time', 'V1', 'V2', 'V3', 'A Total', 'P Total', 'Energy', 'PF'],
						rows: rows
							.slice(0, 100)
							.map((r) => [
								String(r['timestamp'] ?? '-'),
								String(r['voltage_l1'] ?? '-'),
								String(r['voltage_l2'] ?? '-'),
								String(r['voltage_l3'] ?? '-'),
								String(r['current_total'] ?? '-'),
								String(r['power_total'] ?? '-'),
								String(r['energy_total'] ?? '-'),
								String(r['pf_sigma'] ?? '-'),
							]),
					},
				],
			});
		}
	};

	const dateRangeLabel = useMemo(() => {
		if (!loadedFrom || !loadedTo) return '';
		const from = new Date(loadedFrom).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
		const to = new Date(loadedTo).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
		return from === to ? from : `${from} – ${to}`;
	}, [loadedFrom, loadedTo]);

	const overlayLabel = `Load data${dateRangeLabel ? ` ${dateRangeLabel}` : '...'}`;

	if (loading && !detail) {
		return (
			<div className='space-y-4 max-w-7xl mx-auto px-3 pt-1'>
				<div className='flex items-center justify-between pt-1'>
					<div className='flex items-center gap-3'>
						<div className='h-9 w-9 rounded-md bg-muted/30 animate-pulse' />
						<div className='space-y-2'>
							<div className='h-5 w-48 rounded bg-muted/30 animate-pulse' />
							<div className='h-3 w-32 rounded bg-muted/30 animate-pulse' />
						</div>
					</div>
					<div className='flex gap-2'>
						<div className='h-9 w-32 rounded-md bg-muted/30 animate-pulse' />
						<div className='h-9 w-9 rounded-md bg-muted/30 animate-pulse' />
					</div>
				</div>

				<div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
					<div className='rounded-xl bg-muted/30 animate-pulse h-72' />
					<div className='rounded-xl bg-muted/30 animate-pulse h-72 lg:col-span-2' />
				</div>

				<div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
					<div className='rounded-xl bg-muted/30 animate-pulse h-80 lg:col-span-2' />
					<div className='rounded-xl bg-muted/30 animate-pulse h-80' />
				</div>
			</div>
		);
	}

	if (error && !detail) {
		return (
			<div className='space-y-4 max-w-7xl mx-auto px-3 pt-4'>
				<div className='text-sm text-destructive bg-destructive/10 px-4 py-3 rounded-lg'>{error}</div>
			</div>
		);
	}

	return (
		<PageTransition>
			<motion.div
				className='space-y-4 max-w-7xl mx-auto px-3'
				initial='hidden'
				animate='visible'
				variants={container}
			>
				<motion.div variants={itemVariant} className='flex items-center justify-between pt-1 flex-wrap gap-3'>
					<div className='flex items-center gap-3'>
						<Button asChild variant='ghost' size='icon' className='h-9 w-9'>
							<Link href='/dashboard/electricity'>
								<ArrowLeft className='h-5 w-5' />
							</Link>
						</Button>
						<div>
							<h1 className='text-lg font-bold'>{detail?.name ?? 'Outlet Detail'}</h1>
							<p className='text-sm text-muted-foreground'>{detail?.address ?? detail?.region ?? ''}</p>
						</div>
					</div>
					<div className='flex items-center gap-2'>
						<DateFilter value={dateRange} onChange={handleDateRangeChange} />
						<ExportModal onExport={handleExport} disabled={!detail || loading} />
					</div>
				</motion.div>

				<motion.div variants={itemVariant} className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
					<RealtimePowerCard
						powerTotal={pmValues.powerTotal}
						energyTotal={pmValues.energyTotal}
						capacityVa={detail?.capacityVa ?? null}
						isOffline={isOffline}
						lastUpdated={realtimeLastUpdated}
					/>
					<PowerMeterCard values={pmValues} />
				</motion.div>

				{detail && (
					<motion.div variants={itemVariant} className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
						<div className='lg:col-span-2 relative'>
							<DataLoadingOverlay isLoading={dataLoading} label={overlayLabel} />
							<TrendChartCard
								timeSeries={timeSeries}
								analytics={analyticsData ?? detail.analytics}
								loadedFrom={loadedFrom}
								loadedTo={loadedTo}
							/>
						</div>
						<div className='relative'>
							<DataLoadingOverlay isLoading={dataLoading} label={overlayLabel} />
							<AnalyticsCard analytics={analyticsData ?? detail.analytics} devices={detail.devices} />
						</div>
					</motion.div>
				)}

				{detail && (
					<motion.div variants={itemVariant} className='relative'>
						<DataLoadingOverlay isLoading={dataLoading} label={overlayLabel} />
						<HistoryTableCard scopeId={scopeId} dateRange={dateRange} dataLoading={dataLoading} />
					</motion.div>
				)}

				{detail && (
					<motion.div variants={itemVariant}>
						<OutletProfileCard detail={detail} />
					</motion.div>
				)}
			</motion.div>
		</PageTransition>
	);
}
