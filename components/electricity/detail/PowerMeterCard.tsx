'use client';

import { Activity, Info, AlertTriangle, CheckCircle } from 'lucide-react';
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

function KvarhTooltipContent({
	kvarh,
	kvarhLimit,
	penaltyKvarh,
	energyTotal,
	isOver,
}: {
	kvarh: number;
	kvarhLimit: number;
	penaltyKvarh: number;
	energyTotal: number;
	isOver: boolean;
}) {
	const actualPct = (kvarh / kvarhLimit) * 100;
	const barPct = Math.min(actualPct, 100);

	return (
		<div className='w-80 rounded-xl overflow-hidden shadow-2xl border border-border bg-popover text-popover-foreground'>
			{/* Header — berwarna sesuai status */}
			<div
				className={cn(
					'px-4 py-3 border-b border-border/40 flex items-center gap-2',
					isOver ? 'bg-rose-500 dark:bg-rose-600' : 'bg-blue-500 dark:bg-blue-600',
				)}
			>
				<Info className='w-4 h-4 text-white/80 shrink-0' />
				<p className='text-xs font-black uppercase tracking-widest text-white/80'>Detail kVARh</p>
			</div>

			<div className='px-4 py-4 space-y-4'>
				<div
					className={cn(
						'flex items-center gap-2 rounded-lg px-3 py-2.5',
						isOver
							? 'bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30'
							: 'bg-blue-50 dark:bg-blue-500/15 border border-blue-200 dark:border-blue-500/30',
					)}
				>
					{isOver ? (
						<AlertTriangle className='w-4 h-4 text-rose-500 shrink-0' />
					) : (
						<CheckCircle className='w-4 h-4 text-blue-500 shrink-0' />
					)}
					<p
						className={cn(
							'text-sm font-bold',
							isOver ? 'text-rose-600 dark:text-rose-400' : 'text-blue-600 dark:text-blue-400',
						)}
					>
						{isOver ? 'Melebihi batas PLN' : 'Dalam batas normal'}
					</p>
				</div>

				<div className='grid grid-cols-2 gap-2'>
					<div className='rounded-lg bg-muted/50 dark:bg-muted/30 px-3 py-2.5'>
						<p className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1'>
							kVARh Aktual
						</p>
						<p
							className={cn(
								'text-xl font-bold tabular-nums',
								isOver ? 'text-rose-500 dark:text-rose-400' : 'text-foreground',
							)}
						>
							{f(kvarh)}
						</p>
					</div>
					<div className='rounded-lg bg-muted/50 dark:bg-muted/30 px-3 py-2.5'>
						<p className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1'>
							Batas Maks
						</p>
						<p className='text-xl font-bold tabular-nums text-foreground'>{f(kvarhLimit)}</p>
					</div>
				</div>

				<div className='rounded-lg bg-muted/40 dark:bg-muted/20 px-4 py-3'>
					<p className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2'>
						Formula Batas PLN
					</p>
					<p className='text-sm text-foreground font-mono leading-relaxed'>
						0,62 &times; {f(energyTotal)} kWh
					</p>
					<p className='text-sm font-mono leading-relaxed'>
						<span className='text-muted-foreground'>= </span>
						<span className='font-bold text-foreground'>{f(kvarhLimit)} kVARh</span>
					</p>
				</div>

				<div>
					<div className='flex justify-between items-center mb-1.5'>
						<p className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
							Penggunaan
						</p>
						<p
							className={cn(
								'text-xs font-bold',
								isOver ? 'text-rose-500 dark:text-rose-400' : 'text-blue-500 dark:text-blue-400',
							)}
						>
							{actualPct.toFixed(1)}%
							{isOver && <span className='ml-1 text-muted-foreground font-normal'>(melebihi 100%)</span>}
						</p>
					</div>
					<div className='h-2.5 rounded-full bg-muted overflow-hidden'>
						<div
							className={cn(
								'h-full rounded-full transition-all duration-500',
								isOver ? 'bg-rose-500' : 'bg-blue-500',
							)}
							style={{ width: `${barPct}%` }}
						/>
					</div>
				</div>

				{isOver && (
					<div className='rounded-lg border border-rose-200 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-500/10 px-4 py-3 flex items-center justify-between gap-3'>
						<div>
							<p className='text-xs font-bold uppercase tracking-wider text-rose-500 dark:text-rose-400 mb-0.5'>
								Selisih Over
							</p>
							<p className='text-xs text-rose-400 dark:text-rose-500 leading-snug'>
								kVARh yang melebihi batas PLN
							</p>
						</div>
						<p className='text-2xl font-black tabular-nums text-rose-500 dark:text-rose-400 shrink-0'>
							+{f(penaltyKvarh)}
						</p>
					</div>
				)}
			</div>
		</div>
	);
}

export function PowerMeterCard({ values }: { values: PowerMeterValues }) {
	const kvarhLimit = values.energyTotal > 0 ? Number((0.62 * values.energyTotal).toFixed(2)) : null;
	const isOverKvarh = kvarhLimit !== null && values.kvarh > kvarhLimit;
	const penaltyKvarh =
		isOverKvarh && kvarhLimit !== null ? Number(Math.max(0, values.kvarh - kvarhLimit).toFixed(2)) : 0;

	return (
		<Tooltip.Provider delayDuration={200}>
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

						<Tooltip.Root>
							<Tooltip.Trigger asChild>
								<div
									className={cn(
										'rounded-lg border-2 flex flex-col items-center justify-center px-3 py-4 text-center relative overflow-hidden cursor-pointer select-none',
										isOverKvarh ? 'border-rose-500 bg-rose-500' : 'border-blue-500 bg-blue-500',
									)}
								>
									{isOverKvarh ? (
										<span className='absolute top-1.5 right-1.5 flex items-center gap-1 text-[9px] font-black bg-white/25 text-white px-1.5 py-0.5 rounded-full leading-none'>
											OVER <Info className='w-2.5 h-2.5' />
										</span>
									) : (
										<span className='absolute top-1.5 right-1.5'>
											<Info className='w-3 h-3 text-white/40' />
										</span>
									)}
									<p
										className={cn(
											'text-xs font-bold uppercase tracking-widest mb-1',
											isOverKvarh ? 'text-rose-100' : 'text-blue-100',
										)}
									>
										Total kVARh
									</p>
									<p className='text-2xl font-bold tabular-nums text-white leading-tight'>
										{f(values.kvarh)}
									</p>
								</div>
							</Tooltip.Trigger>

							<Tooltip.Portal>
								<Tooltip.Content side='top' align='center' sideOffset={8} className='z-50'>
									<KvarhTooltipContent
										kvarh={values.kvarh}
										kvarhLimit={kvarhLimit ?? 0}
										penaltyKvarh={penaltyKvarh}
										energyTotal={values.energyTotal}
										isOver={isOverKvarh}
									/>
									<Tooltip.Arrow
										className={cn(
											isOverKvarh
												? 'fill-rose-500 dark:fill-rose-600'
												: 'fill-blue-500 dark:fill-blue-600',
										)}
									/>
								</Tooltip.Content>
							</Tooltip.Portal>
						</Tooltip.Root>

						<div className='rounded-lg border-2 border-purple-500 bg-purple-500 flex flex-col items-center justify-center px-3 py-4 text-center'>
							<p className='text-xs font-bold uppercase tracking-widest text-purple-100 mb-1'>
								Frequency
							</p>
							<p className='text-2xl font-bold tabular-nums text-white leading-tight'>
								{f(values.frequency, 1)} Hz
							</p>
						</div>
					</div>
				</CardContent>
			</Card>
		</Tooltip.Provider>
	);
}
