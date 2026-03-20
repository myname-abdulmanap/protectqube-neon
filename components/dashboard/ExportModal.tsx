'use client';

import { useState } from 'react';
import { Download, FileText, Sheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export type ExportFormat = 'pdf' | 'excel';
export type ExportPeriod = { from: string; to: string };

interface ExportModalProps {
	onExport: (format: ExportFormat, period: ExportPeriod) => Promise<void>;
	disabled?: boolean;
}

const getDefaultPeriod = (): ExportPeriod => {
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const pad = (n: number) => n.toString().padStart(2, '0');
	const fmt = (d: Date) =>
		`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
	return { from: fmt(today), to: fmt(now) };
};

const FORMAT_OPTIONS: Array<{
	value: ExportFormat;
	label: string;
	description: string;
	icon: React.ReactNode;
}> = [
	{
		value: 'pdf',
		label: 'PDF',
		description: 'Print-ready document',
		icon: <FileText className='h-4 w-4' />,
	},
	{
		value: 'excel',
		label: 'Excel',
		description: 'Spreadsheet (.xlsx)',
		icon: <Sheet className='h-4 w-4' />,
	},
];

export function ExportModal({ onExport, disabled }: ExportModalProps) {
	const [open, setOpen] = useState(false);
	const [format, setFormat] = useState<ExportFormat>('pdf');
	const [period, setPeriod] = useState<ExportPeriod>(getDefaultPeriod);
	const [loading, setLoading] = useState(false);

	const handleExport = async () => {
		try {
			setLoading(true);
			await onExport(format, period);
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
					className='h-8 w-8 border-border/60 bg-background hover:bg-muted/50 shadow-sm hover:shadow-none transition-all cursor-pointer'
					disabled={disabled}
				>
					<Download className='h-3.5 w-3.5 text-muted-foreground' />
				</Button>
			</DialogTrigger>

			<DialogContent className='sm:max-w-2xl p-0 overflow-hidden gap-0'>
				<DialogHeader className='px-5 pt-5 pb-4 border-b border-border/50'>
					<div className='flex items-center gap-3'>
						<div className='flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary'>
							<Download className='h-4 w-4' />
						</div>
						<div>
							<DialogTitle className='text-sm font-semibold'>Export Data</DialogTitle>
							<p className='text-[11px] text-muted-foreground mt-0.5'>
								Download laporan dalam format pilihan
							</p>
						</div>
					</div>
				</DialogHeader>

				<div className='px-5 py-4 space-y-4'>
					<div className='space-y-2'>
						<Label className='text-[11px] font-medium text-muted-foreground uppercase tracking-wide'>
							Periode
						</Label>
						<div className='grid grid-cols-2 gap-2'>
							<div className='space-y-1'>
								<p className='text-[10px] text-muted-foreground'>From</p>
								<Input
									type='datetime-local'
									value={period.from}
									onChange={(e) => setPeriod((p) => ({ ...p, from: e.target.value }))}
									className='h-8 text-xs border-border/60 bg-muted/30 focus:bg-background transition-colors'
								/>
							</div>
							<div className='space-y-1'>
								<p className='text-[10px] text-muted-foreground'>To</p>
								<Input
									type='datetime-local'
									value={period.to}
									onChange={(e) => setPeriod((p) => ({ ...p, to: e.target.value }))}
									className='h-8 text-xs border-border/60 bg-muted/30 focus:bg-background transition-colors'
								/>
							</div>
						</div>
					</div>

					<div className='space-y-2'>
						<Label className='text-[11px] font-medium text-muted-foreground uppercase tracking-wide'>
							Format
						</Label>
						<div className='grid grid-cols-2 gap-2'>
							{FORMAT_OPTIONS.map((opt) => (
								<button
									key={opt.value}
									onClick={() => setFormat(opt.value)}
									className={cn(
										'flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left transition-all cursor-pointer',
										format === opt.value
											? 'border-primary/50 bg-primary/5 dark:bg-primary/10 text-primary'
											: 'border-border/60 bg-muted/20 hover:bg-muted/50 text-foreground/70 hover:text-foreground',
									)}
								>
									<span
										className={cn(
											'shrink-0 transition-colors',
											format === opt.value ? 'text-primary' : 'text-muted-foreground',
										)}
									>
										{opt.icon}
									</span>
									<div>
										<p className='text-xs font-medium leading-none'>{opt.label}</p>
										<p className='text-[10px] text-muted-foreground mt-0.5 leading-none'>
											{opt.description}
										</p>
									</div>
								</button>
							))}
						</div>
					</div>
				</div>

				<div className='px-5 pb-5 pt-2'>
					<Button
						onClick={handleExport}
						disabled={loading}
						className='w-full h-10 text-xs font-medium gap-1.5 cursor-pointer'
					>
						{loading ? (
							<>
								<div className='h-3 w-3 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground' />
								Exporting...
							</>
						) : (
							<>
								<Download className='h-3.5 w-3.5' />
								Export {format.toUpperCase()}
							</>
						)}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
