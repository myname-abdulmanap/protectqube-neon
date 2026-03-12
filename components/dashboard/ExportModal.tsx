'use client';

import { useState } from 'react';
import { Download, Calendar, FileType } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export type ExportFormat = 'pdf' | 'excel';

export type ExportPeriod = {
	from: string;
	to: string;
};

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

export function localDatetimeToUtcIso(localDatetime: string): string {
	if (!localDatetime) return '';
	const asUtc = new Date(localDatetime + ':00.000Z');
	const corrected = new Date(asUtc.getTime() - WIB_OFFSET_MS);
	return corrected.toISOString();
}

export function utcToLocalDatetime(date: Date): string {
	const wib = new Date(date.getTime() + WIB_OFFSET_MS);
	const iso = wib.toISOString();
	return iso.slice(0, 16);
}

const getDefaultPeriod = () => {
	const now = new Date();
	const wibNow = new Date(now.getTime() + WIB_OFFSET_MS);
	const wibStartOfDay = new Date(wibNow);
	wibStartOfDay.setUTCHours(0, 0, 0, 0);
	return {
		from: wibStartOfDay.toISOString().slice(0, 16),
		to: utcToLocalDatetime(now),
	};
};

interface ExportModalProps {
	onExport: (format: ExportFormat, period: ExportPeriod) => Promise<void>;
	disabled?: boolean;
}

export function ExportModal({ onExport, disabled }: ExportModalProps) {
	const [open, setOpen] = useState(false);
	const [format, setFormat] = useState<ExportFormat>('pdf');
	const [localPeriod, setLocalPeriod] = useState(getDefaultPeriod);
	const [loading, setLoading] = useState(false);

	const handleExport = async () => {
		try {
			setLoading(true);
			await onExport(format, {
				from: localDatetimeToUtcIso(localPeriod.from),
				to: localDatetimeToUtcIso(localPeriod.to),
			});
			setOpen(false);
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button
					variant='outline'
					size='icon'
					className='h-8 w-8 rounded-md hover:bg-accent transition-colors shadow-sm cursor-pointer'
					disabled={disabled}
				>
					<Download className='h-4 w-4 text-muted-foreground' />
				</Button>
			</DialogTrigger>

			<DialogContent className='sm:max-w-2xl p-0 gap-0 border-border shadow-xl overflow-hidden overflow-y-auto max-h-[90vh]'>
				<div className='border-b bg-muted/30 px-6 py-4'>
					<DialogHeader>
						<DialogTitle className='text-base font-bold tracking-tight flex items-center gap-4'>
							<div className='flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary'>
								<Download className='h-4 w-4' />
							</div>
							Export Data
						</DialogTitle>
					</DialogHeader>
				</div>

				<div className='p-6 space-y-6'>
					<div className='space-y-3'>
						<Label className='text-[11px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-2'>
							<Calendar className='h-3 w-3' />
							Periode
							<span className='text-[10px] font-normal normal-case text-muted-foreground/60'>(WIB)</span>
						</Label>
						<div className='grid grid-cols-1 gap-3'>
							<div className='relative group'>
								<span className='absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 font-medium group-focus-within:text-blue-400 transition-colors'>
									FROM
								</span>
								<Input
									type='datetime-local'
									value={localPeriod.from}
									onChange={(e) => setLocalPeriod((p) => ({ ...p, from: e.target.value }))}
									className='h-9 pl-14 text-[12px] bg-background border-input focus:ring-1 transition-all'
								/>
							</div>
							<div className='relative group'>
								<span className='absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 font-medium group-focus-within:text-blue-400 transition-colors'>
									TO
								</span>
								<Input
									type='datetime-local'
									value={localPeriod.to}
									onChange={(e) => setLocalPeriod((p) => ({ ...p, to: e.target.value }))}
									className='h-9 pl-14 text-[12px] bg-background border-input focus:ring-1 transition-all'
								/>
							</div>
						</div>
					</div>

					<div className='space-y-3'>
						<Label className='text-[11px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-2'>
							<FileType className='h-3.5 w-3.5' />
							Format Output
						</Label>
						<Select value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
							<SelectTrigger className='w-full h-10 bg-background border-input font-medium text-sm cursor-pointer'>
								<SelectValue />
							</SelectTrigger>
							<SelectContent
								align='start'
								position='popper'
								className='min-w-(--radix-select-trigger-width)'
							>
								<SelectItem value='pdf' className='py-2 cursor-pointer'>
									<div className='flex items-center gap-3'>
										<div className='h-2 w-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]' />
										<span className='font-medium text-sm'>Document PDF (.pdf)</span>
									</div>
								</SelectItem>
								<SelectItem value='excel' className='py-2 cursor-pointer'>
									<div className='flex items-center gap-3'>
										<div className='h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' />
										<span className='font-medium text-sm'>Excel Spreadsheet (.xlsx)</span>
									</div>
								</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>

				<div className='bg-muted/30 border-t p-4 flex gap-3'>
					<Button
						variant='outline'
						onClick={() => setOpen(false)}
						disabled={loading}
						className='flex-1 h-10 font-medium cursor-pointer'
					>
						Batal
					</Button>
					<Button
						onClick={handleExport}
						disabled={loading}
						className={cn(
							'flex-2 h-10 font-bold shadow-md transition-all active:scale-[0.98] cursor-pointer',
							loading ? 'opacity-70' : 'bg-primary hover:opacity-90',
						)}
					>
						{loading ? (
							<div className='flex items-center gap-2'>
								<div className='h-4 w-4 border-2 border-background/30 border-t-background rounded-full animate-spin' />
								Exporting...
							</div>
						) : (
							<div className='flex items-center gap-2'>Download Report</div>
						)}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
