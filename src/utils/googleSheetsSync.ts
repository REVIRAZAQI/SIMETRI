import * as XLSX from 'xlsx';
import { CustomerMasterItem } from '../types';

export const DEFAULT_GOOGLE_SHEETS_URL =
  'https://docs.google.com/spreadsheets/d/1FJcq5sNAK2Ybq-LymuORr4KV5N249Dg5TWmb2J6_wAY/edit?gid=1799557564#gid=1799557564';

export interface ParseResult {
  customers: CustomerMasterItem[];
  totalRows: number;
  parsedCount: number;
  skippedCount: number;
  detectedColumns: string[];
}

export interface FetchSheetsResult {
  success: boolean;
  totalCount?: number;
  syncedCount?: number;
  sampleCustomers?: CustomerMasterItem[];
  detectedHeaders?: string[];
  lastSync?: string;
  spreadsheetId?: string;
  gid?: string;
  error?: string;
}

/**
 * Fast client CSV parser that handles quotes and commas in milliseconds
 */
export function parseCsvFastString(csvText: string): { headers: string[]; rows: string[][] } {
  const lines = csvText.split(/\r?\n/);
  if (lines.length === 0) return { headers: [], rows: [] };

  function splitLine(line: string): string[] {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === ',' && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += c;
      }
    }
    result.push(cur.trim());
    return result;
  }

  const rawHeaders = splitLine(lines[0]);
  const headers = rawHeaders.map((h) =>
    h.toUpperCase().replace(/^["']|["']$/g, '').replace(/[^A-Z0-9_]/g, '').trim()
  );

  const rows: string[][] = [];
  for (let i = 1; i < lines.length; i++) {
    const l = lines[i].trim();
    if (!l) continue;
    rows.push(splitLine(l));
  }
  return { headers, rows };
}

/**
 * Fetch and synchronize data directly with backend Google Sheets service
 */
export async function fetchGoogleSheetsCsv(
  sheetUrl: string,
  replaceAll: boolean = false
): Promise<FetchSheetsResult> {
  const cleanUrl = (sheetUrl || DEFAULT_GOOGLE_SHEETS_URL).trim();

  try {
    const res = await fetch('/api/sync-google-sheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: cleanUrl, replaceAll }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      return {
        success: true,
        totalCount: data.totalCount,
        syncedCount: data.syncedCount,
        sampleCustomers: data.sampleCustomers || [],
        detectedHeaders: data.detectedHeaders || [],
        lastSync: data.lastSync,
        spreadsheetId: data.spreadsheetId,
        gid: data.gid,
      };
    } else if (data.error) {
      return {
        success: false,
        error: data.error,
      };
    }
  } catch (err: any) {
    console.error('Backend Google Sheets sync request failed:', err);
  }

  return {
    success: false,
    error:
      'Gagal terhubung ke server atau Google Sheets. Pastikan spreadsheet telah diatur ke "Siapa saja yang memiliki link dapat melihat" (Anyone with the link can view) pada menu Bagikan di Google Spreadsheet Anda.',
  };
}

/**
 * Fetch all customer master records from server (fast gzipped)
 */
export async function fetchAllCustomersFromServer(): Promise<{
  success: boolean;
  total: number;
  customers: CustomerMasterItem[];
  lastSync?: string;
}> {
  try {
    const res = await fetch('/api/customers/all');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return {
      success: true,
      total: json.total || 0,
      customers: json.data || [],
      lastSync: json.lastSync,
    };
  } catch (err: any) {
    console.error('Error fetching all customers from server:', err);
    return { success: false, total: 0, customers: [] };
  }
}

/**
 * High-speed search customer API
 */
