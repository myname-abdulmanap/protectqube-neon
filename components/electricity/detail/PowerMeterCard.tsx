'use client';

import { Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

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

export function PowerMeterCard({ values }: { values: PowerMeterValues }) {
	return (
		<Card className='border border-border/60 shadow-sm h-full lg:col-span-2 gap-0 py-0 flex flex-col'>
			<CardHeader className='px-5 pt-5 pb-0 gap-0 shrink-0'>
				<CardTitle className='text-lg font-bold flex items-center gap-2'>
					<Activity className='h-5 w-5 text-blue-500' />
					Power Meter
				</CardTitle>
			</CardHeader>

			<CardContent className='p-5 flex flex-col flex-1 gap-4'>
				<div className='rounded-lg border border-border/50 bg-card overflow-hidden'>
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

				<div className='grid grid-cols-3 gap-2'>
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

				<div className='grid grid-cols-3 gap-2'>
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

				<div className='grid grid-cols-3 gap-2 flex-1 min-h-0'>
					<div className='rounded-lg border-2 border-teal-500 bg-teal-500 flex flex-col items-center justify-center px-3 py-4 text-center'>
						<p className='text-xs font-bold uppercase tracking-widest text-teal-100 mb-1'>Total kWh</p>
						<p className='text-2xl font-bold tabular-nums text-white leading-tight'>
							{f(values.energyTotal)}
						</p>
					</div>
					<div className='rounded-lg border-2 border-blue-500 bg-blue-500 flex flex-col items-center justify-center px-3 py-4 text-center'>
						<p className='text-xs font-bold uppercase tracking-widest text-blue-100 mb-1'>Total kVARh</p>
						<p className='text-2xl font-bold tabular-nums text-white leading-tight'>{f(values.kvarh)}</p>
					</div>
					<div className='rounded-lg border-2 border-purple-500 bg-purple-500 flex flex-col items-center justify-center px-3 py-4 text-center'>
						<p className='text-xs font-bold uppercase tracking-widest text-purple-100 mb-1'>Frequency</p>
						<p className='text-2xl font-bold tabular-nums text-white leading-tight'>
							{f(values.frequency, 1)} Hz
						</p>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
