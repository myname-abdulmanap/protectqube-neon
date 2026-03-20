'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, MapPin, Cpu, Zap, Radio, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OutletDetailPayload } from '@/app/dashboard/electricity/[scopeId]/page';
import { useRouter } from 'next/navigation';

interface OutletProfileCardProps {
	detail: OutletDetailPayload;
}

const STATUS_STYLE: Record<string, string> = {
	online: 'bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-500/20',
	offline: 'bg-slate-500/10 text-slate-500 border-slate-200 dark:border-slate-500/20',
	alert: 'bg-rose-500/10 text-rose-600 border-rose-200 dark:border-rose-500/20',
	high: 'bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-500/20',
};

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
	if (!value) return null;
	return (
		<div className='group flex items-center gap-4 py-3 transition-all'>
			<div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors'>
				{icon}
			</div>
			<div className='flex flex-col min-w-0'>
				<span className='text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70'>
					{label}
				</span>
				<span className='text-sm font-medium leading-none truncate mt-1'>{value}</span>
			</div>
		</div>
	);
}

export function OutletProfileCard({ detail }: OutletProfileCardProps) {
	const safeDevices = detail.devices ?? [];
	const router = useRouter();

	return (
		<Card className='border border-border/60 shadow-sm h-full gap-0 py-0 flex flex-col'>
			<CardHeader className='px-5 pt-5 pb-0 gap-0 shrink-0'>
				<CardTitle className='text-lg font-bold flex items-center gap-2'>
					<Building2 className='h-5 w-5 text-blue-600' />
					Outlet Profile
				</CardTitle>
			</CardHeader>

			<CardContent className='p-0 flex flex-col flex-1 text-sm sm:text-base'>
				<div className='grid grid-cols-1 lg:grid-cols-12'>
					<div className='lg:col-span-5 p-6 border-b lg:border-b-0 lg:border-r border-border/50'>
						<div className='mb-6'>
							<h3 className='text-lg font-black tracking-tight text-foreground'>{detail.name}</h3>
							<div className='flex items-center gap-2 mt-2'>
								{detail.capacityVa && (
									<div className='flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100'>
										<Zap className='h-3 w-3 fill-current' />
										{detail.capacityVa.toLocaleString('id-ID')} VA
									</div>
								)}
							</div>
						</div>

						<div className='space-y-1'>
							<InfoRow icon={<Radio className='h-4 w-4' />} label='Region' value={detail.region} />
							<InfoRow icon={<MapPin className='h-4 w-4' />} label='City' value={detail.city} />
							<InfoRow
								icon={<MapPin className='h-4 w-4' />}
								label='Full Address'
								value={detail.address}
							/>
						</div>
					</div>

					<div className='lg:col-span-7 p-6'>
						<div className='flex items-center justify-between mb-4'>
							<div className='flex items-center gap-2'>
								<Cpu className='h-4 w-4 text-primary' />
								<span className='font-bold text-sm uppercase tracking-wide'>Connected Devices</span>
							</div>
							<Badge variant='secondary' className='rounded-full px-2.5'>
								{safeDevices.length} Total
							</Badge>
						</div>

						{safeDevices.length === 0 ? (
							<div className='flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-2xl'>
								<Cpu className='h-8 w-8 text-muted-foreground/30 mb-2' />
								<p className='text-sm text-muted-foreground'>No telemetry devices found</p>
							</div>
						) : (
							<div className='grid gap-3 max-h-95 overflow-y-auto pr-2 custom-scrollbar'>
								{safeDevices.map((d) => {
									const statusKey = d.status?.toLowerCase() ?? 'offline';

									return (
										<div
											key={d.id}
											onClick={() => router.push('/dashboard/devices')}
											className='group relative flex items-center gap-4 border border-border/50 rounded-xl p-4 transition-all hover:shadow-md hover:border-primary/20 cursor-pointer'
										>
											<div className='flex-1 min-w-0'>
												<div className='flex items-center gap-2'>
													<p className='text-sm font-bold truncate group-hover:text-primary transition-colors'>
														{d.name}
													</p>
												</div>
												<div className='flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5'>
													<span className='font-mono'>{d.serialNo}</span>
													{d.locationName && (
														<>
															<span className='opacity-30'>•</span>
															<span>{d.locationName}</span>
														</>
													)}
												</div>

												{(d.moduleTypes ?? []).length > 0 && (
													<div className='flex flex-wrap gap-1 mt-2'>
														<Badge
															variant='outline'
															className={cn(
																'text-[10px] font-bold uppercase tracking-wider px-2 py-0 border',
																STATUS_STYLE[statusKey] ?? STATUS_STYLE['offline'],
															)}
														>
															{d.status ?? 'offline'}
														</Badge>
														{(d.moduleTypes ?? []).map((mt) => (
															<span
																key={mt}
																className='text-[9px] font-bold uppercase px-1.5 py-0.5 bg-secondary rounded text-secondary-foreground'
															>
																{mt}
															</span>
														))}
													</div>
												)}
											</div>

											<div className='flex flex-col items-end gap-2'>
												<ChevronRight className='h-4 w-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-1 transition-all' />
											</div>
										</div>
									);
								})}
							</div>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
