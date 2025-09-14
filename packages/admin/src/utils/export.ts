export function exportToCSV(filename: string, columns: string[], rows: Array<Record<string, any>>) {
  const header = columns.join(',');
  const escape = (val: any) => {
    if (val === null || val === undefined) return '';
    const s = String(val).replace(/"/g, '""');
    if (/[",\n]/.test(s)) return `"${s}"`;
    return s;
  };
  const body = rows.map(row => columns.map(c => escape(row[c])).join(',')).join('\n');
  const csv = header + '\n' + body;

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}


