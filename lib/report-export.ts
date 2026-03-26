export type ReportSheet = {
	name: string;
	rows: Array<Record<string, string | number | null>>;
};

export type PdfTable = {
	title: string;
	columns: string[];
	rows: Array<Array<string | number>>;
};

export interface PdfExportOptions {
	fileName: string;
	title: string;
	subtitle?: string;
	scopeName?: string;
	tenantName?: string;
	period?: string;
	generatedAt?: string;
	summary?: string[];
	tables: PdfTable[];
}

export const exportToExcel = async (fileName: string, sheets: ReportSheet[]): Promise<void> => {
	const XLSX = await import('xlsx');
	const workbook = XLSX.utils.book_new();

	for (const sheet of sheets) {
		const worksheet = XLSX.utils.json_to_sheet(sheet.rows);

		const colKeys = sheet.rows[0] ? Object.keys(sheet.rows[0]) : [];
		const colWidths = colKeys.map((key) => {
			const maxLen = Math.max(key.length, ...sheet.rows.map((r) => String(r[key] ?? '').length));
			return { wch: Math.min(maxLen + 2, 40) };
		});
		worksheet['!cols'] = colWidths;

		XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.slice(0, 31));
	}

	XLSX.writeFile(workbook, fileName);
};

export const exportToExcelStyled = async (fileName: string, sheets: ReportSheet[]): Promise<void> => {
	const ExcelJS = await import('exceljs');
	const workbook = new ExcelJS.Workbook();

	const HEADER_BG = 'FFEA580C'; // brand orange
	const ROW_ALT_BG = 'FFFFF7ED'; // warm light orange
	const WHITE = 'FFFFFFFF';
	const BORDER_COLOR = 'FFCB6430';

	for (const sheet of sheets) {
		const ws = workbook.addWorksheet(sheet.name.slice(0, 31));
		if (!sheet.rows.length) continue;

		const colKeys = Object.keys(sheet.rows[0]!);

		ws.columns = colKeys.map((key) => {
			const maxLen = Math.max(key.length, ...sheet.rows.map((r) => String(r[key] ?? '').length));
			return { header: key, key, width: Math.min(maxLen + 3, 42) };
		});

		// Style header row
		const headerRow = ws.getRow(1);
		headerRow.height = 26;
		headerRow.eachCell((cell) => {
			cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } };
			cell.font = { bold: true, color: { argb: WHITE }, size: 10, name: 'Calibri' };
			cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
			cell.border = {
				bottom: { style: 'medium', color: { argb: BORDER_COLOR } },
				right: { style: 'thin', color: { argb: BORDER_COLOR } },
			};
		});

		// Add data rows
		sheet.rows.forEach((rowData, i) => {
			const row = ws.addRow(colKeys.map((k) => rowData[k] ?? ''));
			const bg = i % 2 === 0 ? WHITE : ROW_ALT_BG;
			row.height = 17;
			row.eachCell({ includeEmpty: true }, (cell) => {
				cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
				cell.font = { size: 9, name: 'Calibri' };
				cell.alignment = { vertical: 'middle' };
				cell.border = {
					bottom: { style: 'hair', color: { argb: 'FFD1D5DB' } },
					right: { style: 'hair', color: { argb: 'FFD1D5DB' } },
				};
			});
		});

		// Freeze header row
		ws.views = [{ state: 'frozen', ySplit: 1 }];
	}

	const buffer = await workbook.xlsx.writeBuffer();
	const blob = new Blob([buffer as BlobPart], {
		type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	});
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = fileName;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
};

const BRAND_COLOR: [number, number, number] = [234, 88, 12];
const BRAND_DARK: [number, number, number] = [154, 52, 18];
const BRAND_LIGHT: [number, number, number] = [255, 237, 213];
const BRAND_BG: [number, number, number] = [255, 247, 237];
const TEXT_DARK: [number, number, number] = [67, 20, 7];
const MARGIN = 40;
const PDF_LOGO_PATH = '/logo-protectcube.png';

type PdfLogoAsset = {
	dataUrl: string;
	format: 'PNG' | 'JPEG' | 'WEBP';
	width: number;
	height: number;
};

type PdfLogoPlacement = {
	width: number;
	height: number;
};

const getLogoDimensions = async (src: string): Promise<{ width: number; height: number } | null> => {
	if (typeof window === 'undefined') return null;
	return await new Promise((resolve) => {
		const img = new Image();
		img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
		img.onerror = () => resolve(null);
		img.src = src;
	});
};

const detectPdfImageFormat = (mimeType: string): 'PNG' | 'JPEG' | 'WEBP' => {
	if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'JPEG';
	if (mimeType.includes('webp')) return 'WEBP';
	return 'PNG';
};

