'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

interface DataLoadingOverlayProps {
	isLoading: boolean;
	label?: string;
}

export function DataLoadingOverlay({
	isLoading,
	label = 'Load data 25 Feb 2026 – 26 Mar 2026',
}: DataLoadingOverlayProps) {
	return (
		<AnimatePresence>
			{isLoading && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					className='absolute inset-0 z-20 rounded-xl overflow-hidden flex items-center justify-center p-4'
				>
					<div className='absolute inset-0 bg-background/40 backdrop-blur-md' />

					<motion.div
						className='absolute inset-0 opacity-30'
						style={{
							background:
								'linear-gradient(90deg, transparent 0%, hsl(var(--primary)/0.15) 50%, transparent 100%)',
							backgroundSize: '200% 100%',
						}}
						animate={{ backgroundPosition: ['-200% 0', '200% 0'] }}
						transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
					/>

					<motion.div
						initial={{ scale: 0.9, opacity: 0, y: 5 }}
						animate={{ scale: 1, opacity: 1, y: 0 }}
						exit={{ scale: 0.9, opacity: 0, y: 5 }}
						transition={{ type: 'spring', damping: 20, stiffness: 300 }}
						className='relative z-30 flex items-center gap-4 bg-background/95 border border-border/60 shadow-xl shadow-black/5 rounded-3xl px-7 py-5 max-w-[90%]'
					>
						<div className='relative shrink-0 flex items-center justify-center'>
							<motion.div
								animate={{ rotate: 360 }}
								transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
							>
								<RefreshCw className='h-4.5 w-4.5 text-primary' />
							</motion.div>
						</div>

						{label && (
							<span className='text-[15px] font-semibold tracking-tight text-foreground/90 leading-snug'>
								{label}
							</span>
						)}
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
