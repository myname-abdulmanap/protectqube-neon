'use client';

import { Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

interface PowerMeterCardProps {
	values: PowerMeterValues;
}

const f = (v: number, d = 2) => (Number.isFinite(v) ? v.toLocaleString('id-ID', { maximumFractionDigits: d }) : '-');

function MetricGroup({
	label,
	rows,
	sigma,
}: {
	label: string;
	rows: Array<{ tag: string; color: string; value: string }>;
	sigma?: { tag: string; value: string };
}) {
	return (
		<div className='bg-muted/30 rounded-xl p-3'>
			<p className='text-xs text-muted-foreground uppercase font-semibold mb-2 tracking-wide'>{label}</p>
			<div className='space-y-1.5'>
				{rows.map(({ tag, color, value }) => (
					<div key={tag} className='flex justify-between items-center'>
						<span className={`text-sm font-semibold ${color}`}>{tag}</span>
						<span className='text-sm font-bold tabular-nums'>{value}</span>
					</div>
				))}
				{sigma && (
					<div className='flex justify-between items-center bg-primary/10 rounded-lg px-2 py-1 mt-1'>
						<span className='text-sm font-bold text-primary'>{sigma.tag}</span>
						<span className='text-sm font-bold tabular-nums'>{sigma.value}</span>
					</div>
				)}
			</div>
		</div>
	);
}

export function PowerMeterCard({ values }: PowerMeterCardProps) {
	return (
		<Card className='border-0 shadow-sm lg:col-span-2'>
			<CardHeader className='px-5 py-4 pb-0'>
				<CardTitle className='text-base font-semibold flex items-center gap-2'>
					<Activity className='h-5 w-5 text-blue-500' />
					Power Meter
				</CardTitle>
			</CardHeader>

			<CardContent className='p-4 pt-3'>
				<div className='grid grid-cols-3 gap-2.5 mb-3'>
					<MetricGroup
						label='V L-N'
						rows={[
							{ tag: 'L1', color: 'text-blue-500', value: f(values.voltageL1, 1) },
							{ tag: 'L2', color: 'text-green-500', value: f(values.voltageL2, 1) },
							{ tag: 'L3', color: 'text-orange-500', value: f(values.voltageL3, 1) },
						]}
					/>
					<MetricGroup
						label='V L-L'
						rows={[
							{ tag: 'AB', color: 'text-blue-500', value: f(values.voltageAB, 1) },
							{ tag: 'BC', color: 'text-green-500', value: f(values.voltageBC, 1) },
							{ tag: 'CA', color: 'text-orange-500', value: f(values.voltageCA, 1) },
						]}
					/>
					<MetricGroup
						label='Current (A)'
						rows={[
							{ tag: 'L1', color: 'text-blue-500', value: f(values.currentL1) },
							{ tag: 'L2', color: 'text-green-500', value: f(values.currentL2) },
							{ tag: 'L3', color: 'text-orange-500', value: f(values.currentL3) },
						]}
						sigma={{ tag: 'Total', value: f(values.currentTotal) }}
					/>
					<MetricGroup
						label='Power (kW)'
						rows={[
							{ tag: 'L1', color: 'text-blue-500', value: f(values.powerL1) },
							{ tag: 'L2', color: 'text-green-500', value: f(values.powerL2) },
							{ tag: 'L3', color: 'text-orange-500', value: f(values.powerL3) },
						]}
						sigma={{ tag: 'Total', value: f(values.powerTotal) }}
					/>
					<MetricGroup
						label='Reactive (VAR)'
						rows={[
							{ tag: 'L1', color: 'text-blue-500', value: f(values.reactiveL1) },
							{ tag: 'L2', color: 'text-green-500', value: f(values.reactiveL2) },
							{ tag: 'L3', color: 'text-orange-500', value: f(values.reactiveL3) },
						]}
						sigma={{ tag: 'Total', value: f(values.reactiveSigma) }}
					/>
					<MetricGroup
						label='Apparent (VA)'
						rows={[
							{ tag: 'A', color: 'text-blue-500', value: f(values.vaA) },
							{ tag: 'B', color: 'text-green-500', value: f(values.vaB) },
							{ tag: 'C', color: 'text-orange-500', value: f(values.vaC) },
						]}
						sigma={{ tag: 'Total', value: f(values.vaSigma) }}
					/>
				</div>

				<div className='bg-muted/30 rounded-xl p-3 mb-3'>
					<p className='text-xs text-muted-foreground uppercase font-semibold mb-2 tracking-wide'>
						Power Factor
					</p>
					<div className='grid grid-cols-4 gap-2'>
						{[
							{ tag: 'A', color: 'text-blue-500', value: f(values.pfA, 3) },
							{ tag: 'B', color: 'text-green-500', value: f(values.pfB, 3) },
							{ tag: 'C', color: 'text-orange-500', value: f(values.pfC, 3) },
						].map(({ tag, color, value }) => (
							<div key={tag} className='flex justify-between items-center bg-muted rounded-lg px-2 py-1'>
								<span className={`text-sm font-semibold ${color}`}>{tag}</span>
								<span className='text-sm font-bold tabular-nums'>{value}</span>
							</div>
						))}
						<div className='flex justify-between items-center bg-primary/10 rounded-lg px-2 py-1'>
							<span className='text-sm font-bold text-primary'>Σ</span>
							<span className='text-sm font-bold tabular-nums'>{f(values.pfSigma, 3)}</span>
						</div>
					</div>
				</div>

				<div className='bg-linear-to-r from-orange-500/10 via-purple-500/10 to-cyan-500/10 rounded-xl p-4'>
					<div className='grid grid-cols-3 gap-3 text-center'>
						<div>
							<p className='text-xs text-orange-500 uppercase font-semibold mb-1'>Total kWh</p>
							<p className='text-xl font-bold text-orange-500'>{f(values.energyTotal)}</p>
						</div>
						<div>
							<p className='text-xs text-purple-500 uppercase font-semibold mb-1'>Total kVARh</p>
							<p className='text-xl font-bold text-purple-500'>{f(values.kvarh)}</p>
						</div>
						<div>
							<p className='text-xs text-cyan-500 uppercase font-semibold mb-1'>Frequency</p>
							<p className='text-xl font-bold text-cyan-500'>{f(values.frequency, 1)} Hz</p>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