const optimizeLogoDataUrl = async (
	src: string,
	width: number,
	height: number,
): Promise<{ dataUrl: string; width: number; height: number }> => {
	if (typeof window === 'undefined') return { dataUrl: src, width, height };

	const maxWidth = 2200;
	const targetWidth = width > maxWidth ? maxWidth : width;
	const targetHeight = Math.round((height / width) * targetWidth);

	if (targetWidth === width) return { dataUrl: src, width, height };

	const img = new Image();
	img.src = src;
	await new Promise<void>((resolve, reject) => {
		img.onload = () => resolve();
		img.onerror = () => reject(new Error('Failed to load logo for optimization'));
	});

	const canvas = document.createElement('canvas');
	canvas.width = targetWidth;
	canvas.height = targetHeight;
	const ctx = canvas.getContext('2d');
	if (!ctx) return { dataUrl: src, width, height };

	ctx.imageSmoothingEnabled = true;
	ctx.imageSmoothingQuality = 'high';
	ctx.clearRect(0, 0, targetWidth, targetHeight);
	ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

	return {
		dataUrl: canvas.toDataURL('image/png'),
		width: targetWidth,
		height: targetHeight,
	};
};

const loadLogoAsset = async (): Promise<PdfLogoAsset | null> => {
	try {
		const response = await fetch(PDF_LOGO_PATH);
		if (!response.ok) return null;

		const blob = await response.blob();
		const dataUrl = await new Promise<string>((resolve, reject) => {
			const reader = new FileReader();
			reader.onloadend = () => resolve(String(reader.result));
			reader.onerror = () => reject(reader.error);
			reader.readAsDataURL(blob);
		});

		const dimensions = await getLogoDimensions(dataUrl);
		if (!dimensions) return null;

		const optimized = await optimizeLogoDataUrl(dataUrl, dimensions.width, dimensions.height);

		return {
			dataUrl: optimized.dataUrl,
			format: detectPdfImageFormat(blob.type || 'image/png'),
			width: optimized.width,
			height: optimized.height,
		};
	} catch {
		return null;
	}
};

