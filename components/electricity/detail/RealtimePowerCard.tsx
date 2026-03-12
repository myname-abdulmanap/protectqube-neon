'use client';

import { motion } from 'framer-motion';
import { Gauge } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCompactNumber, formatDateTime } from '@/lib/energy-monitoring';
import { cn } from '@/lib/utils';

interface RealtimePowerCardProps {
	powerTotal: number;
	energyTotal: number;
	capacityVa: number | null;
	isOffline: boolean;
	lastUpdated: string | null;
}

const f = (v: number, d = 2) => (Number.isFinite(v) ? v.toLocaleString('id-ID', { maximumFractionDigits: d }) : '-');

export function RealtimePowerCard({
	powerTotal,
	energyTotal,
	capacityVa,
	isOffline,
	lastUpdated,
}: RealtimePowerCardProps) {
	const capacityKw = capacityVa ? capacityVa / 1000 : 100;
	const pct = Math.min((powerTotal / capacityKw) * 100, 100);
	const circumference = 2 * Math.PI * 76;
	const offset = circumference - (circumference * pct) / 100;

	const gaugeColor = isOffline ? '#64748b' : powerTotal > capacityKw ? '#ef4444' : '#22c55e';

	return (
		<Card className={cn('border-0 shadow-sm h-full', !isOffline && 'ring-1 ring-green-500/20')}>
			<CardHeader className='px-5 py-4 pb-0'>
				<CardTitle className='text-base font-semibold flex items-center gap-2'>
					<motion.div
						animate={!isOffline ? { rotate: [0, 360] } : {}}
						transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
					>
						<Gauge className='h-5 w-5 text-green-500' />
					</motion.div>
					Daya Realtime
				</CardTitle>
			</CardHeader>

			<CardContent className='p-5 pt-4'>
				<div className='flex flex-col items-center'>
					<div className='relative'>
						<svg className='w-52 h-52 -rotate-90' viewBox='0 0 192 192'>
							<circle cx='96' cy='96' r='76' strokeWidth='12' fill='none' className='stroke-muted/20' />
							<motion.circle
								cx='96'
								cy='96'
								r='76'
								strokeWidth='12'
								fill='none'
								stroke={gaugeColor}
								strokeDasharray={circumference}
								strokeLinecap='round'
								initial={{ strokeDashoffset: circumference }}
								animate={{ strokeDashoffset: offset }}
								transition={{ duration: 0.8, ease: 'easeOut' }}
							/>
						</svg>
						<div className='absolute inset-0 flex flex-col items-center justify-center'>
							<motion.span
								className='text-5xl font-bold tabular-nums'
								key={Math.round(powerTotal * 10)}
								initial={{ scale: 0.85 }}
								animate={{ scale: 1 }}
								transition={{ type: 'spring', stiffness: 300 }}
							>
								{f(powerTotal)}
							</motion.span>
							<span className='text-base text-muted-foreground font-medium mt-0.5'>kW</span>
						</div>
					</div>

					<div className='w-full space-y-3 mt-4'>
						<div className='flex items-center justify-between'>
							<span className='text-sm text-muted-foreground'>Status</span>
							<Badge
								variant='outline'
								className={cn(
									'text-sm px-3 py-1',
									isOffline
										? 'bg-slate-500/20 text-slate-400 border-slate-500/30'
										: 'bg-green-500/20 text-green-400 border-green-500/30',
								)}
							>
								<motion.span
									className={cn(
										'inline-block w-2 h-2 rounded-full mr-2',
										isOffline ? 'bg-slate-500' : 'bg-green-500',
									)}
									animate={!isOffline ? { scale: [1, 1.4, 1], opacity: [1, 0.6, 1] } : {}}
									transition={{ duration: 1.5, repeat: Infinity }}
								/>
								{isOffline ? 'OFFLINE' : 'ONLINE'}
							</Badge>
						</div>

						<div className='flex items-center justify-between'>
							<span className='text-sm text-muted-foreground'>Capacity</span>
							<span className='text-base font-semibold'>
								{capacityVa ? `${formatCompactNumber(capacityVa)} VA` : '-'}
							</span>
						</div>

						<motion.div
							className='bg-linear-to-br from-orange-500/10 to-yellow-500/10 rounded-xl p-4 mt-10'
							whileHover={{ scale: 1.02 }}
						>
							<p className='text-xs text-muted-foreground mb-1 text-center'>Total Energy</p>
							<motion.p
								className='flex items-center justify-center text-3xl font-bold text-orange-500'
								key={Math.round(energyTotal)}
								initial={{ y: 4, opacity: 0 }}
								animate={{ y: 0, opacity: 1 }}
							>
								{f(energyTotal)}
								<span className='text-base font-normal ml-1.5 text-orange-400'>kWh</span>
							</motion.p>
						</motion.div>

						{lastUpdated && (
							<p className='text-xs text-muted-foreground text-center'>
								Updated {formatDateTime(lastUpdated)}
							</p>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
