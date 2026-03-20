'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
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
import { ExportModal, type ExportFormat, type ExportPeriod } from '@/components/dashboard/ExportModal';

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

	const handleExport = async (format: ExportFormat, period: ExportPeriod) => {
		if (!detail) return;
		const { fromIso, toIso, label: periodLabel } = normalizeExportPeriod(period);

		const fromDate = new Date(fromIso);
		const toDate = new Date(toIso);
		const diffMs = toDate.getTime() - fromDate.getTime();
		const diffHours = diffMs / (1000 * 60 * 60);
		const useHourInterval = diffHours < 24;
		const toDateInclusive = new Date(toDate.getTime() + (useHourInterval ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000));
		const MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

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

		const fmtTs = (ts: string) => {
			try {
				const d = new Date(ts);
				const day = String(d.getDate()).padStart(2, '0');
				const mon = d.toLocaleString('en-GB', { month: 'short' });
				const year = d.getFullYear();
				if (!useHourInterval) {
					return `${day} ${mon} ${year}`;
				}
				const hh = String(d.getHours()).padStart(2, '0');
				const mm = String(d.getMinutes()).padStart(2, '0');
				return `${day} ${mon} ${hh}:${mm}`;
			} catch {
				return ts;
			}
		};

		const normHistPower = (v: number | null): number | null => {
			if (v === null) return null;
			return Number(normalizePowerToKw(v).toFixed(3));
		};

		const sampleHistoryRows = (rows: RawHistoryRow[]): RawHistoryRow[] => {
			if (rows.length === 0) return [];
			const sorted = [...rows]
				.filter((r) => {
					const t = new Date(r.timestamp);
					return t >= fromDate && t <= toDateInclusive;
				})
				.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

			if (diffHours >= 24) {
				const dayMap = new Map<string, RawHistoryRow>();
				for (const r of sorted) {
					const d = new Date(r.timestamp);
					const dk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
					dayMap.set(dk, r);
				}
				return Array.from(dayMap.entries())
					.sort(([a], [b]) => a.localeCompare(b))
					.map(([, r]) => r);
			} else {
				const hourMap = new Map<string, RawHistoryRow>();
				for (const r of sorted) {
					const d = new Date(r.timestamp);
					const slotMs = new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()).getTime();
					const hk = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`;
					const existing = hourMap.get(hk);
					if (!existing) {
						hourMap.set(hk, r);
					} else {
						const curDist = Math.abs(new Date(r.timestamp).getTime() - slotMs);
						const prevDist = Math.abs(new Date(existing.timestamp).getTime() - slotMs);
						if (curDist < prevDist) hourMap.set(hk, r);
					}
				}
				return Array.from(hourMap.values()).sort(
					(a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
				);
			}
		};

		const hourlyRes = await energyDashboardApi.getHourlyDailyEnergy(
			scopeId,
			fromIso,
			toDateInclusive.toISOString(),
		);
		const hourlyDays = hourlyRes.success && hourlyRes.data ? hourlyRes.data.days : [];

		type EnergyBucket = {
			timestamp: string;
			label: string;
			energyKwh: number | null;
			powerTotal: number | null;
			voltageL1: number | null;
			currentTotal: number | null;
			pfSigma: number | null;
		};

		const fmtBucketLabel = (ts: Date): string => {
			const d = String(ts.getDate()).padStart(2, '0');
			const mo = MONTHS_ID[ts.getMonth()];
			const y = ts.getFullYear();
			if (useHourInterval) {
				const h = String(ts.getHours()).padStart(2, '0');
				return `${d} ${mo} ${y}, ${h}:00 WIB`;
			}
			return `${d} ${mo} ${y}`;
		};

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

		const tsRes = await energyDashboardApi.getOutletDetail(scopeId, {
			from: fromIso,
			to: toDateInclusive.toISOString(),
		});
		const exportTimeSeries =
			tsRes.success && tsRes.data
				? ((
						tsRes.data as unknown as {
							timeSeries?: Array<{ timestamp: string; metricKey: string; metricValue: number }>;
						}
					).timeSeries ?? [])
				: [];

		const histPowerMap = new Map<string, { sum: number; count: number }>();
		for (const row of exportTimeSeries) {
			if (row.metricKey !== 'power_total') continue;
			const d = new Date(row.timestamp);
			if (isNaN(d.getTime())) continue;
			const rawPwr = Number(row.metricValue);
			const pwr = rawPwr > 1000 ? rawPwr / 1000 : rawPwr;
			if (!isFinite(pwr) || pwr <= 0) continue;
			const p = getJakartaParts(d);
			const key = useHourInterval ? `${p.year}-${p.month}-${p.day}-${p.hour}` : `${p.year}-${p.month}-${p.day}`;
			const cur = histPowerMap.get(key) ?? { sum: 0, count: 0 };
			cur.sum += pwr;
			cur.count += 1;
			histPowerMap.set(key, cur);
		}

		const energyBuckets: EnergyBucket[] = [];
		for (const day of hourlyDays) {
			if (useHourInterval) {
				for (const hour of day.hours) {
					if (!hour.hasData) continue;
					const ts = new Date(`${day.date}T${String(hour.hour).padStart(2, '0')}:00:00+07:00`);
					const tsJkt = getJakartaParts(ts);
					const hKey = `${tsJkt.year}-${tsJkt.month}-${tsJkt.day}-${tsJkt.hour}`;
					const hPwr = histPowerMap.get(hKey);
					energyBuckets.push({
						timestamp: ts.toISOString(),
						label: fmtBucketLabel(ts),
						energyKwh: hour.energyKwh > 0 ? Number(hour.energyKwh.toFixed(3)) : null,
						powerTotal: hPwr && hPwr.count > 0 ? Number((hPwr.sum / hPwr.count).toFixed(2)) : null,
						voltageL1: null,
						currentTotal: null,
						pfSigma: null,
					});
				}
			} else {
				if (day.totalKwh <= 0) continue;
				const ts = new Date(`${day.date}T00:00:00+07:00`);
				const tsJkt = getJakartaParts(ts);
				const dKey = `${tsJkt.year}-${tsJkt.month}-${tsJkt.day}`;
				const dPwr = histPowerMap.get(dKey);
				energyBuckets.push({
					timestamp: ts.toISOString(),
					label: fmtBucketLabel(ts),
					energyKwh: Number(day.totalKwh.toFixed(3)),
					powerTotal: dPwr && dPwr.count > 0 ? Number((dPwr.sum / dPwr.count).toFixed(2)) : null,
					voltageL1: null,
					currentTotal: null,
					pfSigma: null,
				});
			}
		}

		const sampledHistoryRows = sampleHistoryRows(allHistoryRows);
		const validEnergy = energyBuckets.map((b) => b.energyKwh).filter((v): v is number => v !== null && v > 0);
		const totalEnergyKwh = Number(validEnergy.reduce((s, v) => s + v, 0).toFixed(3));
		const avgEnergyKwh = Number((validEnergy.length ? totalEnergyKwh / validEnergy.length : 0).toFixed(3));
		const fullyLoadedBuckets = energyBuckets.slice(0, -1);
		const peakBucket = (fullyLoadedBuckets.length ? fullyLoadedBuckets : energyBuckets).reduce<EnergyBucket | null>(
			(best, b) => ((b.energyKwh ?? -Infinity) > (best?.energyKwh ?? -Infinity) ? b : best),
			null,
		);

		const allPwrVals = exportTimeSeries
			.filter((r) => r.metricKey === 'power_total')
			.map((r) => {
				const v = Number(r.metricValue);
				return v > 1000 ? v / 1000 : v;
			})
			.filter((v) => isFinite(v) && v > 0);

		const allVoltVals = allHistoryRows.map((r) => r.voltage_l1 ?? 0).filter((v) => v > 0);
		const allCurrVals = allHistoryRows.map((r) => r.current_total ?? 0).filter((v) => v > 0);

		const analytics = {
			peakPowerKw: Number((allPwrVals.length ? Math.max(...allPwrVals) : 0).toFixed(2)),
			peakAt: peakBucket?.label ?? '-',
			avgPowerKw: Number(
				(allPwrVals.length ? allPwrVals.reduce((s, v) => s + v, 0) / allPwrVals.length : 0).toFixed(2),
			),
			avgVoltageV: Number(
				(allVoltVals.length ? allVoltVals.reduce((s, v) => s + v, 0) / allVoltVals.length : 0).toFixed(1),
			),
			avgCurrentA: Number(
				(allCurrVals.length ? allCurrVals.reduce((s, v) => s + v, 0) / allCurrVals.length : 0).toFixed(2),
			),
			totalEnergyKwh,
			avgEnergyKwh,
		};

		const historicalIntervalLabel = diffHours >= 24 ? 'Per Hari' : 'Per Jam';

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

			sheets.push({
				name: 'Info Device',
				rows: detail.devices.map((device) => ({
					'Nama Device': device.name,
					'Serial No': device.serialNo,
					Lokasi: device.locationName ?? '-',
					'Tipe Lokasi': device.locationType ?? '-',
					Status: device.status,
					'Terakhir Online': device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString('id-ID') : '-',
					Modul: device.moduleTypes.join(', ') || '-',
				})),
			});

			sheets.push({
				name: 'Analytics',
				rows: [
					{
						'Waktu Peak': analytics.peakAt,
						'Avg Pemakaian (kWh)': analytics.avgEnergyKwh,
						'Avg Power (kW)': analytics.avgPowerKw,
						'Avg Voltage (V)': analytics.avgVoltageV,
						'Avg Current (A)': analytics.avgCurrentA,
					},
				],
			});

			if (useHourInterval) {
				sheets.push({
					name: `Pemakaian (${historicalIntervalLabel})`,
					rows: energyBuckets.map((b) => ({
						Waktu: b.label,
						'Energy (kWh)': b.energyKwh,
						'Power (kW)': b.powerTotal,
					})),
				});
			} else {
				sheets.push({
					name: `Pemakaian (${historicalIntervalLabel})`,
					rows: energyBuckets.map((b) => ({
						Tanggal: b.label,
						'Energy (kWh)': b.energyKwh ?? '-',
						'Power (kW)': b.powerTotal ?? '-',
					})),
				});
			}

			sheets.push({
				name: `Historical Data (${historicalIntervalLabel})`,
				rows: sampledHistoryRows.map((r) => ({
					[useHourInterval ? 'Time' : 'Tanggal']: fmtTs(r.timestamp),
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
				})),
			});

			await exportToExcel(`outlet-${detail.id}.xlsx`, sheets);
		} else {
			const tables: Array<{ title: string; columns: string[]; rows: Array<Array<string | number>> }> = [];

			tables.push({
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
			});

			tables.push({
				title: 'Analytics',
				columns: ['Metric', 'Nilai'],
				rows: [
					['Waktu Peak', analytics.peakAt],
					['Avg Pemakaian (kWh)', analytics.avgEnergyKwh],
					['Avg Power (kW)', analytics.avgPowerKw],
					['Avg Voltage (V)', analytics.avgVoltageV],
					['Avg Current (A)', analytics.avgCurrentA],
				],
			});

			if (useHourInterval) {
				tables.push({
					title: `Pemakaian (${historicalIntervalLabel})`,
					columns: ['Waktu', 'Energy (kWh)', 'Power (kW)'],
					rows: energyBuckets.map((b) => [b.label, String(b.energyKwh ?? '-'), String(b.powerTotal ?? '-')]),
				});
			} else {
				tables.push({
					title: `Pemakaian (${historicalIntervalLabel})`,
					columns: ['Tanggal', 'Energy (kWh)', 'Power (kW)'],
					rows: energyBuckets.map((b) => [b.label, String(b.energyKwh ?? '-'), String(b.powerTotal ?? '-')]),
				});
			}

			tables.push({
				title: `Historical Data (${historicalIntervalLabel})`,
				columns: [
					useHourInterval ? 'Time' : 'Tanggal',
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
				rows: sampledHistoryRows.map((r) => [
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
			});

			await exportToPdf({
				fileName: `outlet-${detail.id}.pdf`,
				title: 'Detail Outlet',
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
				tables,
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
						<ExportModal onExport={handleExport} disabled={!detail || loading} />
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