export const exportToPdf = async (options: PdfExportOptions): Promise<void> => {
	const [{ default: jsPDF }, autoTableModule] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);

	const autoTable = autoTableModule.default;
	const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4', compress: true });
	const pageWidth = doc.internal.pageSize.getWidth();
	const pageHeight = doc.internal.pageSize.getHeight();
	const logoAsset = await loadLogoAsset();
	const HEADER_HEIGHT = 70;
	const FOOTER_HEIGHT = 30;

	const drawLogo = (x: number, y: number, targetHeight: number): PdfLogoPlacement | null => {
		if (!logoAsset || logoAsset.height <= 0) return null;
		const width = (logoAsset.width / logoAsset.height) * targetHeight;
		doc.addImage(logoAsset.dataUrl, logoAsset.format, x, y, width, targetHeight, undefined, 'MEDIUM');
		return { width, height: targetHeight };
	};

	const drawHeader = (isFirstPage: boolean) => {
		doc.setFillColor(255, 255, 255);
		doc.rect(0, 0, pageWidth, HEADER_HEIGHT, 'F');

		doc.setFillColor(...BRAND_COLOR);
		doc.rect(0, HEADER_HEIGHT - 2, pageWidth, 2, 'F');

		doc.setDrawColor(230, 230, 230);
		doc.line(0, HEADER_HEIGHT, pageWidth, HEADER_HEIGHT);

		let subtitleX = MARGIN;
		if (logoAsset) {
			const headerLogo = drawLogo(MARGIN, 10, 24);
			subtitleX = headerLogo ? MARGIN + 2 : MARGIN;
		} else {
			doc.setFont('helvetica', 'bold');
			doc.setFontSize(16);
			doc.setTextColor(...BRAND_COLOR);
			doc.text('ProtectQube', MARGIN, 30);
		}

		doc.setFont('helvetica', 'normal');
		doc.setFontSize(9);
		doc.setTextColor(120, 120, 120);
		doc.text('Energy Monitoring System', subtitleX, 44);

		if (isFirstPage && options.generatedAt) {
			doc.setFontSize(8);
			doc.setTextColor(160, 160, 160);
			const genText = `Generated: ${options.generatedAt}`;
			const genWidth = doc.getTextWidth(genText);
			doc.text(genText, pageWidth - MARGIN - genWidth, 44);
		}

		doc.setTextColor(0, 0, 0);
	};

	const drawFooter = (pageNumber: number, totalPages: number) => {
		doc.setFillColor(...BRAND_BG);
		doc.rect(0, pageHeight - FOOTER_HEIGHT, pageWidth, FOOTER_HEIGHT, 'F');

		doc.setDrawColor(...BRAND_LIGHT);
		doc.line(MARGIN, pageHeight - FOOTER_HEIGHT, pageWidth - MARGIN, pageHeight - FOOTER_HEIGHT);

		doc.setFontSize(7);
		doc.setFont('helvetica', 'normal');
		if (logoAsset) {
			const footerLogo = drawLogo(MARGIN, pageHeight - 21, 11);
			doc.setTextColor(120, 120, 120);
			const footerTextX = MARGIN + (footerLogo?.width ?? 0) + 8;
			doc.text('Energy Monitoring', footerTextX, pageHeight - 11);
		} else {
			doc.setTextColor(...BRAND_COLOR);
			doc.text('ProtectQube Energy Monitoring', MARGIN, pageHeight - 11);
		}

		const pageText = `Page ${pageNumber} of ${totalPages}`;
		const pageTextWidth = doc.getTextWidth(pageText);
		doc.setTextColor(140, 140, 140);
		doc.text(pageText, pageWidth - MARGIN - pageTextWidth, pageHeight - 11);

		doc.setTextColor(0, 0, 0);
	};

	drawHeader(true);

	let cursorY = 90;

	doc.setFont('helvetica', 'bold');
	doc.setFontSize(18);
	doc.setTextColor(...BRAND_DARK);
	doc.text(options.title, MARGIN, cursorY);
	cursorY += 20;

	if (options.scopeName || options.tenantName || options.period) {
		doc.setFontSize(10);
		doc.setFont('helvetica', 'normal');
		doc.setTextColor(80, 80, 80);

		if (options.scopeName) {
			doc.setFont('helvetica', 'bold');
			doc.setTextColor(...BRAND_COLOR);
			doc.text(`Scope: `, MARGIN, cursorY);
			const scopeLabelWidth = doc.getTextWidth('Scope: ');
			doc.setFont('helvetica', 'normal');
			doc.setTextColor(60, 60, 60);
			doc.text(options.scopeName, MARGIN + scopeLabelWidth, cursorY);
			cursorY += 14;
		}
		if (options.tenantName) {
			doc.setFont('helvetica', 'bold');
			doc.setTextColor(...BRAND_COLOR);
			doc.text(`Tenant: `, MARGIN, cursorY);
			const tenantLabelWidth = doc.getTextWidth('Tenant: ');
			doc.setFont('helvetica', 'normal');
			doc.setTextColor(60, 60, 60);
			doc.text(options.tenantName, MARGIN + tenantLabelWidth, cursorY);
			cursorY += 14;
		}
		if (options.period) {
			doc.setFont('helvetica', 'bold');
			doc.setTextColor(...BRAND_COLOR);
			doc.text(`Periode: `, MARGIN, cursorY);
			const periodLabelWidth = doc.getTextWidth('Periode: ');
			doc.setFont('helvetica', 'normal');
			doc.setTextColor(60, 60, 60);
			doc.text(options.period, MARGIN + periodLabelWidth, cursorY);
			cursorY += 14;
		}
	} else if (options.subtitle) {
		doc.setFontSize(10);
		doc.setFont('helvetica', 'normal');
		doc.setTextColor(80, 80, 80);
		doc.text(options.subtitle, MARGIN, cursorY);
		cursorY += 14;
	}

	cursorY += 4;

	if (options.summary?.length) {
		doc.setFillColor(...BRAND_BG);
		doc.setDrawColor(...BRAND_LIGHT);

		const summaryLineHeight = 13;
		const summaryBoxHeight = options.summary.length * summaryLineHeight + 16;
		doc.roundedRect(MARGIN, cursorY, pageWidth - MARGIN * 2, summaryBoxHeight, 4, 4, 'FD');

		doc.setFontSize(9);
		doc.setFont('helvetica', 'normal');
		doc.setTextColor(...TEXT_DARK);
		let summaryY = cursorY + 14;
		for (const line of options.summary) {
			doc.text(`\u2022 ${line}`, MARGIN + 12, summaryY);
			summaryY += summaryLineHeight;
		}

		cursorY = summaryY + 24;
	}

	for (const table of options.tables) {
		if (cursorY > pageHeight - 100) {
			doc.addPage();
			drawHeader(false);
			cursorY = 90;
		}

		doc.setFont('helvetica', 'bold');
		doc.setFontSize(11);
		doc.setTextColor(...BRAND_DARK);
		doc.text(table.title, MARGIN, cursorY);
		cursorY += 6;

		autoTable(doc, {
			startY: cursorY,
			head: [table.columns],
			body: table.rows,
			margin: { left: MARGIN, right: MARGIN, top: 85, bottom: 40 },
			styles: {
				fontSize: 7.5,
				cellPadding: 4,
				lineColor: [...BRAND_LIGHT],
				lineWidth: 0.5,
				textColor: [50, 50, 50],
			},
			headStyles: {
				fillColor: BRAND_COLOR,
				textColor: [255, 255, 255],
				fontStyle: 'bold',
				fontSize: 8,
			},
			alternateRowStyles: {
				fillColor: BRAND_BG,
			},
			didDrawPage: (data: { pageNumber: number }) => {
				if (data.pageNumber > 1) {
					drawHeader(false);
				}
			},
		});

		cursorY = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || cursorY) + 20;
	}

	const totalPages = doc.getNumberOfPages();
	for (let i = 1; i <= totalPages; i++) {
		doc.setPage(i);
		drawFooter(i, totalPages);
	}

	doc.save(options.fileName);
};
