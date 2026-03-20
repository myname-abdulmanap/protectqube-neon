'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, BarChart2, Database } from 'lucide-react';
import { PageTransition } from '@/components/ui/page-transition';

import { RealtimePowerCard } from '@/components/electricity/detail/RealtimePowerCard';
import { PowerMeterCard } from '@/components/electricity/detail/PowerMeterCard';
import { TrendChartCard } from '@/components/electricity/detail/TrendChartCard';
import { PeakPowerChartCard } from '@/components/electricity/detail/PeakPowerChartCard';
import { PeakEnergyChartCard } from '@/components/electricity/detail/PeakEnergyChartCard';
import { HistoryTableCard } from '@/components/electricity/detail/HistoryTableCard';
import { OutletProfileCard } from '@/components/electricity/detail/OutletProfileCard';
import { HourlyEnergyCard } from '@/components/electricity/detail/HourlyEnergyCard';
import { DateFilter, type DateRange, buildRange } from '@/components/electricity/detail/DateFilter';
import { DataLoadingOverlay } from '@/components/electricity/detail/DataLoadingOverlay';

import { deviceMetricsApi, energyDashboardApi, type EnergyOutletDetail } from '@/lib/api';
import { exportToExcel, exportToPdf } from '@/lib/report-export';
import {
	ExportModal,
	type ExportFormat,
	type ExportPeriod,
	type ExportOption,
} from '@/components/dashboard/ExportModal';

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
		peakPowerAt: string | null;
		avgPowerKw: number;
		avgVoltageV: number;
		avgCurrentA: number;
		avgPfSigma: number;
		totalEnergyKwh: number;
		totalKvarh: number;
		peakHour: number | null;
		peakHourAvgKw: number;
		overallAvgKwPerHour: number;
		peakHourAvgKwh: number;
		overallAvgKwhPerHour: number;
	};
	startingPoint: {
		startAt: string;
		initialKwh: number;
	} | null;
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

const normalizePowerToKw = (value: number) => (Number.isFinite(value) && value > 1000 ? value / 1000 : value);

function adaptApiResponse(raw: EnergyOutletDetail): OutletDetailPayload {
	type ExtendedRaw = EnergyOutletDetail & {
		latestMetrics?: Record<string, { value: number; unit: string | null; timestamp: string }>;
		timeSeries?: Array<{ timestamp: string; metricKey: string; metricValue: unknown }>;
		analytics?: Partial<OutletDetailPayload['analytics']>;
		capacityVa?: number | null;
		maxLoadKw?: number | null;
		startingPoint?: OutletDetailPayload['startingPoint'];
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
			metricValue:
				r.metricKey === 'power_total'
					? normalizePowerToKw(Number(r.metricValue ?? 0))
					: Number(r.metricValue ?? 0),
		})),
		analytics: {
			peakPowerKw: normalizePowerToKw(Number(ext.analytics?.peakPowerKw ?? raw.peakPower ?? 0)),
			peakPowerAt: ext.analytics?.peakPowerAt ?? null,
			avgPowerKw: normalizePowerToKw(Number(ext.analytics?.avgPowerKw ?? 0)),
			avgVoltageV: Number(ext.analytics?.avgVoltageV ?? 0),
			avgCurrentA: Number(ext.analytics?.avgCurrentA ?? 0),
			avgPfSigma: Number(ext.analytics?.avgPfSigma ?? 0),
			totalEnergyKwh: Number(ext.analytics?.totalEnergyKwh ?? raw.kpiData?.totalUsage ?? 0),
			totalKvarh: Number(ext.analytics?.totalKvarh ?? 0),
			peakHour: ext.analytics?.peakHour ?? null,
			peakHourAvgKw: Number(ext.analytics?.peakHourAvgKw ?? ext.analytics?.peakHourAvgKwh ?? 0),
			overallAvgKwPerHour: Number(ext.analytics?.overallAvgKwPerHour ?? ext.analytics?.overallAvgKwhPerHour ?? 0),
			peakHourAvgKwh: Number(ext.analytics?.peakHourAvgKwh ?? 0),
			overallAvgKwhPerHour: Number(ext.analytics?.overallAvgKwhPerHour ?? 0),
		},
		startingPoint: ext.startingPoint ?? null,
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

