'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, MapPin, Cpu, Signal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OutletDetailPayload } from '@/app/dashboard/electricity/[scopeId]/page';

interface OutletProfileCardProps {
	detail: OutletDetailPayload;
}

const STATUS_STYLE: Record<string, string> = {
	online: 'bg-green-500/20 text-green-500 border-green-500/30',
	offline: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
	alert: 'bg-red-500/20   text-red-500   border-red-500/30',
	high: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
};

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
	if (!value) return null;
	return (
		<div className='flex items-start gap-3 py-2.5 border-b border-border/30 last:border-0'>
			<div className='text-muted-foreground mt-0.5'>{icon}</div>
			<div>
				<p className='text-xs text-muted-foreground'>{label}</p>
				<p className='text-sm font-semibold mt-0.5'>{value}</p>
			</div>
		</div>
	);
}

export function OutletProfileCard({ detail }: OutletProfileCardProps) {
	const safeDevices = detail.devices ?? [];

	return (
		<Card className='border-0 shadow-sm'>
			<CardHeader className='px-5 py-4 pb-0'>
				<CardTitle className='text-base font-semibold flex items-center gap-2'>
					<Building2 className='h-5 w-5 text-blue-500' />
					Outlet Profile
				</CardTitle>
			</CardHeader>

			<CardContent className='p-5 pt-3'>
				<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
					{/* Left: outlet info */}
					<div>
						<p className='text-xl font-bold mb-1'>{detail.name}</p>
						<p className='text-sm text-muted-foreground mb-4'>{detail.id}</p>
						<InfoRow icon={<MapPin className='h-4 w-4' />} label='Region' value={detail.region} />
						<InfoRow icon={<MapPin className='h-4 w-4' />} label='City' value={detail.city} />
						<InfoRow icon={<MapPin className='h-4 w-4' />} label='Address' value={detail.address} />
						{detail.capacityVa && (
							<InfoRow
								icon={<Signal className='h-4 w-4' />}
								label='Capacity'
								value={`${detail.capacityVa.toLocaleString('id-ID')} VA${detail.maxLoadKw ? ` / ${detail.maxLoadKw} kW max` : ''}`}
							/>
						)}
					</div>

					{/* Right: devices */}
					<div>
						<p className='text-sm font-semibold mb-3 flex items-center gap-2'>
							<Cpu className='h-4 w-4 text-muted-foreground' />
							Devices
							<span className='text-xs font-normal text-muted-foreground'>({safeDevices.length})</span>
						</p>

						{safeDevices.length === 0 ? (
							<p className='text-sm text-muted-foreground'>No devices found</p>
						) : (
							<div className='space-y-2 max-h-64 overflow-y-auto pr-1'>
								{safeDevices.map((d) => {
									const statusKey = d.status?.toLowerCase() ?? 'offline';
									return (
										<div key={d.id} className='flex items-start gap-3 bg-muted/30 rounded-xl p-3'>
											<div
												className={cn('w-2.5 h-2.5 rounded-full mt-1 shrink-0', {
													'bg-green-500': statusKey === 'online',
													'bg-slate-400': statusKey === 'offline',
													'bg-red-500': statusKey === 'alert',
													'bg-yellow-500': statusKey === 'high',
												})}
											/>
											<div className='flex-1 min-w-0'>
												<p className='text-sm font-semibold truncate'>{d.name}</p>
												<p className='text-xs text-muted-foreground'>{d.serialNo}</p>
												{d.locationName && (
													<p className='text-xs text-muted-foreground'>{d.locationName}</p>
												)}
												{(d.moduleTypes ?? []).length > 0 && (
													<div className='flex flex-wrap gap-1 mt-1.5'>
														{(d.moduleTypes ?? []).map((mt) => (
															<Badge
																key={mt}
																variant='outline'
																className='text-xs px-1.5 py-0.5 h-auto'
															>
																{mt}
															</Badge>
														))}
													</div>
												)}
											</div>
											<Badge
												variant='outline'
												className={cn(
													'text-xs shrink-0',
													STATUS_STYLE[statusKey] ?? STATUS_STYLE['offline'],
												)}
											>
												{d.status ?? 'offline'}
											</Badge>
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
