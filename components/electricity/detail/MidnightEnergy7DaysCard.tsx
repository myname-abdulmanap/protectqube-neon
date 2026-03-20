'use client';

import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export type MidnightEnergyPoint = {
	key: string;
	transitionLabel: string;
	shortLabel: string;
	dateLabel: string;
	energyKwh: number | null;
};

interface MidnightEnergy7DaysCardProps {
	points: MidnightEnergyPoint[];
	loading?: boolean;
}

function CustomTooltip({
	active,
	payload,
}: {
	active?: boolean;
	payload?: Array<{
		value: number;
		payload: {
			hasData: boolean;
			fullDay: string;
			dateLabel: string;
		};
	}>;
}) {
	if (!active || !payload?.length) return null;

	const data = payload[0];
	const val = Number(data.value);
	const meta = data.payload;

	return (
		<div className='rounded-md border border-border/50 bg-background shadow-xl overflow-hidden min-w-44'>
			<div className='bg-orange-500 px-3 py-1.5'>
				<p className='text-[10px] font-bold uppercase tracking-widest text-orange-100'>Energy Total</p>
			</div>

			<div className='px-3 py-2.5'>
				{!meta.hasData ? (
					<p className='text-xs text-muted-foreground'>Tidak ada data 00:00</p>
				) : (
					<div className='flex items-baseline gap-1.5 mb-1'>
						<span className='text-2xl font-bold tabular-nums text-foreground'>
							{val.toLocaleString('id-ID', {
								maximumFractionDigits: 2,
							})}
						</span>
						<span className='text-sm font-semibold text-muted-foreground'>kWh</span>
					</div>
				)}

				<p className='text-xs text-muted-foreground'>
					{meta.fullDay}, {meta.dateLabel}
				</p>
			</div>
		</div>
	);
}

export function MidnightEnergy7DaysCard({ points, loading = false }: MidnightEnergy7DaysCardProps) {
	const formatKwh = (value: number) =>
		`${value.toLocaleString('id-ID', {
			maximumFractionDigits: 2,
		})} kWh`;

	const tableData = useMemo(() => {
		const weekdayFormatterLong = new Intl.DateTimeFormat('id-ID', {
			weekday: 'long',
			timeZone: 'Asia/Jakarta',
		});

		const rows = points.map((point, index) => {
			const currentEnergy = point.energyKwh;

			if (currentEnergy === null) {
				return {
					...point,
					consumptionTransitionLabel: point.transitionLabel,
					totalPemakaianKwh: null,
				};
			}

			let previousIndex = index - 1;
			while (previousIndex >= 0 && points[previousIndex]?.energyKwh === null) {
				previousIndex -= 1;
			}

			if (previousIndex < 0) {
				return {
					...point,
					consumptionTransitionLabel: point.transitionLabel,
					totalPemakaianKwh: null,
				};
			}

			const previousPoint = points[previousIndex];
			const previousEnergy = previousPoint?.energyKwh;

			if (previousEnergy === null || previousEnergy === undefined) {
				return {
					...point,
					consumptionTransitionLabel: point.transitionLabel,
					totalPemakaianKwh: null,
				};
			}

			return {
				...point,
				consumptionTransitionLabel: `${weekdayFormatterLong.format(new Date(`${previousPoint.key}T00:00:00+07:00`))} - ${weekdayFormatterLong.format(new Date(`${point.key}T00:00:00+07:00`))}`,
				totalPemakaianKwh: Number((currentEnergy - previousEnergy).toFixed(2)),
			};
		});

		return rows.slice(-7);
	}, [points]);

	const chartData = useMemo(
		() =>
			tableData.map((point) => ({
				label: point.shortLabel,
				fullDay: point.transitionLabel,
				dateLabel: point.dateLabel,
				value: Number((point.totalPemakaianKwh ?? 0).toFixed(2)),
				hasData: point.totalPemakaianKwh !== null,
			})),
		[tableData],
	);

	const hasAnyData = tableData.some((point) => point.totalPemakaianKwh !== null);

	return (
		<Card className='border border-border/60 shadow-sm h-full gap-0 py-0 flex flex-col'>
			<CardHeader className='px-5 pt-5 pb-0 gap-0 shrink-0'>
				<CardTitle className='text-lg font-bold flex items-center gap-2'>
					<Activity className='h-5 w-5 text-orange-500' />
					Energy Total (7 Hari Terakhir)
				</CardTitle>
			</CardHeader>

			<CardContent className='p-5 flex flex-col flex-1 gap-4'>
				{loading ? (
					<div className='h-44 flex items-center justify-center text-sm text-muted-foreground'>
						Memuat data 7 hari terakhir...
					</div>
				) : !hasAnyData ? (
					<div className='h-44 flex items-center justify-center text-sm text-muted-foreground'>
						Data jam 00:00 belum tersedia untuk 7 hari terakhir
					</div>
				) : (
					<ChartContainer
						config={{
							value: {
								label: 'Energy (kWh)',
								color: 'hsl(24, 95%, 53%)',
							},
						}}
						className='h-52 w-full'
					>
						<BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
							<CartesianGrid strokeDasharray='3 3' vertical={false} opacity={0.2} />
							<XAxis dataKey='label' tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
							<YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={48} />
							<ChartTooltip content={<CustomTooltip />} />
							<Bar dataKey='value' fill='hsl(24, 95%, 53%)' radius={[6, 6, 0, 0]} />
						</BarChart>
					</ChartContainer>
				)}

				<div className='rounded-md border border-border/60'>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Hari</TableHead>
								<TableHead>Tanggal</TableHead>
								<TableHead className='text-right'>Total Pemakaian (kWh)</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{tableData.map((point) => (
								<TableRow key={point.key}>
									<TableCell className='font-medium'>{point.consumptionTransitionLabel}</TableCell>
									<TableCell>{point.dateLabel}</TableCell>
									<TableCell className='text-right'>
										{point.totalPemakaianKwh === null ? '-' : formatKwh(point.totalPemakaianKwh)}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			</CardContent>
		</Card>
	);
}