const container = {
	hidden: { opacity: 0 },
	visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemVariant = {
	hidden: { opacity: 0, y: 12 },
	visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
};

const roundN = (v: number, d = 2) => Number(v.toFixed(d));
function mv(metrics: OutletDetailPayload['latestMetrics'], key: string): number {
	return metrics[key]?.value ?? 0;
}

const applyStartPointOffset = (
	rawValue: number,
	startingPoint: OutletDetailPayload['startingPoint'],
	timestamp?: string,
) => {
	if (!startingPoint) return Number(rawValue.toFixed(2));
	const startAt = new Date(startingPoint.startAt);
	if (!Number.isNaN(startAt.getTime()) && timestamp) {
		const metricTs = new Date(timestamp);
		if (!Number.isNaN(metricTs.getTime()) && metricTs < startAt) return 0;
	}
	return Number(Math.max(0, rawValue - Number(startingPoint.initialKwh ?? 0)).toFixed(2));
};

const normalizeExportPeriod = (period: ExportPeriod) => {
	const fromDate = new Date(period.from);
	const toDate = new Date(period.to);
	if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime()))
		throw new Error('Periode export tidak valid');
	const start = fromDate <= toDate ? fromDate : toDate;
	const end = fromDate <= toDate ? toDate : fromDate;
	return {
		fromIso: start.toISOString(),
		toIso: end.toISOString(),
		label: `${start.toLocaleString('id-ID')} - ${end.toLocaleString('id-ID')}`,
	};
};

