'use client';

import { Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import * as Tooltip from '@radix-ui/react-tooltip';

export interface PowerMeterValues {
	voltageL1: number;
	voltageL2: number;
	voltageL3: number;
	voltageAB: number;
	voltageBC: number;
	voltageCA: number;
	currentL1: number;
	currentL2: number;
	currentL3: number;
	currentTotal: number;
	powerL1: number;
	powerL2: number;
	powerL3: number;
	powerTotal: number;
	reactiveL1: number;
	reactiveL2: number;
	reactiveL3: number;
	reactiveSigma: number;
	vaA: number;
	vaB: number;
	vaC: number;
	vaSigma: number;
	pfA: number;
	pfB: number;
	pfC: number;
	pfSigma: number;
	energyTotal: number;
	kvarh: number;
	frequency: number;
	penaltyKvarh: number;
}

export interface TarifValues {
	lwbp: number | null;
	wbp: number | null;
	totalTarif: number | null;
}

const MAX_CURRENT_PER_PHASE_A = 62;
const f = (v: number, d = 2) => (Number.isFinite(v) ? v.toLocaleString('id-ID', { maximumFractionDigits: d }) : '-');

const R = 'text-blue-500';
const S = 'text-emerald-500';
const T = 'text-orange-500';

function MetricBox({
	label,
	rows,
	summary,
}: {
	label: string;
	rows: Array<{ tag: string; color: string; value: string }>;
	summary?: { label: string; value: string };
}) {
	return (
		<div className='rounded-lg border border-border/50 bg-card overflow-hidden'>
			<div className='px-3 py-1.5 border-b border-border/40 bg-muted/40 dark:bg-muted/20'>
				<p className='text-xs font-bold uppercase tracking-widest text-muted-foreground'>{label}</p>
			</div>
			{rows.map(({ tag, color, value }) => (
				<div key={tag} className='flex items-center justify-between px-3 py-2'>
					<span className={`text-sm font-bold ${color}`}>{tag}</span>
					<span className='text-sm font-bold tabular-nums text-foreground'>{value}</span>
				</div>
			))}
			{summary && (
				<div className='flex items-center justify-between px-3 py-2 bg-muted/30 dark:bg-muted/20 border-t border-border/30'>
					<span className='text-xs font-bold text-muted-foreground'>{summary.label}</span>
					<span className='text-sm font-bold tabular-nums text-foreground'>{summary.value}</span>
				</div>
			)}
		</div>
	);
}

function CurrentBox({
	phases,
	summary,
}: {
	phases: Array<{ tag: string; color: string; value: number }>;
	summary: { label: string; value: string };
}) {
	return (
		<div className='rounded-lg border border-border/50 bg-card overflow-hidden'>
			<div className='px-3 py-1.5 border-b border-border/40 bg-muted/40 dark:bg-muted/20'>
				<p className='text-xs font-bold uppercase tracking-widest text-muted-foreground'>
					Current (A){' '}
					<span className='text-muted-foreground/60 normal-case tracking-normal font-normal'>
						/ max {MAX_CURRENT_PER_PHASE_A}A
					</span>
				</p>
			</div>
			{phases.map(({ tag, color, value }) => {
				const isOver = value > MAX_CURRENT_PER_PHASE_A;
				const pct = Math.round((value / MAX_CURRENT_PER_PHASE_A) * 100);
				return (
					<div key={tag} className='flex items-center justify-between px-3 py-2'>
						<span className={cn('text-sm font-bold', color)}>{tag}</span>
						<span
							className={cn(
								'text-sm font-bold tabular-nums',
								isOver ? 'text-red-500' : 'text-foreground',
							)}
						>
							{f(value)}{' '}
							<span className='font-normal text-muted-foreground'>/ {MAX_CURRENT_PER_PHASE_A}</span>
							<span
								className={cn(
									'ml-1 text-xs font-bold',
									isOver ? 'text-red-500' : 'text-muted-foreground',
								)}
							>
								({pct}%)
							</span>
							{isOver && (
								<span className='ml-1 text-[10px] font-bold text-red-500 bg-red-100 dark:bg-red-500/20 px-1 py-0.5 rounded'>
									OVER
								</span>
							)}
						</span>
					</div>
				);
			})}
			<div className='flex items-center justify-between px-3 py-2 bg-muted/30 dark:bg-muted/20 border-t border-border/30'>
				<span className='text-xs font-bold text-muted-foreground'>{summary.label}</span>
				<span className='text-sm font-bold tabular-nums text-foreground'>{summary.value}</span>
			</div>
		</div>
	);
}

function TarifBox({
	label,
	value,
	colorClass,
	labelColorClass,
}: {
	label: string;
	value: number | null;
	colorClass: string;
	labelColorClass: string;
}) {
	return (
		<div
			className={cn(
				'rounded-lg border-2 flex flex-col items-center justify-center px-3 py-4 text-center relative overflow-hidden',
				colorClass,
			)}
		>
			<p className={cn('text-xs font-bold uppercase tracking-widest mb-1', labelColorClass)}>{label}</p>
			<p className='text-2xl font-bold tabular-nums text-white leading-tight'>
				{value !== null && Number.isFinite(value)
					? value.toLocaleString('id-ID', { maximumFractionDigits: 2 })
					: '–'}
			</p>
		</div>
	);
}

export function PowerMeterCard({ values, tarif }: { values: PowerMeterValues; tarif?: TarifValues }) {
	const lwbp = tarif?.lwbp ?? null;
	const wbp = tarif?.wbp ?? null;
	const totalTarif = tarif?.totalTarif ?? null;

	return (
		<Tooltip.Provider delayDuration={200}>
			<Card className='border border-border/60 shadow-sm h-full lg:col-span-2 gap-0 py-0 flex flex-col'>
				<CardHeader className='px-5 pt-5 pb-0 gap-0 shrink-0'>
					<CardTitle className='text-lg font-bold flex items-center gap-2'>
						<Activity className='h-5 w-5 text-blue-500' />
						Power Meter
					</CardTitle>
				</CardHeader>

				<CardContent className='p-5 flex flex-col flex-1 gap-3'>
					<div className='grid grid-cols-5 gap-3'>
						<div className='col-span-4 rounded-lg border border-border/50 bg-card overflow-hidden'>
							<div className='px-3 py-1.5 border-b border-border/40 bg-muted/40 dark:bg-muted/20'>
								<p className='text-xs font-bold uppercase tracking-widest text-muted-foreground'>
									Power Factor
								</p>
							</div>
							<div className='grid grid-cols-4'>
								{[
									{ tag: 'R', color: R, value: f(values.pfA, 3) },
									{ tag: 'S', color: S, value: f(values.pfB, 3) },
									{ tag: 'T', color: T, value: f(values.pfC, 3) },
								].map(({ tag, color, value }, i) => (
									<div
										key={tag}
										className={`flex items-center justify-between px-3 py-2 ${i < 2 ? 'border-r border-border/30' : ''}`}
									>
										<span className={`text-sm font-bold ${color}`}>{tag}</span>
										<span className='text-sm font-bold tabular-nums text-foreground'>{value}</span>
									</div>
								))}
								<div className='flex items-center justify-between px-3 py-2 border-l border-border/30'>
									<span className='text-xs font-bold text-muted-foreground'>Average</span>
									<span className='text-sm font-bold tabular-nums text-foreground'>
										{f(values.pfSigma, 3)}
									</span>
								</div>
							</div>
						</div>

						<div className='col-span-1 rounded-lg border border-border/50 bg-card overflow-hidden'>
							<div className='px-3 py-1.5 border-b border-border/40 bg-muted/40 dark:bg-muted/20'>
								<p className='text-xs font-bold uppercase tracking-widest text-muted-foreground'>
									Frequency
								</p>
							</div>
							<div className='flex items-center justify-between px-3 py-2'>
								<span className='text-xs font-bold text-muted-foreground'>Hz</span>
								<span className='text-sm font-bold tabular-nums text-foreground'>
									{f(values.frequency, 1)}
								</span>
							</div>
						</div>
					</div>

					<div className='grid grid-cols-3 gap-3'>
						<MetricBox
							label='Voltage L-N (V)'
							rows={[
								{ tag: 'R', color: R, value: f(values.voltageL1, 1) },
								{ tag: 'S', color: S, value: f(values.voltageL2, 1) },
								{ tag: 'T', color: T, value: f(values.voltageL3, 1) },
							]}
						/>
						<MetricBox
							label='Voltage L-L (V)'
							rows={[
								{ tag: 'RS', color: R, value: f(values.voltageAB, 1) },
								{ tag: 'ST', color: S, value: f(values.voltageBC, 1) },
								{ tag: 'TR', color: T, value: f(values.voltageCA, 1) },
							]}
						/>
						<CurrentBox
							phases={[
								{ tag: 'R', color: 'text-blue-500', value: values.currentL1 },
								{ tag: 'S', color: 'text-emerald-500', value: values.currentL2 },
								{ tag: 'T', color: 'text-orange-500', value: values.currentL3 },
							]}
							summary={{ label: 'Average', value: f(values.currentTotal) }}
						/>
					</div>

					<div className='grid grid-cols-3 gap-3'>
						<MetricBox
							label='Power (kW)'
							rows={[
								{ tag: 'R', color: R, value: f(values.powerL1) },
								{ tag: 'S', color: S, value: f(values.powerL2) },
								{ tag: 'T', color: T, value: f(values.powerL3) },
							]}
							summary={{ label: 'Total', value: f(values.powerTotal) }}
						/>
						<MetricBox
							label='Reactive (VAR)'
							rows={[
								{ tag: 'R', color: R, value: f(values.reactiveL1) },
								{ tag: 'S', color: S, value: f(values.reactiveL2) },
								{ tag: 'T', color: T, value: f(values.reactiveL3) },
							]}
							summary={{ label: 'Total', value: f(values.reactiveSigma) }}
						/>
						<MetricBox
							label='Apparent (VA)'
							rows={[
								{ tag: 'R', color: R, value: f(values.vaA) },
								{ tag: 'S', color: S, value: f(values.vaB) },
								{ tag: 'T', color: T, value: f(values.vaC) },
							]}
							summary={{ label: 'Total', value: f(values.vaSigma) }}
						/>
					</div>

					<div className='grid grid-cols-3 gap-3 flex-1 min-h-0'>
						<TarifBox
							label='LWBP'
							value={lwbp}
							colorClass='border-sky-500 bg-sky-500'
							labelColorClass='text-sky-100'
						/>
						<TarifBox
							label='WBP'
							value={wbp}
							colorClass='border-amber-500 bg-amber-500'
							labelColorClass='text-amber-100'
						/>
						<TarifBox
							label='Total Tarif'
							value={totalTarif}
							colorClass='border-emerald-600 bg-emerald-600'
							labelColorClass='text-emerald-100'
						/>
					</div>
				</CardContent>
			</Card>
		</Tooltip.Provider>
	);
}
