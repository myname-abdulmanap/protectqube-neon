'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

interface DataLoadingOverlayProps {
	isLoading: boolean;
	label?: string;
}

export function DataLoadingOverlay({ isLoading, label }: DataLoadingOverlayProps) {
	return (
		<AnimatePresence>
			{isLoading && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.18 }}
					className='absolute inset-0 z-10 rounded-xl overflow-hidden pointer-events-none'
				>
					<div className='absolute inset-0 bg-background/60 backdrop-blur-[2px]' />

					<motion.div
						className='absolute inset-0'
						style={{
							background:
								'linear-gradient(105deg, transparent 40%, hsl(var(--primary)/0.06) 50%, transparent 60%)',
							backgroundSize: '200% 100%',
						}}
						animate={{ backgroundPosition: ['-100% 0', '200% 0'] }}
						transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
					/>

					<div className='absolute inset-0 flex items-center justify-center'>
						<motion.div
							initial={{ scale: 0.85, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							exit={{ scale: 0.85, opacity: 0 }}
							className='flex items-center gap-2 bg-background/90 border border-border/50 shadow-lg rounded-full px-4 py-2'
						>
							<motion.div
								animate={{ rotate: 360 }}
								transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
							>
								<RefreshCw className='h-3.5 w-3.5 text-primary' />
							</motion.div>
							<span className='text-xs font-medium text-foreground/80'>{label}</span>
						</motion.div>
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