export default function ElectricityOutletDetailPage() {
	const params = useParams<{ scopeId: string }>();
	const scopeId = params.scopeId;

	const [dateRange, setDateRange] = useState<DateRange>(buildRange('today'));
	const [detail, setDetail] = useState<OutletDetailPayload | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [timeSeries, setTimeSeries] = useState<OutletDetailPayload['timeSeries']>([]);

	const [dataLoading, setDataLoading] = useState(false);
	const [loadedFrom, setLoadedFrom] = useState('');
	const [loadedTo, setLoadedTo] = useState('');

	const [latestMetrics, setLatestMetrics] = useState<OutletDetailPayload['latestMetrics']>({});
	const [realtimeLastUpdated, setRealtimeLastUpdated] = useState<string | null>(null);
	const [isMounted, setIsMounted] = useState(false);
	const [refreshTick, setRefreshTick] = useState(0);

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
		if (latestTs) {
			setRealtimeLastUpdated(latestTs);
			setRefreshTick((t) => t + 1);
		}
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
		const energyTotal = roundN(
			applyStartPointOffset(
				g('energy_total'),
				detail?.startingPoint ?? null,
				latestMetrics['energy_total']?.timestamp,
			),
		);
		const kvarh = roundN(g('kvarh'));
		const penaltyKvarh = energyTotal > 0 ? Math.max(0, Number((kvarh - 0.62 * energyTotal).toFixed(3))) : 0;
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
			energyTotal: roundN(
				applyStartPointOffset(
					g('energy_total'),
					detail?.startingPoint ?? null,
					latestMetrics['energy_total']?.timestamp,
				),
			),
			kvarh: roundN(g('kvarh')),
			frequency: roundN(g('frequency'), 1),
			penaltyKvarh,
		};
	}, [detail?.startingPoint, latestMetrics]);

	const handleExportProcessed = async (format: ExportFormat, period: ExportPeriod) => {
		if (!detail) return;
		const { fromIso, toIso, label: periodLabel } = normalizeExportPeriod(period);

		const fromDate = new Date(fromIso);
		const toDate = new Date(toIso);
		const diffMs = toDate.getTime() - fromDate.getTime();
		const diffHours = diffMs / (1000 * 60 * 60);
		const useHourInterval = diffHours < 24;
		const toDateInclusive = new Date(toDate.getTime() + (useHourInterval ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000));
		const MONTHS_ID = [
			'Januari',
			'Februari',
			'Maret',
			'April',
			'Mei',
			'Juni',
			'Juli',
			'Agustus',
			'September',
			'Oktober',
			'November',
			'Desember',
		];

		type RawHistoryRow = {
			timestamp: string;
			voltage_l1: number | null;
			voltage_l2: number | null;
			voltage_l3: number | null;
			current_l1: number | null;
			current_l2: number | null;
			current_l3: number | null;
			current_total: number | null;
			power_l1: number | null;
			power_l2: number | null;
			power_l3: number | null;
			power_total: number | null;
			energy_total: number | null;
			pf_sigma: number | null;
		};

		const allHistoryRows: RawHistoryRow[] = [];
		let cursor: string | null = null;
		let fetchMore = true;
		while (fetchMore) {
			const res = await energyDashboardApi.getOutletHistory(scopeId, {
				from: fromIso,
				to: toDateInclusive.toISOString(),
				cursor: cursor ?? undefined,
				pageSize: 500,
			});
			if (!res.success || !res.data) break;
			allHistoryRows.push(...(res.data.rows as RawHistoryRow[]));
			cursor = res.data.nextCursor;
			fetchMore = !!cursor;
		}

		const hourlyRes = await energyDashboardApi.getHourlyDailyEnergy(
			scopeId,
			fromIso,
			toDateInclusive.toISOString(),
		);
		const hourlyDays = hourlyRes.success && hourlyRes.data ? hourlyRes.data.days : [];

		const getJakartaParts = (date: Date) => {
			const parts = new Intl.DateTimeFormat('en-CA', {
				timeZone: 'Asia/Jakarta',
				year: 'numeric',
				month: '2-digit',
				day: '2-digit',
				hour: '2-digit',
				hour12: false,
			}).formatToParts(date);
			const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
			return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour') };
		};

		const fmtBucketLabelHour = (ts: Date) => {
			const d = String(ts.getDate()).padStart(2, '0');
			const mo = MONTHS_ID[ts.getMonth()];
			const h = String(ts.getHours()).padStart(2, '0');
			return `${d} ${mo} ${ts.getFullYear()}, ${h}:00 WIB`;
		};

		const fmtBucketLabelDay = (ts: Date) => {
			const d = String(ts.getDate()).padStart(2, '0');
			const mo = MONTHS_ID[ts.getMonth()];
			return `${d} ${mo} ${ts.getFullYear()}`;
		};

		type SlotAcc = {
			powerSum: number;
			powerCount: number;
			voltL1Sum: number;
			voltL1Count: number;
			voltL2Sum: number;
			voltL2Count: number;
			voltL3Sum: number;
			voltL3Count: number;
			currL1Sum: number;
			currL1Count: number;
			currL2Sum: number;
			currL2Count: number;
			currL3Sum: number;
			currL3Count: number;
			currTotalSum: number;
			currTotalCount: number;
			pfSum: number;
			pfCount: number;
		};

		const makeAcc = (): SlotAcc => ({
			powerSum: 0,
			powerCount: 0,
			voltL1Sum: 0,
			voltL1Count: 0,
			voltL2Sum: 0,
			voltL2Count: 0,
			voltL3Sum: 0,
			voltL3Count: 0,
			currL1Sum: 0,
			currL1Count: 0,
			currL2Sum: 0,
			currL2Count: 0,
			currL3Sum: 0,
			currL3Count: 0,
			currTotalSum: 0,
			currTotalCount: 0,
			pfSum: 0,
			pfCount: 0,
		});

		const addToAcc = (acc: SlotAcc, key: string, val: number) => {
			const v = Number(val);
			if (!isFinite(v)) return;
			switch (key) {
				case 'power_total': {
					if (v <= 0) return;
					const pwr = v > 1000 ? v / 1000 : v;
					acc.powerSum += pwr;
					acc.powerCount += 1;
					break;
				}
				case 'voltage_l1':
					if (v <= 0) return;
					acc.voltL1Sum += v;
					acc.voltL1Count += 1;
					break;
				case 'voltage_l2':
					if (v <= 0) return;
					acc.voltL2Sum += v;
					acc.voltL2Count += 1;
					break;
				case 'voltage_l3':
					if (v <= 0) return;
					acc.voltL3Sum += v;
					acc.voltL3Count += 1;
					break;
				case 'current_l1':
					if (v <= 0) return;
					acc.currL1Sum += v;
					acc.currL1Count += 1;
					break;
				case 'current_l2':
					if (v <= 0) return;
					acc.currL2Sum += v;
					acc.currL2Count += 1;
					break;
				case 'current_l3':
					if (v <= 0) return;
					acc.currL3Sum += v;
					acc.currL3Count += 1;
					break;
				case 'current_total':
					if (v <= 0) return;
					acc.currTotalSum += v;
					acc.currTotalCount += 1;
					break;
				case 'pf_sigma':
					if (v <= 0 || v > 1) return;
					acc.pfSum += v;
					acc.pfCount += 1;
					break;
			}
		};

		const hourlyAccMap = new Map<string, SlotAcc>();
		const dailyAccMap = new Map<string, SlotAcc>();

		const ingestTimeSeries = (rows: Array<{ timestamp: string; metricKey: string; metricValue: number }>) => {
			for (const row of rows) {
				const d = new Date(row.timestamp);
				if (isNaN(d.getTime())) continue;
				const p = getJakartaParts(d);
				const hKey = `${p.year}-${p.month}-${p.day}-${p.hour}`;
				const dKey = `${p.year}-${p.month}-${p.day}`;
				const hAcc = hourlyAccMap.get(hKey) ?? makeAcc();
				const dAcc = dailyAccMap.get(dKey) ?? makeAcc();
				addToAcc(hAcc, row.metricKey, row.metricValue);
				addToAcc(dAcc, row.metricKey, row.metricValue);
				hourlyAccMap.set(hKey, hAcc);
				dailyAccMap.set(dKey, dAcc);
			}
		};

		if (useHourInterval) {
			const tsRes = await energyDashboardApi.getOutletDetail(scopeId, {
				from: fromIso,
				to: toDateInclusive.toISOString(),
			});
			const ts =
				tsRes.success && tsRes.data
					? ((
							tsRes.data as unknown as {
								timeSeries?: Array<{ timestamp: string; metricKey: string; metricValue: number }>;
							}
						).timeSeries ?? [])
					: [];
			ingestTimeSeries(ts);
		} else {
			const dayKeys = hourlyDays.map((d) => d.date).sort();
			await Promise.all(
				dayKeys.map(async (dayKey) => {
					const dayFrom = new Date(`${dayKey}T00:00:00+07:00`).toISOString();
					const dayTo = new Date(`${dayKey}T23:59:59+07:00`).toISOString();
					const tsRes = await energyDashboardApi.getOutletDetail(scopeId, {
						from: dayFrom,
						to: dayTo,
					});
					const ts =
						tsRes.success && tsRes.data
							? ((
									tsRes.data as unknown as {
										timeSeries?: Array<{
											timestamp: string;
											metricKey: string;
											metricValue: number;
										}>;
									}
								).timeSeries ?? [])
							: [];
					ingestTimeSeries(ts);
				}),
			);
		}

		for (const r of allHistoryRows) {
			if (r.pf_sigma === null || r.pf_sigma === undefined) continue;
			const v = Number(r.pf_sigma);
			if (!isFinite(v) || v <= 0 || v > 1) continue;
			const d = new Date(r.timestamp);
			if (isNaN(d.getTime())) continue;
			const p = getJakartaParts(d);
			const hKey = `${p.year}-${p.month}-${p.day}-${p.hour}`;
			const dKey = `${p.year}-${p.month}-${p.day}`;
			const hAcc = hourlyAccMap.get(hKey) ?? makeAcc();
			if (hAcc.pfCount === 0) {
				hAcc.pfSum += v;
				hAcc.pfCount += 1;
			}
			hourlyAccMap.set(hKey, hAcc);
			const dAcc = dailyAccMap.get(dKey) ?? makeAcc();
			if (dAcc.pfCount === 0) {
				dAcc.pfSum += v;
				dAcc.pfCount += 1;
			}
			dailyAccMap.set(dKey, dAcc);
		}

		const avgOrNull = (sum: number, count: number, decimals = 2): number | null =>
			count > 0 ? Number((sum / count).toFixed(decimals)) : null;

		const resolveSlotAvg = (acc: SlotAcc) => ({
			avgPowerKw: avgOrNull(acc.powerSum, acc.powerCount, 3),
			avgVoltL1: avgOrNull(acc.voltL1Sum, acc.voltL1Count, 1),
			avgVoltL2: avgOrNull(acc.voltL2Sum, acc.voltL2Count, 1),
			avgVoltL3: avgOrNull(acc.voltL3Sum, acc.voltL3Count, 1),
			avgCurrL1: avgOrNull(acc.currL1Sum, acc.currL1Count, 2),
			avgCurrL2: avgOrNull(acc.currL2Sum, acc.currL2Count, 2),
			avgCurrL3: avgOrNull(acc.currL3Sum, acc.currL3Count, 2),
			avgCurrTotal: avgOrNull(acc.currTotalSum, acc.currTotalCount, 2),
			avgPf: avgOrNull(acc.pfSum, acc.pfCount, 3),
		});

		type EnergyBucket = {
			timestamp: string;
			label: string;
			energyKwh: number | null;
			avgPowerKw: number | null;
			avgVoltL1: number | null;
			avgVoltL2: number | null;
			avgVoltL3: number | null;
			avgCurrL1: number | null;
			avgCurrL2: number | null;
			avgCurrL3: number | null;
			avgCurrTotal: number | null;
			avgPf: number | null;
		};

		const hourlyBuckets: EnergyBucket[] = [];
		for (const day of hourlyDays) {
			for (const hour of day.hours) {
				if (!hour.hasData) continue;
				const ts = new Date(`${day.date}T${String(hour.hour).padStart(2, '0')}:00:00+07:00`);
				const tsJkt = getJakartaParts(ts);
				const hKey = `${tsJkt.year}-${tsJkt.month}-${tsJkt.day}-${tsJkt.hour}`;
				hourlyBuckets.push({
					timestamp: ts.toISOString(),
					label: fmtBucketLabelHour(ts),
					energyKwh: hour.energyKwh > 0 ? Number(hour.energyKwh.toFixed(3)) : null,
					...resolveSlotAvg(hourlyAccMap.get(hKey) ?? makeAcc()),
				});
			}
		}

		const dailyBuckets: EnergyBucket[] = [];
		for (const day of hourlyDays) {
			if (day.totalKwh <= 0) continue;
			const ts = new Date(`${day.date}T00:00:00+07:00`);
			const tsJkt = getJakartaParts(ts);
			const dKey = `${tsJkt.year}-${tsJkt.month}-${tsJkt.day}`;
			dailyBuckets.push({
				timestamp: ts.toISOString(),
				label: fmtBucketLabelDay(ts),
				energyKwh: Number(day.totalKwh.toFixed(3)),
				...resolveSlotAvg(dailyAccMap.get(dKey) ?? makeAcc()),
			});
		}

		const hourlyByDay = new Map<string, EnergyBucket[]>();
		for (const bucket of hourlyBuckets) {
			const p = getJakartaParts(new Date(bucket.timestamp));
			const dKey = `${p.year}-${p.month}-${p.day}`;
			const existing = hourlyByDay.get(dKey) ?? [];
			existing.push(bucket);
			hourlyByDay.set(dKey, existing);
		}

		const daySheetLabel = (dKey: string): string => {
			const buckets = hourlyByDay.get(dKey);
			if (!buckets?.length) return dKey;
			const ts = new Date(buckets[0]!.timestamp);
			const d = String(ts.getDate()).padStart(2, '0');
			const mo = MONTHS_ID[ts.getMonth()];
			return `${d} ${mo}`;
		};

		const primaryBuckets = useHourInterval ? hourlyBuckets : dailyBuckets;
		const validEnergy = primaryBuckets.map((b) => b.energyKwh).filter((v): v is number => v !== null && v > 0);
		const totalEnergyKwh = Number(validEnergy.reduce((s, v) => s + v, 0).toFixed(3));
		const avgEnergyKwh = Number((validEnergy.length ? totalEnergyKwh / validEnergy.length : 0).toFixed(3));
		const peakBucket =
			[...primaryBuckets]
				.slice(0, -1)
				.reduce<EnergyBucket | null>(
					(best, b) => ((b.energyKwh ?? -Infinity) > (best?.energyKwh ?? -Infinity) ? b : best),
					null,
				) ??
			primaryBuckets.reduce<EnergyBucket | null>(
				(best, b) => ((b.energyKwh ?? -Infinity) > (best?.energyKwh ?? -Infinity) ? b : best),
				null,
			);

		const globalAcc = makeAcc();
		for (const acc of hourlyAccMap.values()) {
			globalAcc.powerSum += acc.powerSum;
			globalAcc.powerCount += acc.powerCount;
			globalAcc.voltL1Sum += acc.voltL1Sum;
			globalAcc.voltL1Count += acc.voltL1Count;
			globalAcc.voltL2Sum += acc.voltL2Sum;
			globalAcc.voltL2Count += acc.voltL2Count;
			globalAcc.voltL3Sum += acc.voltL3Sum;
			globalAcc.voltL3Count += acc.voltL3Count;
			globalAcc.currTotalSum += acc.currTotalSum;
			globalAcc.currTotalCount += acc.currTotalCount;
		}

		const analytics = {
			peakPowerKw: Number(
				(globalAcc.powerCount > 0
					? Math.max(
							...Array.from(hourlyAccMap.values()).map((a) =>
								a.powerCount > 0 ? a.powerSum / a.powerCount : 0,
							),
						)
					: 0
				).toFixed(2),
			),
			peakAt: peakBucket?.label ?? '-',
			avgPowerKw: avgOrNull(globalAcc.powerSum, globalAcc.powerCount, 2) ?? 0,
			avgVoltageV: avgOrNull(globalAcc.voltL1Sum, globalAcc.voltL1Count, 1) ?? 0,
			avgCurrentA: avgOrNull(globalAcc.currTotalSum, globalAcc.currTotalCount, 2) ?? 0,
			totalEnergyKwh,
			avgEnergyKwh,
		};

		const pemakaianColumns = [
			'Waktu / Tanggal',
			'Energy (kWh)',
			'Avg Power (kW)',
			'Avg V-R (V)',
			'Avg V-S (V)',
			'Avg V-T (V)',
			'Avg A-R (A)',
			'Avg A-S (A)',
			'Avg A-T (A)',
			'Avg A-Total (A)',
			'Avg PF',
		];

		const bucketToRow = (b: EnergyBucket): Array<string | number> => [
			b.label,
			String(b.energyKwh ?? '-'),
			String(b.avgPowerKw ?? '-'),
			String(b.avgVoltL1 ?? '-'),
			String(b.avgVoltL2 ?? '-'),
			String(b.avgVoltL3 ?? '-'),
			String(b.avgCurrL1 ?? '-'),
			String(b.avgCurrL2 ?? '-'),
			String(b.avgCurrL3 ?? '-'),
			String(b.avgCurrTotal ?? '-'),
			String(b.avgPf ?? '-'),
		];

		const bucketToExcelRow = (b: EnergyBucket): Record<string, string | number | null> => ({
			'Waktu / Tanggal': b.label,
			'Energy (kWh)': b.energyKwh ?? '-',
			'Avg Power (kW)': b.avgPowerKw ?? '-',
			'Avg Voltage R (V)': b.avgVoltL1 ?? '-',
			'Avg Voltage S (V)': b.avgVoltL2 ?? '-',
			'Avg Voltage T (V)': b.avgVoltL3 ?? '-',
			'Avg Current R (A)': b.avgCurrL1 ?? '-',
			'Avg Current S (A)': b.avgCurrL2 ?? '-',
			'Avg Current T (A)': b.avgCurrL3 ?? '-',
			'Avg Total Current (A)': b.avgCurrTotal ?? '-',
			'Avg Power Factor': b.avgPf ?? '-',
		});

		const summaryBlock = [
			`Outlet: ${detail.name}`,
			`Region: ${detail.region ?? '-'}`,
			`Alamat: ${detail.address ?? '-'}`,
			`Periode: ${periodLabel}`,
			`Capacity (VA): ${detail.capacityVa ?? '-'}`,
			`Jumlah Device: ${detail.devices.length}`,
		];

		const infoDeviceTablePdf = {
			title: 'Info Device',
			columns: ['Nama Device', 'Serial No', 'Lokasi', 'Tipe', 'Status', 'Terakhir Online', 'Modul'],
			rows: detail.devices.map((device) => [
				device.name,
				device.serialNo,
				device.locationName ?? '-',
				device.locationType ?? '-',
				device.status,
				device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString('id-ID') : '-',
				device.moduleTypes.join(', ') || '-',
			]),
		};

		const infoDeviceExcelRows = detail.devices.map((device) => ({
			'Nama Device': device.name,
			'Serial No': device.serialNo,
			Lokasi: device.locationName ?? '-',
			'Tipe Lokasi': device.locationType ?? '-',
			Status: device.status,
			'Terakhir Online': device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString('id-ID') : '-',
			Modul: device.moduleTypes.join(', ') || '-',
		}));

		const analyticsTablePdf = {
			title: 'Analytics',
			columns: ['Metric', 'Nilai'],
			rows: [
				['Waktu Peak', analytics.peakAt],
				['Total Pemakaian (kWh)', analytics.totalEnergyKwh],
				['Avg Pemakaian (kWh)', analytics.avgEnergyKwh],
				['Peak Power (kW)', analytics.peakPowerKw],
				['Avg Power (kW)', analytics.avgPowerKw],
				['Avg Voltage (V)', analytics.avgVoltageV],
				['Avg Current (A)', analytics.avgCurrentA],
			],
		};

		const analyticsExcelRow = {
			'Waktu Peak': analytics.peakAt,
			'Total Pemakaian (kWh)': analytics.totalEnergyKwh,
			'Avg Pemakaian (kWh)': analytics.avgEnergyKwh,
			'Peak Power (kW)': analytics.peakPowerKw,
			'Avg Power (kW)': analytics.avgPowerKw,
			'Avg Voltage (V)': analytics.avgVoltageV,
			'Avg Current (A)': analytics.avgCurrentA,
		};

		const sortedDayKeys = Array.from(hourlyByDay.keys()).sort();

		if (format === 'excel') {
			const sheets: Array<{ name: string; rows: Array<Record<string, string | number | null>> }> = [];

			sheets.push({
				name: 'Summary',
				rows: [
					{
						Outlet: detail.name,
						Region: detail.region ?? '-',
						Alamat: detail.address ?? '-',
						Periode: periodLabel,
						'Capacity (VA)': detail.capacityVa ?? '-',
						'Jumlah Device': detail.devices.length,
					},
				],
			});
			sheets.push({ name: 'Info Device', rows: infoDeviceExcelRows });
			sheets.push({ name: 'Analytics', rows: [analyticsExcelRow] });

			if (!useHourInterval) {
				sheets.push({ name: 'Pemakaian (Per Hari)', rows: dailyBuckets.map(bucketToExcelRow) });
				for (const dKey of sortedDayKeys) {
					const dayBuckets = hourlyByDay.get(dKey) ?? [];
					if (!dayBuckets.length) continue;
					sheets.push({ name: `Per Jam ${daySheetLabel(dKey)}`, rows: dayBuckets.map(bucketToExcelRow) });
				}
			} else {
				sheets.push({ name: 'Pemakaian (Per Jam)', rows: hourlyBuckets.map(bucketToExcelRow) });
			}

			await exportToExcel(`outlet-processed-${detail.id}.xlsx`, sheets);
		} else {
			const tables: Array<{ title: string; columns: string[]; rows: Array<Array<string | number>> }> = [];

			tables.push(infoDeviceTablePdf);
			tables.push(analyticsTablePdf);

			if (!useHourInterval) {
				tables.push({
					title: 'Pemakaian (Per Hari)',
					columns: pemakaianColumns,
					rows: dailyBuckets.map(bucketToRow),
				});
				for (const dKey of sortedDayKeys) {
					const dayBuckets = hourlyByDay.get(dKey) ?? [];
					if (!dayBuckets.length) continue;
					tables.push({
						title: `Pemakaian Per Jam — ${daySheetLabel(dKey)}`,
						columns: pemakaianColumns,
						rows: dayBuckets.map(bucketToRow),
					});
				}
			} else {
				tables.push({
					title: 'Pemakaian (Per Jam)',
					columns: pemakaianColumns,
					rows: hourlyBuckets.map(bucketToRow),
				});
			}

			await exportToPdf({
				fileName: `outlet-processed-${detail.id}.pdf`,
				title: 'Aggregated Data Outlet',
				scopeName: detail.name,
				period: periodLabel,
				generatedAt: new Date().toLocaleString('id-ID'),
				summary: summaryBlock,
				tables,
			});
		}
	};

	const handleExportRaw = async (format: ExportFormat, period: ExportPeriod) => {
		if (!detail) return;
		const { fromIso, label: periodLabel } = normalizeExportPeriod(period);
		const toDate = new Date(normalizeExportPeriod(period).toIso);
		const toDateInclusive = new Date(toDate.getTime() + 24 * 60 * 60 * 1000);

		type RawHistoryRow = {
			timestamp: string;
			voltage_l1: number | null;
			voltage_l2: number | null;
			voltage_l3: number | null;
			current_l1: number | null;
			current_l2: number | null;
			current_l3: number | null;
			current_total: number | null;
			power_l1: number | null;
			power_l2: number | null;
			power_l3: number | null;
			power_total: number | null;
			energy_total: number | null;
			pf_sigma: number | null;
		};

		const normHistPower = (v: number | null): number | null => {
			if (v === null) return null;
			return Number(normalizePowerToKw(v).toFixed(3));
		};

		const fmtTs = (ts: string) => {
			try {
				const MONTHS_ID_RAW = [
					'Januari',
					'Februari',
					'Maret',
					'April',
					'Mei',
					'Juni',
					'Juli',
					'Agustus',
					'September',
					'Oktober',
					'November',
					'Desember',
				];
				const d = new Date(ts);
				const day = String(d.getDate()).padStart(2, '0');
				const mon = MONTHS_ID_RAW[d.getMonth()] ?? '';
				const hh = String(d.getHours()).padStart(2, '0');
				const mm = String(d.getMinutes()).padStart(2, '0');
				return `${day} ${mon} ${hh}:${mm}`;
			} catch {
				return ts;
			}
		};

		const allRawRows: RawHistoryRow[] = [];
		let cursor: string | null = null;
		let fetchMore = true;
		while (fetchMore) {
			const res = await energyDashboardApi.getOutletHistory(scopeId, {
				from: fromIso,
				to: toDateInclusive.toISOString(),
				cursor: cursor ?? undefined,
				pageSize: 500,
			});
			if (!res.success || !res.data) break;
			allRawRows.push(...(res.data.rows as RawHistoryRow[]));
			cursor = res.data.nextCursor;
			fetchMore = !!cursor;
		}

		const summaryData = {
			Outlet: detail.name,
			Region: detail.region ?? '-',
			Alamat: detail.address ?? '-',
			Periode: periodLabel,
			'Capacity (VA)': detail.capacityVa ?? '-',
			'Jumlah Device': detail.devices.length,
		};

		const deviceRows = detail.devices.map((device) => ({
			'Nama Device': device.name,
			'Serial No': device.serialNo,
			Lokasi: device.locationName ?? '-',
			'Tipe Lokasi': device.locationType ?? '-',
			Status: device.status,
			'Terakhir Online': device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString('id-ID') : '-',
			Modul: device.moduleTypes.join(', ') || '-',
		}));

		const rawDataRows = allRawRows.map((r) => ({
			Time: fmtTs(r.timestamp),
			'Voltage R (V)': r.voltage_l1,
			'Voltage S (V)': r.voltage_l2,
			'Voltage T (V)': r.voltage_l3,
			'Current R (A)': r.current_l1,
			'Current S (A)': r.current_l2,
			'Current T (A)': r.current_l3,
			'Total Current (A)': r.current_total,
			'Power R (kW)': normHistPower(r.power_l1),
			'Power S (kW)': normHistPower(r.power_l2),
			'Power T (kW)': normHistPower(r.power_l3),
			'Total Power (kW)': normHistPower(r.power_total),
			'Energy (kWh)': r.energy_total,
			'Power Factor': r.pf_sigma,
		}));

		if (format === 'excel') {
			await exportToExcel(`outlet-raw-${detail.id}.xlsx`, [
				{ name: 'Summary', rows: [summaryData] },
				{ name: 'Info Device', rows: deviceRows },
				{ name: 'Historical Data', rows: rawDataRows },
			]);
		} else {
			await exportToPdf({
				fileName: `outlet-raw-${detail.id}.pdf`,
				title: 'Raw Data Outlet',
				scopeName: detail.name,
				period: periodLabel,
				generatedAt: new Date().toLocaleString('id-ID'),
				summary: [
					`Outlet: ${detail.name}`,
					`Region: ${detail.region ?? '-'}`,
					`Alamat: ${detail.address ?? '-'}`,
					`Periode: ${periodLabel}`,
					`Capacity (VA): ${detail.capacityVa ?? '-'}`,
					`Jumlah Device: ${detail.devices.length}`,
				],
				tables: [
					{
						title: 'Info Device',
						columns: ['Nama Device', 'Serial No', 'Lokasi', 'Tipe', 'Status', 'Terakhir Online', 'Modul'],
						rows: detail.devices.map((device) => [
							device.name,
							device.serialNo,
							device.locationName ?? '-',
							device.locationType ?? '-',
							device.status,
							device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString('id-ID') : '-',
							device.moduleTypes.join(', ') || '-',
						]),
					},
					{
						title: 'Historical Data',
						columns: [
							'Time',
							'V R',
							'V S',
							'V T',
							'A R',
							'A S',
							'A T',
							'A Total',
							'P R',
							'P S',
							'P T',
							'P Total',
							'Energy (kWh)',
							'PF',
						],
						rows: allRawRows.map((r) => [
							fmtTs(r.timestamp),
							String(r.voltage_l1 ?? '-'),
							String(r.voltage_l2 ?? '-'),
							String(r.voltage_l3 ?? '-'),
							String(r.current_l1 ?? '-'),
							String(r.current_l2 ?? '-'),
							String(r.current_l3 ?? '-'),
							String(r.current_total ?? '-'),
							String(normHistPower(r.power_l1) ?? '-'),
							String(normHistPower(r.power_l2) ?? '-'),
							String(normHistPower(r.power_l3) ?? '-'),
							String(normHistPower(r.power_total) ?? '-'),
							String(r.energy_total ?? '-'),
							String(r.pf_sigma ?? '-'),
						]),
					},
				],
			});
		}
	};

	const exportOptions: ExportOption[] = useMemo(
		() => [
			{
				value: 'processed',
				label: 'Aggregated Data',
				description: 'Pemakaian & analytics per periode',
				icon: <BarChart2 className='h-4 w-4' />,
				onExport: handleExportProcessed,
			},
			{
				value: 'raw',
				label: 'Raw Data',
				description: 'Semua data mentah dari device',
				icon: <Database className='h-4 w-4' />,
				onExport: handleExportRaw,
			},
		],
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[detail, scopeId],
	);

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
				<div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
					<div className='rounded-xl bg-muted/30 animate-pulse h-80' />
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
			<motion.div className='p-5 space-y-6' initial='hidden' animate='visible' variants={container}>
				<motion.div variants={itemVariant} className='flex items-center justify-between flex-wrap gap-3'>
					<div className='flex items-center gap-3'>
						<Link href='/dashboard/electricity'>
							<ArrowLeft className='w-9 h-9 rounded-full border p-2 transition-colors border-border text-muted-foreground hover:text-foreground hover:border-foreground' />
						</Link>
						<div>
							<h1 className='text-lg sm:text-xl font-semibold tracking-tight text-foreground'>
								{detail?.name ?? 'Outlet Detail'}
							</h1>
							<p className='text-base sm:text-sm text-muted-foreground mt-0.5'>
								{detail?.address ?? detail?.region ?? ''}
							</p>
						</div>
					</div>
					<div className='flex items-center gap-2'>
						<DateFilter value={dateRange} onChange={handleDateRangeChange} />
						<ExportModal options={exportOptions} disabled={!detail || loading} />
					</div>
				</motion.div>

				<motion.div variants={itemVariant} className='grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch'>
					<RealtimePowerCard
						scopeId={scopeId}
						powerTotal={pmValues.powerTotal}
						apparentTotal={pmValues.vaSigma}
						capacityVa={detail?.capacityVa ?? null}
						isOffline={isOffline}
						lastUpdated={realtimeLastUpdated}
						refreshTick={refreshTick}
					/>
					<div className='lg:col-span-2'>
						<PowerMeterCard values={pmValues} />
					</div>
				</motion.div>

				{detail && (
					<motion.div variants={itemVariant} className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
						<div className='relative'>
							<DataLoadingOverlay isLoading={dataLoading} label={overlayLabel} />
							<PeakEnergyChartCard timeSeries={timeSeries} loadedFrom={loadedFrom} loadedTo={loadedTo} />
						</div>
						<div className='relative'>
							<DataLoadingOverlay isLoading={dataLoading} label={overlayLabel} />
							<PeakPowerChartCard timeSeries={timeSeries} loadedFrom={loadedFrom} loadedTo={loadedTo} />
						</div>
					</motion.div>
				)}

				{detail && (
					<motion.div variants={itemVariant}>
						<div className='relative'>
							<DataLoadingOverlay isLoading={dataLoading} label={overlayLabel} />
							<TrendChartCard timeSeries={timeSeries} loadedFrom={loadedFrom} loadedTo={loadedTo} />
						</div>
					</motion.div>
				)}

				{detail && (
					<motion.div variants={itemVariant}>
						<HourlyEnergyCard scopeId={scopeId} />
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
