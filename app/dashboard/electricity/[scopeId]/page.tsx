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
import { PowerChartCard } from '@/components/electricity/detail/PowerChartCard';
import { EnergyChartCard } from '@/components/electricity/detail/EnergyChartCard';
import { HistoryTableCard } from '@/components/electricity/detail/HistoryTableCard';
import { OutletProfileCard } from '@/components/electricity/detail/OutletProfileCard';
import { HourlyEnergyCard } from '@/components/electricity/detail/HourlyEnergyCard';
import { DateFilter, type DateRange, buildRange, rangeDateLabel } from '@/components/electricity/detail/DateFilter';
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
		totalKvarhDelta: number;
		avgFrequencyHz: number | null;
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
		timeSeries?: Array<{
			timestamp: string;
			metricKey: string;
			metricValue: unknown;
		}>;
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
			totalKvarhDelta: Number(ext.analytics?.totalKvarhDelta ?? 0),
			avgFrequencyHz:
				ext.analytics?.avgFrequencyHz != null &&
				Number(ext.analytics.avgFrequencyHz) >= 45 &&
				Number(ext.analytics.avgFrequencyHz) <= 55
					? Number(ext.analytics.avgFrequencyHz)
					: null,
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
	visible: {
		opacity: 1,
		y: 0,
		transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
	},
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
				const res = await energyDashboardApi.getOutletDetail(scopeId, {
					from: range.from,
					to: range.to,
				});
				if (!res.success || !res.data) {
					setError(res.error ?? 'Failed to load outlet');
					return;
				}
				const payload = adaptApiResponse(res.data);
				if (isInitial) setDetail(payload);
				setTimeSeries(payload.timeSeries);
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
		const res = await deviceMetricsApi.getAll({
			scopeId,
			moduleType: 'power_meter',
			limit: 50,
		});
		if (!res.success || !res.data?.length) return;
		const latestByKey = new Map<string, (typeof res.data)[0]>();
		for (const m of res.data) {
			const cur = latestByKey.get(m.metricKey);
			if (!cur || new Date(m.timestamp) > new Date(cur.timestamp)) latestByKey.set(m.metricKey, m);
		}
		const updated: OutletDetailPayload['latestMetrics'] = {};
		for (const [key, m] of latestByKey)
			updated[key] = {
				value: Number(m.metricValue),
				unit: m.unit ?? null,
				timestamp: m.timestamp,
			};
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

	const L = {
		waktu: 'Waktu',
		waktuPeak: 'Waktu Peak',
		peakPower: 'Peak Power (kW)',
		totalKwh: 'Total Energy (kWh)',
		totalKvarh: 'Total Reactive (kVArh)',
		avgKwh: 'Avg Energy (kWh)',
		avgPower: 'Avg Power (kW)',
		avgVoltage: 'Avg Voltage (V)',
		avgCurrent: 'Avg Current (A)',
		avgPf: 'Avg Power Factor',
		avgFreq: 'Avg Frequency (Hz)',
		energy: 'Energy (kWh)',
		reactive: 'Reactive (kVArh)',
		power: 'Avg Power (kW)',
		voltR: 'Avg Voltage R (V)',
		voltS: 'Avg Voltage S (V)',
		voltT: 'Avg Voltage T (V)',
		currR: 'Avg Current R (A)',
		currS: 'Avg Current S (A)',
		currT: 'Avg Current T (A)',
		currTotal: 'Avg Current Total (A)',
		pf: 'Avg Power Factor',
		freq: 'Avg Frequency (Hz)',
		pfR: 'Power Factor R',
		pfS: 'Power Factor S',
		pfT: 'Power Factor T',
		pfAvg: 'Power Factor Avg',
		vRLN: 'Voltage R L-N (V)',
		vSLN: 'Voltage S L-N (V)',
		vTLN: 'Voltage T L-N (V)',
		vRSLL: 'Voltage RS L-L (V)',
		vSTLL: 'Voltage ST L-L (V)',
		vTRLL: 'Voltage TR L-L (V)',
		aR: 'Current R (A)',
		aS: 'Current S (A)',
		aT: 'Current T (A)',
		aTotal: 'Current Total (A)',
		pR: 'Power R (kW)',
		pS: 'Power S (kW)',
		pT: 'Power T (kW)',
		pTotal: 'Power Total (kW)',
		qR: 'Reactive R (VAR)',
		qS: 'Reactive S (VAR)',
		qT: 'Reactive T (VAR)',
		qTotal: 'Reactive Total (VAR)',
		vaR: 'Apparent R (VA)',
		vaS: 'Apparent S (VA)',
		vaT: 'Apparent T (VA)',
		vaTotal: 'Apparent Total (VA)',
		kWh: 'Energy (kWh)',
		kVArh: 'Reactive (kVArh)',
		hz: 'Frequency (Hz)',
	} as const;

	const handleExportProcessed = async (format: ExportFormat, period: ExportPeriod) => {
		if (!detail) return;
		const { fromIso, toIso, label: periodLabel } = normalizeExportPeriod(period);

		const fromDate = new Date(fromIso);
		const toDate = new Date(toIso);
		const diffHours = (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60);
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
			kvarh: number | null;
			va_sigma: number | null;
			pf_sigma: number | null;
			frequency: number | null;
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

		const sortedHistoryRows = [...allHistoryRows].sort(
			(a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
		);

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
			return {
				year: get('year'),
				month: get('month'),
				day: get('day'),
				hour: get('hour'),
			};
		};

		const fmtBucketLabelHour = (ts: Date) =>
			`${String(ts.getDate()).padStart(2, '0')} ${MONTHS_ID[ts.getMonth()]} ${ts.getFullYear()}, ${String(ts.getHours()).padStart(2, '0')}:00 WIB`;
		const fmtBucketLabelDay = (ts: Date) =>
			`${String(ts.getDate()).padStart(2, '0')} ${MONTHS_ID[ts.getMonth()]} ${ts.getFullYear()}`;

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
			freqSum: number;
			freqCount: number;
			kvarhFirst: number | null;
			kvarhLast: number | null;
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
			freqSum: 0,
			freqCount: 0,
			kvarhFirst: null,
			kvarhLast: null,
		});

		const addToAcc = (acc: SlotAcc, key: string, val: number) => {
			const v = Number(val);
			if (!isFinite(v)) return;
			switch (key) {
				case 'power_total':
					if (v <= 0) return;
					acc.powerSum += v > 1000 ? v / 1000 : v;
					acc.powerCount += 1;
					break;
				case 'voltage_l1':
					if (v > 0) {
						acc.voltL1Sum += v;
						acc.voltL1Count += 1;
					}
					break;
				case 'voltage_l2':
					if (v > 0) {
						acc.voltL2Sum += v;
						acc.voltL2Count += 1;
					}
					break;
				case 'voltage_l3':
					if (v > 0) {
						acc.voltL3Sum += v;
						acc.voltL3Count += 1;
					}
					break;
				case 'current_l1':
					if (v > 0) {
						acc.currL1Sum += v;
						acc.currL1Count += 1;
					}
					break;
				case 'current_l2':
					if (v > 0) {
						acc.currL2Sum += v;
						acc.currL2Count += 1;
					}
					break;
				case 'current_l3':
					if (v > 0) {
						acc.currL3Sum += v;
						acc.currL3Count += 1;
					}
					break;
				case 'current_total':
					if (v > 0) {
						acc.currTotalSum += v;
						acc.currTotalCount += 1;
					}
					break;
				case 'pf_sigma':
					if (v > 0 && v <= 1) {
						acc.pfSum += v;
						acc.pfCount += 1;
					}
					break;
				case 'frequency':
					if (v >= 45 && v <= 55) {
						acc.freqSum += v;
						acc.freqCount += 1;
					}
					break;
			}
		};

		const hourlyAccMap = new Map<string, SlotAcc>();
		const dailyAccMap = new Map<string, SlotAcc>();

		const ingestTimeSeries = (
			rows: Array<{
				timestamp: string;
				metricKey: string;
				metricValue: number;
			}>,
		) => {
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
			ingestTimeSeries(
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
					: [],
			);
		} else {
			await Promise.all(
				hourlyDays
					.map((day) => async () => {
						const tsRes = await energyDashboardApi.getOutletDetail(scopeId, {
							from: new Date(`${day.date}T00:00:00+07:00`).toISOString(),
							to: new Date(`${day.date}T23:59:59+07:00`).toISOString(),
						});
						ingestTimeSeries(
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
								: [],
						);
					})
					.map((fn) => fn()),
			);
		}

		for (const r of sortedHistoryRows) {
			const v = Number(r.pf_sigma ?? 0);
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

		for (const r of sortedHistoryRows) {
			const v = Number(r.frequency ?? null);
			if (!isFinite(v) || v < 45 || v > 55) continue;
			const d = new Date(r.timestamp);
			if (isNaN(d.getTime())) continue;
			const p = getJakartaParts(d);
			const hKey = `${p.year}-${p.month}-${p.day}-${p.hour}`;
			const dKey = `${p.year}-${p.month}-${p.day}`;
			const hAcc = hourlyAccMap.get(hKey) ?? makeAcc();
			if (hAcc.freqCount === 0) {
				hAcc.freqSum += v;
				hAcc.freqCount += 1;
			}
			hourlyAccMap.set(hKey, hAcc);
			const dAcc = dailyAccMap.get(dKey) ?? makeAcc();
			if (dAcc.freqCount === 0) {
				dAcc.freqSum += v;
				dAcc.freqCount += 1;
			}
			dailyAccMap.set(dKey, dAcc);
		}

		for (const r of sortedHistoryRows) {
			const v = Number(r.kvarh ?? null);
			if (!isFinite(v) || v < 0) continue;
			const d = new Date(r.timestamp);
			if (isNaN(d.getTime())) continue;
			const p = getJakartaParts(d);
			const hKey = `${p.year}-${p.month}-${p.day}-${p.hour}`;
			const dKey = `${p.year}-${p.month}-${p.day}`;
			const hAcc = hourlyAccMap.get(hKey) ?? makeAcc();
			if (hAcc.kvarhFirst === null) hAcc.kvarhFirst = v;
			hAcc.kvarhLast = v;
			hourlyAccMap.set(hKey, hAcc);
			const dAcc = dailyAccMap.get(dKey) ?? makeAcc();
			if (dAcc.kvarhFirst === null) dAcc.kvarhFirst = v;
			dAcc.kvarhLast = v;
			dailyAccMap.set(dKey, dAcc);
		}

		const avgOrNull = (sum: number, count: number, d = 2): number | null =>
			count > 0 ? Number((sum / count).toFixed(d)) : null;

		const resolveSlot = (acc: SlotAcc) => ({
			avgPowerKw: avgOrNull(acc.powerSum, acc.powerCount, 3),
			avgVoltL1: avgOrNull(acc.voltL1Sum, acc.voltL1Count, 1),
			avgVoltL2: avgOrNull(acc.voltL2Sum, acc.voltL2Count, 1),
			avgVoltL3: avgOrNull(acc.voltL3Sum, acc.voltL3Count, 1),
			avgCurrL1: avgOrNull(acc.currL1Sum, acc.currL1Count, 2),
			avgCurrL2: avgOrNull(acc.currL2Sum, acc.currL2Count, 2),
			avgCurrL3: avgOrNull(acc.currL3Sum, acc.currL3Count, 2),
			avgCurrTotal: avgOrNull(acc.currTotalSum, acc.currTotalCount, 2),
			avgPf: avgOrNull(acc.pfSum, acc.pfCount, 3),
			avgFreq: avgOrNull(acc.freqSum, acc.freqCount, 2),
			_kvarhFirst: acc.kvarhFirst,
			_kvarhLast: acc.kvarhLast,
			avgKvarh: acc.kvarhLast !== null ? Number(acc.kvarhLast.toFixed(3)) : null,
		});

		type EnergyBucket = {
			timestamp: string;
			label: string;
			energyKwh: number | null;
			avgKvarh: number | null;
			_kvarhFirst: number | null;
			_kvarhLast: number | null;
			avgPowerKw: number | null;
			avgVoltL1: number | null;
			avgVoltL2: number | null;
			avgVoltL3: number | null;
			avgCurrL1: number | null;
			avgCurrL2: number | null;
			avgCurrL3: number | null;
			avgCurrTotal: number | null;
			avgPf: number | null;
			avgFreq: number | null;
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
					...resolveSlot(hourlyAccMap.get(hKey) ?? makeAcc()),
				});
			}
		}

		for (let i = 0; i < hourlyBuckets.length; i++) {
			const curr = hourlyBuckets[i];
			if (i === 0) {
				if (curr._kvarhFirst !== null && curr._kvarhLast !== null) {
					const delta = curr._kvarhLast - curr._kvarhFirst;
					curr.avgKvarh = delta >= 0 ? Number(delta.toFixed(3)) : null;
				} else {
					curr.avgKvarh = null;
				}
			} else {
				const prev = hourlyBuckets[i - 1];
				if (curr._kvarhFirst !== null && prev._kvarhLast !== null) {
					const delta = curr._kvarhFirst - prev._kvarhLast;
					curr.avgKvarh = delta >= 0 ? Number(delta.toFixed(3)) : null;
				} else {
					curr.avgKvarh = null;
				}
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
				...resolveSlot(dailyAccMap.get(dKey) ?? makeAcc()),
			});
		}

		for (let i = 0; i < dailyBuckets.length; i++) {
			const curr = dailyBuckets[i];
			if (i === 0) {
				if (curr._kvarhFirst !== null && curr._kvarhLast !== null) {
					const delta = curr._kvarhLast - curr._kvarhFirst;
					curr.avgKvarh = delta >= 0 ? Number(delta.toFixed(3)) : null;
				} else {
					curr.avgKvarh = null;
				}
			} else {
				const prev = dailyBuckets[i - 1];
				if (curr._kvarhFirst !== null && prev._kvarhLast !== null) {
					const delta = curr._kvarhFirst - prev._kvarhLast;
					curr.avgKvarh = delta >= 0 ? Number(delta.toFixed(3)) : null;
				} else {
					curr.avgKvarh = null;
				}
			}
		}

		const hourlyByDay = new Map<string, EnergyBucket[]>();
		for (const b of hourlyBuckets) {
			const p = getJakartaParts(new Date(b.timestamp));
			const dKey = `${p.year}-${p.month}-${p.day}`;
			const arr = hourlyByDay.get(dKey) ?? [];
			arr.push(b);
			hourlyByDay.set(dKey, arr);
		}

		const daySheetLabel = (dKey: string): string => {
			const b = hourlyByDay.get(dKey)?.[0];
			if (!b) return dKey;
			const ts = new Date(b.timestamp);
			return `${String(ts.getDate()).padStart(2, '0')} ${MONTHS_ID[ts.getMonth()]}`;
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

		const gAcc = makeAcc();
		for (const acc of hourlyAccMap.values()) {
			gAcc.powerSum += acc.powerSum;
			gAcc.powerCount += acc.powerCount;
			gAcc.voltL1Sum += acc.voltL1Sum;
			gAcc.voltL1Count += acc.voltL1Count;
			gAcc.currTotalSum += acc.currTotalSum;
			gAcc.currTotalCount += acc.currTotalCount;
			gAcc.pfSum += acc.pfSum;
			gAcc.pfCount += acc.pfCount;
			gAcc.freqSum += acc.freqSum;
			gAcc.freqCount += acc.freqCount;
		}

		const peakPowerKw = Number(
			(gAcc.powerCount > 0
				? Math.max(
						...Array.from(hourlyAccMap.values()).map((a) =>
							a.powerCount > 0 ? a.powerSum / a.powerCount : 0,
						),
					)
				: 0
			).toFixed(2),
		);

		const backendKvarh = detail.analytics?.totalKvarhDelta ?? 0;
		const computedKvarh = Number(
			primaryBuckets
				.map((b) => b.avgKvarh ?? 0)
				.reduce((s, v) => s + v, 0)
				.toFixed(3),
		);
		const analyticsAvgKvarh = backendKvarh > 0 ? Number(backendKvarh.toFixed(3)) : computedKvarh;
		const backendFreq = detail.analytics?.avgFrequencyHz;
		const computedFreq = avgOrNull(gAcc.freqSum, gAcc.freqCount, 2);
		const analyticsAvgFreq =
			backendFreq !== null && backendFreq !== undefined ? Number(backendFreq.toFixed(2)) : (computedFreq ?? 0);

		const analyticsRows: Array<[string, string | number]> = [
			[L.waktuPeak, peakBucket?.label ?? '-'],
			[L.peakPower, peakPowerKw],
			[L.totalKwh, totalEnergyKwh],
			[L.totalKvarh, analyticsAvgKvarh],
			[L.avgKwh, avgEnergyKwh],
			[L.avgPower, avgOrNull(gAcc.powerSum, gAcc.powerCount, 2) ?? 0],
			[L.avgVoltage, avgOrNull(gAcc.voltL1Sum, gAcc.voltL1Count, 1) ?? 0],
			[L.avgCurrent, avgOrNull(gAcc.currTotalSum, gAcc.currTotalCount, 2) ?? 0],
			[L.avgPf, avgOrNull(gAcc.pfSum, gAcc.pfCount, 3) ?? 0],
			[L.avgFreq, analyticsAvgFreq],
		];

		const analyticsExcelRow = Object.fromEntries(analyticsRows) as Record<string, string | number>;

		const bucketToExcelRow = (b: EnergyBucket): Record<string, string | number | null> => ({
			[L.waktu]: b.label,
			[L.energy]: b.energyKwh ?? '-',
			[L.reactive]: b.avgKvarh ?? '-',
			[L.power]: b.avgPowerKw ?? '-',
			[L.voltR]: b.avgVoltL1 ?? '-',
			[L.voltS]: b.avgVoltL2 ?? '-',
			[L.voltT]: b.avgVoltL3 ?? '-',
			[L.currR]: b.avgCurrL1 ?? '-',
			[L.currS]: b.avgCurrL2 ?? '-',
			[L.currT]: b.avgCurrL3 ?? '-',
			[L.currTotal]: b.avgCurrTotal ?? '-',
			[L.pf]: b.avgPf ?? '-',
			[L.freq]: b.avgFreq ?? '-',
		});

		const bucketToPdfRow = (b: EnergyBucket): Array<string | number> => [
			b.label,
			String(b.energyKwh ?? '-'),
			String(b.avgKvarh ?? '-'),
			String(b.avgPowerKw ?? '-'),
			String(b.avgVoltL1 ?? '-'),
			String(b.avgVoltL2 ?? '-'),
			String(b.avgVoltL3 ?? '-'),
			String(b.avgCurrL1 ?? '-'),
			String(b.avgCurrL2 ?? '-'),
			String(b.avgCurrL3 ?? '-'),
			String(b.avgCurrTotal ?? '-'),
			String(b.avgPf ?? '-'),
			String(b.avgFreq ?? '-'),
		];

		const pdfPemakaianCols = [
			L.waktu,
			L.energy,
			L.reactive,
			L.power,
			L.voltR,
			L.voltS,
			L.voltT,
			L.currR,
			L.currS,
			L.currT,
			L.currTotal,
			L.pf,
			L.freq,
		];

		const infoDeviceCols = ['Nama Device', 'Serial No', 'Lokasi', 'Tipe', 'Status', 'Terakhir Online', 'Modul'];
		const deviceRowsFn = () =>
			detail.devices.map((d) => [
				d.name,
				d.serialNo,
				d.locationName ?? '-',
				d.locationType ?? '-',
				d.status,
				d.lastSeenAt ? new Date(d.lastSeenAt).toLocaleString('id-ID') : '-',
				d.moduleTypes.join(', ') || '-',
			]);
		const deviceExcelRows = detail.devices.map((d) => ({
			'Nama Device': d.name,
			'Serial No': d.serialNo,
			Lokasi: d.locationName ?? '-',
			'Tipe Lokasi': d.locationType ?? '-',
			Status: d.status,
			'Terakhir Online': d.lastSeenAt ? new Date(d.lastSeenAt).toLocaleString('id-ID') : '-',
			Modul: d.moduleTypes.join(', ') || '-',
		}));

		const summaryBlock = [
			`Outlet: ${detail.name}`,
			`Region: ${detail.region ?? '-'}`,
			`Alamat: ${detail.address ?? '-'}`,
			`Periode: ${periodLabel}`,
			`Capacity (VA): ${detail.capacityVa ?? '-'}`,
			`Jumlah Device: ${detail.devices.length}`,
		];

		const sortedDayKeys = Array.from(hourlyByDay.keys()).sort();

		if (format === 'excel') {
			const sheets: Array<{
				name: string;
				rows: Array<Record<string, string | number | null>>;
			}> = [];
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
			sheets.push({ name: 'Info Device', rows: deviceExcelRows });
			sheets.push({ name: 'Analytics', rows: [analyticsExcelRow] });
			if (!useHourInterval) {
				sheets.push({
					name: 'Pemakaian (Per Hari)',
					rows: dailyBuckets.map(bucketToExcelRow),
				});
				for (const dKey of sortedDayKeys) {
					const dayBuckets = hourlyByDay.get(dKey) ?? [];
					if (!dayBuckets.length) continue;
					sheets.push({
						name: `Per Jam ${daySheetLabel(dKey)}`,
						rows: dayBuckets.map(bucketToExcelRow),
					});
				}
			} else {
				sheets.push({
					name: 'Pemakaian (Per Jam)',
					rows: hourlyBuckets.map(bucketToExcelRow),
				});
			}
			await exportToExcel(`outlet-processed-${detail.id}.xlsx`, sheets);
		} else {
			const tables: Array<{
				title: string;
				columns: string[];
				rows: Array<Array<string | number>>;
			}> = [];
			tables.push({
				title: 'Info Device',
				columns: infoDeviceCols,
				rows: deviceRowsFn(),
			});
			tables.push({
				title: 'Analytics',
				columns: ['Metrik', 'Nilai'],
				rows: analyticsRows,
			});
			if (!useHourInterval) {
				tables.push({
					title: 'Pemakaian (Per Hari)',
					columns: pdfPemakaianCols,
					rows: dailyBuckets.map(bucketToPdfRow),
				});
				for (const dKey of sortedDayKeys) {
					const dayBuckets = hourlyByDay.get(dKey) ?? [];
					if (!dayBuckets.length) continue;
					tables.push({
						title: `Pemakaian Per Jam — ${daySheetLabel(dKey)}`,
						columns: pdfPemakaianCols,
						rows: dayBuckets.map(bucketToPdfRow),
					});
				}
			} else {
				tables.push({
					title: 'Pemakaian (Per Jam)',
					columns: pdfPemakaianCols,
					rows: hourlyBuckets.map(bucketToPdfRow),
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
		const toDateInclusive = new Date(new Date(normalizeExportPeriod(period).toIso).getTime() + 24 * 60 * 60 * 1000);

		type RawHistoryRow = {
			timestamp: string;
			pf_a: number | null;
			pf_b: number | null;
			pf_c: number | null;
			pf_sigma: number | null;
			voltage_l1: number | null;
			voltage_l2: number | null;
			voltage_l3: number | null;
			voltage_ab: number | null;
			voltage_bc: number | null;
			voltage_ca: number | null;
			current_l1: number | null;
			current_l2: number | null;
			current_l3: number | null;
			current_total: number | null;
			power_l1: number | null;
			power_l2: number | null;
			power_l3: number | null;
			power_total: number | null;
			reactive_l1: number | null;
			reactive_l2: number | null;
			reactive_l3: number | null;
			reactive_sigma: number | null;
			va_a: number | null;
			va_b: number | null;
			va_c: number | null;
			va_sigma: number | null;
			energy_total: number | null;
			kvarh: number | null;
			frequency: number | null;
		};

		const normPower = (v: number | null): number | null =>
			v === null ? null : Number(normalizePowerToKw(v).toFixed(3));

		const fmtTs = (ts: string) => {
			try {
				const MONTHS = [
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
				return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
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
		const deviceExcelRows = detail.devices.map((d) => ({
			'Nama Device': d.name,
			'Serial No': d.serialNo,
			Lokasi: d.locationName ?? '-',
			'Tipe Lokasi': d.locationType ?? '-',
			Status: d.status,
			'Terakhir Online': d.lastSeenAt ? new Date(d.lastSeenAt).toLocaleString('id-ID') : '-',
			Modul: d.moduleTypes.join(', ') || '-',
		}));
		const infoDeviceCols = ['Nama Device', 'Serial No', 'Lokasi', 'Tipe', 'Status', 'Terakhir Online', 'Modul'];
		const devicePdfRows = detail.devices.map((d) => [
			d.name,
			d.serialNo,
			d.locationName ?? '-',
			d.locationType ?? '-',
			d.status,
			d.lastSeenAt ? new Date(d.lastSeenAt).toLocaleString('id-ID') : '-',
			d.moduleTypes.join(', ') || '-',
		]);

		if (format === 'excel') {
			const rawDataRows = allRawRows.map((r) => ({
				[L.waktu]: fmtTs(r.timestamp),
				[L.pfR]: r.pf_a,
				[L.pfS]: r.pf_b,
				[L.pfT]: r.pf_c,
				[L.pfAvg]: r.pf_sigma,
				[L.vRLN]: r.voltage_l1,
				[L.vSLN]: r.voltage_l2,
				[L.vTLN]: r.voltage_l3,
				[L.vRSLL]: r.voltage_ab,
				[L.vSTLL]: r.voltage_bc,
				[L.vTRLL]: r.voltage_ca,
				[L.aR]: r.current_l1,
				[L.aS]: r.current_l2,
				[L.aT]: r.current_l3,
				[L.aTotal]: r.current_total,
				[L.pR]: normPower(r.power_l1),
				[L.pS]: normPower(r.power_l2),
				[L.pT]: normPower(r.power_l3),
				[L.pTotal]: normPower(r.power_total),
				[L.qR]: r.reactive_l1,
				[L.qS]: r.reactive_l2,
				[L.qT]: r.reactive_l3,
				[L.qTotal]: r.reactive_sigma,
				[L.vaR]: r.va_a,
				[L.vaS]: r.va_b,
				[L.vaT]: r.va_c,
				[L.vaTotal]: r.va_sigma,
				[L.kWh]: r.energy_total,
				[L.kVArh]: r.kvarh,
				[L.hz]: r.frequency,
			}));

			await exportToExcel(`outlet-raw-${detail.id}.xlsx`, [
				{ name: 'Summary', rows: [summaryData] },
				{ name: 'Info Device', rows: deviceExcelRows },
				{ name: 'Historical Data', rows: rawDataRows },
			]);
		} else {
			const pdfRawCols = [
				L.waktu,
				L.pfAvg,
				L.vRLN,
				L.vSLN,
				L.vTLN,
				L.aTotal,
				L.pTotal,
				L.qTotal,
				L.vaTotal,
				L.kWh,
				L.kVArh,
				L.hz,
			];

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
					'Catatan: PDF menampilkan kolom ringkasan (Total). Data lengkap per fase tersedia di ekspor Excel.',
				],
				tables: [
					{
						title: 'Info Device',
						columns: infoDeviceCols,
						rows: devicePdfRows,
					},
					{
						title: 'Historical Data (Ringkasan)',
						columns: pdfRawCols,
						rows: allRawRows.map((r) => [
							fmtTs(r.timestamp),
							String(r.pf_sigma ?? '-'),
							String(r.voltage_l1 ?? '-'),
							String(r.voltage_l2 ?? '-'),
							String(r.voltage_l3 ?? '-'),
							String(r.current_total ?? '-'),
							String(normPower(r.power_total) ?? '-'),
							String(r.reactive_sigma ?? '-'),
							String(r.va_sigma ?? '-'),
							String(r.energy_total ?? '-'),
							String(r.kvarh ?? '-'),
							String(r.frequency ?? '-'),
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

	const overlayLabel = useMemo(() => {
		if (dateRange.preset === 'custom' && (!dateRange.from || !dateRange.to)) {
			return 'Load data...';
		}
		return `Load data ${rangeDateLabel(dateRange)}`;
	}, [dateRange]);

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
						dateRange={dateRange}
						dateRangeLabel={overlayLabel}
					/>
					<div className='lg:col-span-2'>
						<PowerMeterCard values={pmValues} tarif={{ lwbp: null, wbp: null, totalTarif: null }} />
					</div>
				</motion.div>

				{detail && (
					<motion.div variants={itemVariant} className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
						<div className='relative'>
							<DataLoadingOverlay isLoading={dataLoading} label={overlayLabel} />
							<EnergyChartCard
								scopeId={scopeId}
								timeSeries={timeSeries}
								loadedFrom={dateRange.from}
								loadedTo={dateRange.to}
							/>
						</div>
						<div className='relative'>
							<DataLoadingOverlay isLoading={dataLoading} label={overlayLabel} />
							<PowerChartCard
								timeSeries={timeSeries}
								loadedFrom={dateRange.from}
								loadedTo={dateRange.to}
							/>
						</div>
					</motion.div>
				)}

				{detail && (
					<motion.div variants={itemVariant}>
						<div className='relative'>
							<DataLoadingOverlay isLoading={dataLoading} label={overlayLabel} />
							<TrendChartCard
								timeSeries={timeSeries}
								loadedFrom={dateRange.from}
								loadedTo={dateRange.to}
							/>
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
