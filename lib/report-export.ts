export type ReportSheet = {
  name: string;
  rows: Array<Record<string, string | number | null>>;
};

export type PdfTable = {
  title: string;
  columns: string[];
  rows: Array<Array<string | number>>;
};

export const exportToExcel = async (fileName: string, sheets: ReportSheet[]): Promise<void> => {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();

  for (const sheet of sheets) {
    const worksheet = XLSX.utils.json_to_sheet(sheet.rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.slice(0, 31));
  }

  XLSX.writeFile(workbook, fileName);
};

export const exportToPdf = async (options: {
  fileName: string;
  title: string;
  subtitle?: string;
  summary?: string[];
  tables: PdfTable[];
}): Promise<void> => {
  const [{ default: jsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const autoTable = autoTableModule.default;
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(18);
  doc.text(options.title, 40, 40);

  let cursorY = 64;

  if (options.subtitle) {
    doc.setFontSize(10);
    doc.text(options.subtitle, 40, cursorY);
    cursorY += 16;
  }

  if (options.summary?.length) {
    doc.setFontSize(10);
    for (const line of options.summary) {
      const wrapped = doc.splitTextToSize(line, pageWidth - 80);
      doc.text(wrapped, 40, cursorY);
      cursorY += wrapped.length * 12;
    }
    cursorY += 8;
  }

  for (const table of options.tables) {
    doc.setFontSize(12);
    doc.text(table.title, 40, cursorY);
    cursorY += 8;

    autoTable(doc, {
      startY: cursorY,
      head: [table.columns],
      body: table.rows,
      margin: { left: 40, right: 40 },
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [31, 41, 55] },
    });

    cursorY = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || cursorY) + 20;
  }

  doc.save(fileName);
};