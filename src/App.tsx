
import React, { useEffect, useMemo, useRef, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Trash2, Download, Upload, PlusCircle, Save, RefreshCcw } from "lucide-react";
const LS_KEY = "heat-meters-v1";
const R_COUNT = 7 as const;
const NAMES: Readonly<string[]> = ["CUCINA","BAGNO","SOGGIORNO","CAMERETTA","STUDIO","BAGNO 2","CAMERA DA LETTO"];
function formatMonthLabel(ym: string) {
  try { const [y, m] = ym.split("-").map(Number); return new Date(y, m - 1, 1).toLocaleDateString("it-IT", { month: "short", year: "numeric" }); } catch { return ym; }
}
function download(filename: string, text: string) {
  const element = document.createElement("a");
  const file = new Blob([text], { type: "text/csv;charset=utf-8" });
  element.href = URL.createObjectURL(file); element.download = filename;
  document.body.appendChild(element); element.click(); document.body.removeChild(element);
}
function parseCSV(text: string) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [] as Array<{ month: string; readings: number[]; note: string; id: string }>;
  const header = lines[0].split(",").map((h) => h.trim());
  const idx = { date: header.indexOf("date"), note: header.indexOf("note") };
  const rIdx = Array.from({ length: R_COUNT }, (_, i) => header.indexOf(`R${i + 1}`));
  const rows: Array<{ month: string; readings: number[]; note: string; id: string }> = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]; if (line.startsWith('#')) continue;
    const cols = line.split(","); if (!cols.length) continue;
    const month = cols[idx.date]?.trim(); if (!/^[0-9]{4}-[0-9]{2}$/.test(month)) continue;
    const readings = rIdx.map((p) => { const v = parseFloat((cols[p] ?? "").replace(",", ".")); return Number.isFinite(v) ? v : 0; });
    const note = idx.note >= 0 ? (cols[idx.note] ?? "").trim() : "";
    rows.push({ month, readings, note, id: month });
  }
  return rows;
}
function runSelfTests() {
  const errors: string[] = [];
  if (NAMES.length !== R_COUNT) errors.push(`NAMES length (${NAMES.length}) !== R_COUNT (${R_COUNT})`);
  const sample = ["# CUCINA,BAGNO,SOGGIORNO,CAMERETTA,STUDIO,BAGNO 2,CAMERA DA LETTO","date,R1,R2,R3,R4,R5,R6,R7,note","2025-01,1,2,3,4,5,6,7,ok","2025-02,2,3,4,5,6,7,8,ok2"].join("\n");
  const parsed = parseCSV(sample); if (!(parsed.length === 2 && parsed[0].month === "2025-01" && parsed[1].readings[6] === 8)) { errors.push("parseCSV basic test failed"); }
  if (errors.length) console.warn("[SelfTests]", errors);
}
runSelfTests();
export default function App() {
  const [rows, setRows] = useState<{ id: string; month: string; readings: number[]; note?: string }[]>(() => {
    try { const raw = localStorage.getItem(LS_KEY); if (raw) return JSON.parse(raw); } catch {}
    return [];
  });
  const [month, setMonth] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; });
  const [note, setNote] = useState("");
  const [readings, setReadings] = useState<string[]>(Array.from({ length: R_COUNT }, () => ""));
  const [selectedLines, setSelectedLines] = useState<Record<string, boolean>>({ total: true });
  const fileRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => { localStorage.setItem(LS_KEY, JSON.stringify(rows)); }, [rows]);
  const sortedRows = useMemo(() => [...rows].sort((a, b) => a.month.localeCompare(b.month)), [rows]);
  const withDiffs = useMemo(() => {
    const out = sortedRows.map((r, idx) => {
      const prev = idx > 0 ? sortedRows[idx - 1] : null;
      const diffs = r.readings.map((v, i) => { const p = prev ? prev.readings[i] : 0; const d = v - p; return Number.isFinite(d) ? Math.max(0, d) : 0; });
      const total = diffs.reduce((a, b) => a + b, 0); return { ...r, diffs, total } as typeof r & { diffs: number[]; total: number };
    }); return out;
  }, [sortedRows]);
  const totalsByMeter = useMemo(() => { const acc = Array.from({ length: R_COUNT }, () => 0); withDiffs.forEach((r) => r.diffs.forEach((d, i) => (acc[i] += d))); return acc; }, [withDiffs]);
  const chartData = useMemo(() => { return withDiffs.map((r) => { const obj: Record<string, number | string> = { name: formatMonthLabel(r.month), total: Number(r.total.toFixed(3)) }; r.diffs.forEach((d, i) => (obj[`R${i + 1}`] = Number(d.toFixed(3)))); return obj; }); }, [withDiffs]);
  function clearForm() { setReadings(Array.from({ length: R_COUNT }, () => "")); setNote(""); }
  function addOrUpdateRow() {
    if (!/^[0-9]{4}-[0-9]{2}$/.test(month)) { alert("Inserisci un mese valido (YYYY-MM)"); return; }
    const vals = readings.map((v) => { const n = parseFloat(String(v).replace(",", ".")); return Number.isFinite(n) ? n : 0; });
    const prev = [...rows].find((r) => r.month < month)?.readings ?? null;
    if (prev) { for (let i = 0; i < R_COUNT; i++) { if (vals[i] < prev[i]) { const ok = confirm(`Attenzione: ${NAMES[i]} è inferiore al mese precedente. Vuoi comunque salvare?`); if (!ok) return; break; } } }
    setRows((old) => { const existing = old.findIndex((r) => r.month === month); const row = { id: month, month, readings: vals, note }; if (existing >= 0) { const copy = [...old]; copy[existing] = row; return copy; } return [...old, row]; });
    clearForm();
  }
  function removeRow(m: string) { const ok = confirm("Eliminare il mese " + m + "?"); if (!ok) return; setRows((old) => old.filter((r) => r.month !== m)); }
  function exportCSV() {
    const header = ["date", ...Array.from({ length: R_COUNT }, (_, i) => `R${i + 1}`), "note"];
    const comment = `# ${NAMES.join(",")}`;
    const lines = [comment, header.join(",")];
    sortedRows.forEach((r) => { const row = [r.month, ...r.readings.map((v) => String(v).replace(".", ",")), r.note ?? ""]; lines.push(row.join(",")); });
    download(`letture-termosifoni.csv`, lines.join("\n"));
  }
  function importCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { const text = String(reader.result); const parsed = parseCSV(text); if (!parsed.length) { alert("CSV non valido o vuoto."); return; }
      setRows((old) => { const map = new Map(old.map((r) => [r.month, r] as const)); parsed.forEach((r) => map.set(r.month, r)); return Array.from(map.values()); });
    };
    reader.readAsText(file, "utf-8"); e.target.value = "";
  }
  function resetAll() { const ok = confirm("Azzerare tutti i dati? Questa azione non è reversibile."); if (!ok) return; setRows([]); localStorage.removeItem(LS_KEY); }
  function toggleLine(key: string) { setSelectedLines((old) => ({ ...old, [key]: !old[key] })); }
  useEffect(() => { if (Object.keys(selectedLines).length === 1) { const init: Record<string, boolean> = { total: true }; for (let i = 1; i <= R_COUNT; i++) init[`R${i}`] = false; setSelectedLines(init); } }, []);
  return (<div className="min-h-screen w-full bg-slate-50 text-slate-800"><div className="max-w-6xl mx-auto p-6 space-y-6">
    <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
      <div><h1 className="text-2xl md:text-3xl font-bold">Letture termosifoni</h1><p className="text-sm text-slate-600">Gestisci le letture mensili dei 7 contabilizzatori di casa</p></div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={exportCSV} className="gap-2"><Download size={16}/>Esporta CSV</Button>
        <Button variant="secondary" className="gap-2" onClick={() => fileRef.current?.click()}><Upload size={16}/>Importa CSV</Button>
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={importCSV}/>
        <Button variant="destructive" className="gap-2" onClick={resetAll}><RefreshCcw size={16}/>Reset dati</Button>
      </div>
    </header>
    <Card className="shadow-md"><CardHeader><CardTitle className="text-lg">Aggiungi/Modifica mese</CardTitle></CardHeader>
    <CardContent className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
        <div className="col-span-1"><label className="text-sm font-medium">Mese</label><Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></div>
        <div className="md:col-span-3 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {Array.from({ length: R_COUNT }, (_, i) => (<div key={i}><label className="text-sm font-medium">{NAMES[i]}</label>
            <Input inputMode="decimal" placeholder="0" value={readings[i]} onChange={(e) => { const v = e.target.value; setReadings((old) => { const c = [...old]; c[i] = v; return c; }); }}/></div>))}
        </div>
      </div>
      <div><label className="text-sm font-medium">Note (opzionale)</label><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="es. sostituzione valvola, stima, ecc." /></div>
      <div className="flex gap-2"><Button onClick={addOrUpdateRow} className="gap-2"><Save size={16}/>Salva</Button><Button variant="secondary" onClick={clearForm} className="gap-2"><PlusCircle size={16}/>Nuovo</Button></div>
    </CardContent></Card>
    <Card className="shadow-md"><CardHeader><CardTitle className="text-lg">Storico letture</CardTitle></CardHeader><CardContent>
      {withDiffs.length === 0 ? (<p className="text-slate-600 text-sm">Nessun dato. Aggiungi il primo mese qui sopra.</p>) : (
      <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="text-left border-b">
        <th className="py-2 pr-4">Mese</th>
        {Array.from({ length: R_COUNT }, (_, i) => (<th key={i} className="py-2 pr-4">{NAMES[i]}</th>))}
        {Array.from({ length: R_COUNT }, (_, i) => (<th key={i+100} className="py-2 pr-4">Δ{NAMES[i]}</th>))}
        <th className="py-2 pr-4">Totale</th><th className="py-2 pr-4">Note</th><th className="py-2">Azioni</th></tr></thead>
        <tbody>{withDiffs.map((r) => (<tr key={r.id} className="border-b hover:bg-slate-50">
          <td className="py-2 pr-4 whitespace-nowrap">{formatMonthLabel(r.month)}</td>
          {r.readings.map((v, i) => (<td key={i} className="py-2 pr-4 tabular-nums">{v.toLocaleString("it-IT", { maximumFractionDigits: 3 })}</td>))}
          {r.diffs.map((v, i) => (<td key={i+100} className="py-2 pr-4 tabular-nums">{v.toLocaleString("it-IT", { maximumFractionDigits: 3 })}</td>))}
          <td className="py-2 pr-4 font-medium tabular-nums">{r.total.toLocaleString("it-IT", { maximumFractionDigits: 3 })}</td>
          <td className="py-2 pr-4 max-w-[18ch] truncate" title={r.note || ""}>{r.note}</td>
          <td className="py-2"><Button variant="ghost" onClick={() => removeRow(r.month)} title="Elimina" className="px-2 py-1 border border-transparent hover:border-slate-300 rounded-xl"><Trash2 size={16} /></Button></td>
        </tr>))}</tbody></table></div>)}
      {withDiffs.length > 0 && (<div className="mt-4 text-sm text-slate-600">
        <p><strong>Consumo totale finora:</strong> {withDiffs.reduce((a, r) => a + r.total, 0).toLocaleString("it-IT", { maximumFractionDigits: 3 })}</p>
        <p className="mt-1"><strong>Ripartizione per radiatore:</strong>{" "}{totalsByMeter.map((v, i) => (<span key={i} className="mr-3">{NAMES[i]}: {v.toLocaleString("it-IT", { maximumFractionDigits: 3 })}</span>))}</p>
      </div>)}
    </CardContent></Card>
    <Card className="shadow-md"><CardHeader><CardTitle className="text-lg">Grafico consumi mensili</CardTitle></CardHeader><CardContent>
      {withDiffs.length === 0 ? (<p className="text-slate-600 text-sm">Aggiungi almeno un mese per vedere il grafico.</p>) : (
      <div className="space-y-3"><div className="flex flex-wrap gap-2">
        <TogglePill active={!!selectedLines.total} onClick={() => toggleLine("total")}>Totale</TogglePill>
        {Array.from({ length: R_COUNT }, (_, i) => (<TogglePill key={i} active={!!selectedLines[`R${i + 1}`]} onClick={() => toggleLine(`R${i + 1}`)}>{NAMES[i]}</TogglePill>))}
      </div>
      <div className="w-full h-72"><ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Legend />
          {selectedLines.total && <Line type="monotone" dataKey="total" name="Totale" dot={false} />}
          {Array.from({ length: R_COUNT }, (_, i) => (selectedLines[`R${i + 1}`] ? (<Line key={i} type="monotone" dataKey={`R${i + 1}`} name={NAMES[i]} dot={false} />) : null))}
        </LineChart></ResponsiveContainer></div></div>)}
    </CardContent></Card>
    <footer className="text-xs text-slate-500 py-6"><p>I valori inseriti sono <em>cumulativi</em>. Il consumo mensile è la differenza col mese precedente.</p></footer>
  </div></div>);
}
function TogglePill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (<button onClick={onClick} className={`px-3 py-1 rounded-2xl border text-sm transition ${active ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"}`}>{children}</button>);
}
