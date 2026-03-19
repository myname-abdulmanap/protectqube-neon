'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, ChevronDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export type DatePreset = 'today' | '7d' | '30d' | '90d' | 'custom';

export interface DateRange {
	preset: DatePreset;
	from: string;
	to: string;
}

const toInputValue = (d: Date) => {
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const startOfDay = (d: Date): Date => {
	const v = new Date(d);
	v.setHours(0, 0, 0, 0);
	return v;
};

const endOfDay = (d: Date): Date => {
	const v = new Date(d);
	v.setHours(23, 59, 59, 999);
	return v;
};

export function buildRange(preset: Exclude<DatePreset, 'custom'>): DateRange {
	const now = new Date();
	const eod = endOfDay(now);
	switch (preset) {
		case '7d':
			return {
				preset,
				from: startOfDay(new Date(now.getTime() - 6 * 864e5)).toISOString(),
				to: eod.toISOString(),
			};
		case '30d':
			return {
				preset,
				from: startOfDay(new Date(now.getTime() - 29 * 864e5)).toISOString(),
				to: eod.toISOString(),
			};
		case '90d':
			return {
				preset,
				from: startOfDay(new Date(now.getTime() - 89 * 864e5)).toISOString(),
				to: eod.toISOString(),
			};
		case 'today':
		default:
			return { preset: 'today', from: startOfDay(now).toISOString(), to: eod.toISOString() };
	}
}

export function rangeLabel(r: DateRange): string {
	const labels: Record<DatePreset, string> = {
		today: 'Today',
		'7d': '7 Days',
		'30d': '30 Days',
		'90d': '90 Days',
		custom: 'Custom',
	};
	if (r.preset === 'custom') {
		const from = new Date(r.from).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
		const to = new Date(r.to).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
		return `${from} – ${to}`;
	}
	return labels[r.preset];
}

const PRESETS: Array<{ key: DatePreset; label: string }> = [
	{ key: 'today', label: 'Today' },
	{ key: '7d', label: 'Last 7 days' },
	{ key: '30d', label: 'Last 30 days' },
	{ key: '90d', label: 'Last 90 days' },
	{ key: 'custom', label: 'Custom range' },
];

interface DateFilterProps {
	value: DateRange;
	onChange: (r: DateRange) => void;
}

export function DateFilter({ value, onChange }: DateFilterProps) {
	const [open, setOpen] = useState(false);
	const [customFrom, setCustomFrom] = useState('');
	const [customTo, setCustomTo] = useState('');

	useEffect(() => {
		if (value.preset === 'custom' && value.from && value.to) {
			// eslint-disable-next-line react-hooks/set-state-in-effect
			setCustomFrom(toInputValue(new Date(value.from)));
			setCustomTo(toInputValue(new Date(value.to)));
		}
	}, [value.preset, value.from, value.to]);

	const handlePreset = (preset: DatePreset) => {
		if (preset === 'custom') {
			setCustomFrom('');
			setCustomTo('');
			onChange({ preset: 'custom', from: '', to: '' });
			return;
		}
		onChange(buildRange(preset as Exclude<DatePreset, 'custom'>));
		setOpen(false);
	};

	const canApply = customFrom.trim() !== '' && customTo.trim() !== '';

	const handleCustomApply = () => {
		if (!canApply) return;
		const from = new Date(customFrom);
		const to = new Date(customTo);
		if (isNaN(from.getTime()) || isNaN(to.getTime())) return;
		const [start, end] = from <= to ? [from, to] : [to, from];
		onChange({ preset: 'custom', from: start.toISOString(), to: end.toISOString() });
		setOpen(false);
	};

	const triggerLabel = value.preset === 'custom' && (!value.from || !value.to) ? 'Custom range' : rangeLabel(value);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant='outline'
					size='sm'
					className={cn(
						'gap-1.5 border-border/60 bg-background hover:bg-muted/50 font-normal cursor-pointer transition-all',
						'shadow-sm hover:shadow-none h-8 text-xs px-3 gap-2',
					)}
				>
					<CalendarDays className={cn('text-muted-foreground w-4 h-4')} />
					<span className='text-foreground/80'>{triggerLabel}</span>
					<ChevronDown
						className={cn('text-muted-foreground transition-transform h-3 w-3', open && 'rotate-180')}
					/>
				</Button>
			</PopoverTrigger>

			<PopoverContent align='end' sideOffset={6} className='w-52 p-1.5 shadow-lg border-border/60'>
				<div className='space-y-0.5'>
					{PRESETS.map(({ key, label }) => {
						const isActive = value.preset === key;
						return (
							<button
								key={key}
								onClick={() => handlePreset(key)}
								className={cn(
									'w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors cursor-pointer',
									isActive
										? 'bg-primary/10 text-primary font-medium dark:bg-primary/15'
										: 'text-foreground/70 hover:text-foreground hover:bg-muted/60',
								)}
							>
								{label}
								{isActive && <Check className='h-3 w-3 shrink-0' />}
							</button>
						);
					})}
				</div>

				{value.preset === 'custom' && (
					<div className='border-t border-border/50 mt-1.5 pt-2 space-y-2 px-0.5'>
						<div className='space-y-1'>
							<p className='text-[10px] font-medium text-muted-foreground uppercase tracking-wide px-0.5'>
								From
							</p>
							<Input
								type='datetime-local'
								value={customFrom}
								onChange={(e) => setCustomFrom(e.target.value)}
								className='h-7 text-[11px] border-border/60 bg-muted/30 focus:bg-background'
							/>
						</div>
						<div className='space-y-1'>
							<p className='text-[10px] font-medium text-muted-foreground uppercase tracking-wide px-0.5'>
								To
							</p>
							<Input
								type='datetime-local'
								value={customTo}
								onChange={(e) => setCustomTo(e.target.value)}
								className='h-7 text-[11px] border-border/60 bg-muted/30 focus:bg-background'
							/>
						</div>
						<Button
							size='sm'
							className='w-full h-7 text-[11px] font-medium mt-0.5'
							onClick={handleCustomApply}
							disabled={!canApply}
						>
							Apply range
						</Button>
						{!canApply && (
							<p className='text-[10px] text-muted-foreground text-center pb-0.5'>
								Select both dates to apply
							</p>
						)}
					</div>
				)}
			</PopoverContent>
		</Popover>
	);
}