export async function searchCustomersApi(
  search: string = '',
  page: number = 1,
  limit: number = 100
): Promise<{ total: number; page: number; limit: number; totalPages: number; data: CustomerMasterItem[] } | null> {
  try {
    const res = await fetch(`/api/customers?search=${encodeURIComponent(search)}&page=${page}&limit=${limit}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.error('Search customer API error:', e);
  }
  return null;
}

/**
 * Instant IDPEL lookup API
 */
export async function lookupCustomerApi(idpel: string): Promise<CustomerMasterItem | null> {
  try {
    const res = await fetch(`/api/customers/lookup/${encodeURIComponent(idpel.trim())}`);
    if (res.ok) {
      const data = await res.json();
      if (data.found && data.customer) {
        return data.customer;
      }
    }
  } catch (e) {
    console.error('Customer lookup API error:', e);
  }
  return null;
}

/**
 * Get customer stats from backend
 */
export async function getCustomerStatsApi(): Promise<{ totalCount: number; lastSync: string | null } | null> {
  try {
    const res = await fetch('/api/customers/stats');
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.error('Customer stats API error:', e);
  }
  return null;
}

/**
 * Parse raw CSV text or Excel binary buffer into CustomerMasterItem[]
 * Fast line parser is used for CSV strings to prevent browser thread freeze.
 */
export function parseSpreadsheetToCustomerList(
  input: string | ArrayBuffer
): ParseResult {
  // If string, use our lightweight high-speed parser
  if (typeof input === 'string') {
    const { headers, rows } = parseCsvFastString(input);
    if (headers.length === 0 || rows.length === 0) {
      return { customers: [], totalRows: 0, parsedCount: 0, skippedCount: 0, detectedColumns: [] };
    }

    const findColIdx = (...names: string[]) => {
      for (const target of names) {
        const cleanTarget = target.toUpperCase().replace(/[^A-Z0-9]/g, '');
        const idx = headers.findIndex((h) => {
          const cleanH = h.replace(/[^A-Z0-9]/g, '');
          return cleanH === cleanTarget || cleanH.includes(cleanTarget);
        });
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const idpelIdx = findColIdx('IDPEL', 'ID_PELANGGAN', 'NOIDPEL', 'ID', 'NOMORPELANGGAN');
    const namaIdx = findColIdx('NAMA_PELANGGAN', 'NAMAPELANGGAN', 'NAMA', 'PELANGGAN', 'CONSUMERNAME');
    const alamatIdx = findColIdx('ALAMAT', 'ALAMAT_PELANGGAN', 'ALAMATPELANGGAN', 'ADDRESS', 'LOKASI');
    const tarifIdx = findColIdx('TARIF', 'GOL_TARIF', 'GOLTARIF', 'KODE_TARIF');
    const dayaIdx = findColIdx('DAYA', 'DAYA_VA', 'DAYAVA', 'VA', 'KAPASITAS');
    const garduIdx = findColIdx('GARDU', 'KODE_GARDU', 'NAMA_GARDU', 'TRAFO');
    const titikIdx = findColIdx('TITIK_TUMPU', 'TITIKTUMPU', 'TIANG', 'NOTIANG', 'POLE');
    const merkIdx = findColIdx('MERK_METER', 'MERKMETER', 'MERK', 'BRAND', 'TIPEMETER');
    const noMeterIdx = findColIdx('NOMOR_METER', 'NOMORMETER', 'NOMETER', 'SERIALMETER', 'NOSERI');

    if (idpelIdx === -1) {
      return { customers: [], totalRows: rows.length, parsedCount: 0, skippedCount: rows.length, detectedColumns: headers };
    }

    const customers: CustomerMasterItem[] = [];
    let skippedCount = 0;
    const now = Date.now();

    rows.forEach((row, idx) => {
      let idpelVal = (row[idpelIdx] || '').replace(/^["']|["']$/g, '').trim();
      if (!idpelVal || idpelVal.length < 3) {
        skippedCount++;
        return;
      }

      const nama = namaIdx !== -1 && row[namaIdx] ? row[namaIdx].trim() : 'Pelanggan PLN';
      const alamat = alamatIdx !== -1 && row[alamatIdx] ? row[alamatIdx].trim() : 'Alamat Terdaftar';
      const tarif = tarifIdx !== -1 && row[tarifIdx] ? row[tarifIdx].trim() : 'R1M';
      const daya = dayaIdx !== -1 && row[dayaIdx] ? row[dayaIdx].trim() : '900 VA';
      const gardu = garduIdx !== -1 && row[garduIdx] ? row[garduIdx].trim() : '-';
      const titikTumpu = titikIdx !== -1 && row[titikIdx] ? row[titikIdx].trim() : '-';
      const merkMeter = merkIdx !== -1 && row[merkIdx] ? row[merkIdx].trim() : '-';
      const nomorMeter = noMeterIdx !== -1 && row[noMeterIdx] ? row[noMeterIdx].trim() : '-';

      customers.push({
        id: `CUST-LOCAL-${now}-${idx + 1}`,
        idpel: idpelVal,
        nama,
        alamat,
        tarif,
        daya,
        gardu,
        titikTumpu,
        merkMeter,
        nomorMeter,
      });
    });

    return {
      customers,
      totalRows: rows.length,
      parsedCount: customers.length,
      skippedCount,
      detectedColumns: headers,
    };
  }

  // If binary Excel ArrayBuffer, use XLSX
  let rawRows: Record<string, any>[] = [];
  try {
    const data = new Uint8Array(input);
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return { customers: [], totalRows: 0, parsedCount: 0, skippedCount: 0, detectedColumns: [] };
    }
    const sheet = workbook.Sheets[sheetName];
    rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
  } catch (e) {
    console.error('Error parsing sheet with XLSX:', e);
    return { customers: [], totalRows: 0, parsedCount: 0, skippedCount: 0, detectedColumns: [] };
  }

  if (!rawRows || rawRows.length === 0) {
    return { customers: [], totalRows: 0, parsedCount: 0, skippedCount: 0, detectedColumns: [] };
  }

  const detectedColumns = Object.keys(rawRows[0] || {});
  const customers: CustomerMasterItem[] = [];
  let skippedCount = 0;

  rawRows.forEach((row, idx) => {
    const getVal = (...targetKeys: string[]) => {
      for (const k of Object.keys(row)) {
        const cleanKey = k.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
        for (const pk of targetKeys) {
          const cleanTarget = pk.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
          if (cleanKey === cleanTarget || cleanKey.includes(cleanTarget)) {
            const rawVal = row[k];
            if (rawVal !== undefined && rawVal !== null) {
              return String(rawVal).trim();
            }
          }
        }
      }
      return '';
    };

    let idpelVal = getVal('IDPEL', 'IDPELANGGAN', 'NOIDPEL', 'NOMORPELANGGAN', 'ID');
    if (idpelVal) {
      idpelVal = idpelVal.replace(/^['"]|['"]$/g, '').trim();
    }

    if (!idpelVal || idpelVal.length < 3) {
      skippedCount++;
      return;
    }

    const nama = getVal('NAMA', 'NAMAPELANGGAN', 'NAMAKONSUMEN', 'PELANGGAN', 'CONSUMERNAME') || 'Pelanggan PLN';
    const alamat = getVal('ALAMAT', 'ALAMATPELANGGAN', 'ALAMATKONSUMEN', 'ADDRESS', 'LOKASI') || 'Alamat Terdaftar';
    const tarif = getVal('TARIF', 'GOLTARIF', 'KODETARIF') || 'R1M';
    const daya = getVal('DAYA', 'DAYAVA', 'KAPASITAS', 'VA') || '900 VA';
    const gardu = getVal('GARDU', 'GARDUDISTRIBUSI', 'KODEGARDU') || '-';
    const titikTumpu = getVal('TITIKTUMPU', 'TITIK', 'TIANG', 'NOTIANG') || '-';
    const merkMeter = getVal('MERKMETER', 'MERK', 'MERKKWH') || '-';
    const nomorMeter = getVal('NOMORMETER', 'NOMETER', 'SERIALMETER') || '-';

    customers.push({
      id: `CUST-EXCEL-${Date.now()}-${idx + 1}`,
      idpel: idpelVal,
      nama,
      alamat,
      tarif,
      daya,
      gardu,
      titikTumpu,
      merkMeter,
      nomorMeter,
    });
  });

  return {
    customers,
    totalRows: rawRows.length,
    parsedCount: customers.length,
    skippedCount,
    detectedColumns,
  };
}
