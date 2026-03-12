'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, ChevronDown } from 'lucide-react';
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
				from: startOfDay(new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)).toISOString(),
				to: eod.toISOString(),
			};
		case '30d':
			return {
				preset,
				from: startOfDay(new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000)).toISOString(),
				to: eod.toISOString(),
			};
		case '90d':
			return {
				preset,
				from: startOfDay(new Date(now.getTime() - 89 * 24 * 60 * 60 * 1000)).toISOString(),
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
	{ key: '7d', label: '7 Days' },
	{ key: '30d', label: '30 Days' },
	{ key: '90d', label: '90 Days' },
	{ key: 'custom', label: 'Custom' },
];

interface DateFilterProps {
	value: DateRange;
	onChange: (r: DateRange) => void;
	size?: 'sm' | 'xs';
}

export function DateFilter({ value, onChange, size = 'sm' }: DateFilterProps) {
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
		const r = buildRange(preset as Exclude<DatePreset, 'custom'>);
		onChange(r);
		setOpen(false);
	};

	const canApply = customFrom.trim() !== '' && customTo.trim() !== '';

	const handleCustomApply = () => {
		if (!canApply) return;
		const from = new Date(customFrom);
		const to = new Date(customTo);
		if (isNaN(from.getTime()) || isNaN(to.getTime())) return;
		const [start, end] = from <= to ? [from, to] : [to, from];
		onChange({
			preset: 'custom',
			from: start.toISOString(),
			to: end.toISOString(),
		});
		setOpen(false);
	};

	const isXs = size === 'xs';

	const triggerLabel = (() => {
		if (value.preset === 'custom' && (!value.from || !value.to)) return 'Custom';
		return rangeLabel(value);
	})();

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant='outline'
					size='sm'
					className={cn(
						'h-7 gap-1.5 border-0 bg-muted/50 font-normal cursor-pointer',
						isXs ? 'text-xs px-2' : 'text-sm px-3',
					)}
				>
					<CalendarDays className={cn(isXs ? 'h-3 w-3' : 'h-3.5 w-3.5', 'text-muted-foreground')} />
					{triggerLabel}
					<ChevronDown className='h-3 w-3 text-muted-foreground' />
				</Button>
			</PopoverTrigger>

			<PopoverContent align='end' className='w-56 p-2'>
				<div className='space-y-0.5 mb-2'>
					{PRESETS.map(({ key, label }) => (
						<button
							key={key}
							onClick={() => handlePreset(key)}
							className={cn(
								'w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors cursor-pointer',
								value.preset === key
									? 'bg-primary text-primary-foreground font-medium'
									: 'hover:bg-muted text-foreground',
							)}
						>
							{label}
						</button>
					))}
				</div>

				{value.preset === 'custom' && (
					<div className='border-t border-border/50 pt-2 space-y-1.5'>
						<div>
							<p className='text-[10px] text-muted-foreground mb-0.5'>From</p>
							<Input
								type='datetime-local'
								value={customFrom}
								onChange={(e) => setCustomFrom(e.target.value)}
								className='h-7 text-xs'
							/>
						</div>
						<div>
							<p className='text-[10px] text-muted-foreground mb-0.5'>To</p>
							<Input
								type='datetime-local'
								value={customTo}
								onChange={(e) => setCustomTo(e.target.value)}
								className='h-7 text-xs'
							/>
						</div>
						<Button
							size='sm'
							className='w-full h-7 text-xs mt-1 cursor-pointer'
							onClick={handleCustomApply}
							disabled={!canApply}
						>
							Apply
						</Button>
						{!canApply && (
							<p className='text-[10px] text-muted-foreground text-center'>Please select both dates</p>
						)}
					</div>
				)}
			</PopoverContent>
		</Popover>
	);
}
