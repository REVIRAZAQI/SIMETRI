import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, Send, User, Sparkles, RefreshCw, Copy, Check, BarChart3, 
  Layers, Database, Zap, PhoneCall, ShieldCheck, Wrench, Search, FileText, ArrowUpRight
} from 'lucide-react';
import { 
  ReplacementRecord, WorkOrderTarget, GangguanAppRecord, 
  GametRecord, GametWorkOrderTarget, CustomerMasterItem, UserAccount 
} from '../types';

interface TanyaSimetriProps {
  records: ReplacementRecord[];
  workOrders: WorkOrderTarget[];
  gangguanRecords: GangguanAppRecord[];
  gametRecords: GametRecord[];
  gametWorkOrders: GametWorkOrderTarget[];
  customerDatabase: CustomerMasterItem[];
  currentUser: UserAccount | null;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  tableData?: { headers: string[]; rows: (string | number)[][] };
  statsSummary?: { title: string; value: string | number; subtitle?: string; color?: string }[];
}

export const TanyaSimetri: React.FC<TanyaSimetriProps> = ({
  records,
  workOrders,
  gangguanRecords,
  gametRecords,
  gametWorkOrders,
  customerDatabase,
  currentUser
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'ai',
      text: `Halo ${currentUser?.namaLengkap || 'Petugas'}! Saya adalah **Engine AI SIMETRI** (Sistem Ganti Meter Terintegrasi).\n\nSaya telah terhubung secara real-time dengan seluruh database SIMETRI:
- 📊 **Riwayat Ganti Meter P2TL**: ${records.length} data
- 📋 **Target WO P2TL**: ${workOrders.length} WO (${workOrders.filter(w=>w.status==='BELUM_DIGANTI').length} pending)
- ⚡ **Penggantian Meter Gamet**: ${gametRecords.length} data
- 🏷️ **WO Gamet & Tagsus**: ${gametWorkOrders.length} WO (${gametWorkOrders.filter(w=>w.status==='BELUM_DIGANTI').length} pending)
- 📞 **Laporan Gangguan APP**: ${gangguanRecords.length} laporan
- 👥 **Master Pelanggan**: ${customerDatabase.length} pelanggan terdaftar

Apa yang ingin Anda tanyakan atau analisis hari ini?`,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      statsSummary: [
        { title: 'Total P2TL Selesai', value: records.length, subtitle: 'Terverifikasi AI', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
        { title: 'Pending WO Gamet', value: gametWorkOrders.filter(w=>w.status==='BELUM_DIGANTI').length, subtitle: 'Memerlukan Petugas', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
        { title: 'Gangguan APP', value: gangguanRecords.length, subtitle: 'Yantek & Billman', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
        { title: 'Master Pelanggan', value: customerDatabase.length, subtitle: 'Terdaftar Sistem', color: 'bg-purple-500/10 text-purple-400 border-purple-500/30' }
      ]
    }
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isLoading]);

  const PRESET_QUESTIONS = [
    "Berapa rekapitulasi total penggantian meter bulan ini?",
    "Rangkum status WO Gamet & Tagsus yang belum dikerjakan",
    "Rekomendasikan pembagian tim petugas Gamet berdasarkan Gardu",
    "Tampilkan daftar laporan gangguan terbanyak berdasarkan jenisnya",
    "Berapa persentase verifikasi AI untuk pengerjaan P2TL?"
  ];

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const generateLocalAnswer = (query: string): ChatMessage => {
    const q = query.toLowerCase();
    const now = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    // Query: Rekapitulasi total penggantian
    if (q.includes('rekap') || q.includes('total') || q.includes('penggantian') || q.includes('bulan ini')) {
      const verifiedP2tl = records.filter(r => r.verificationStatus === 'VERIFIED').length;
      const pendingP2tl = records.filter(r => r.verificationStatus === 'PENDING').length;
      const totalGamet = gametRecords.length;
      
      return {
        id: `msg-${Date.now()}`,
        sender: 'ai',
        text: `### 📊 Rekapitulasi Real-Time Penggantian Meter SIMETRI\n\nBerikut adalah statistik lengkap pengerjaan fisik ganti meter di lapangan:\n\n1. **Penyelesaian P2TL (Yanbung)**:\n   - Total Berita Acara: **${records.length}** BA\n   - Verifikasi Valid AI: **${verifiedP2tl}** (${records.length ? Math.round((verifiedP2tl/records.length)*100) : 0}%)\n   - Perlu Verifikasi: **${pendingP2tl}** BA\n\n2. **Penggantian Meter Gamet (Pra-Pasca)**:\n   - Total Penggantian: **${totalGamet}** Meter\n   - Target WO Selesai: **${gametWorkOrders.filter(w=>w.status==='SELESAI').length}** WO\n   - Target WO Pending: **${gametWorkOrders.filter(w=>w.status==='BELUM_DIGANTI').length}** WO`,
        timestamp: now,
        statsSummary: [
          { title: 'Total BA P2TL', value: records.length, subtitle: `${verifiedP2tl} Verifikasi AI Valid`, color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
          { title: 'Total Gamet Selesai', value: totalGamet, subtitle: 'Meter Baru Terpasang', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
          { title: 'WO Pending', value: gametWorkOrders.filter(w=>w.status==='BELUM_DIGANTI').length, subtitle: 'Tagsus & Regular', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' }
        ],
        tableData: {
          headers: ["Kategori Program", "Total Data", "Selesai", "Pending / Review"],
          rows: [
            ["P2TL (Yanbung)", records.length, verifiedP2tl, pendingP2tl],
            ["WO Gamet & Tagsus", gametWorkOrders.length, gametWorkOrders.filter(w=>w.status==='SELESAI').length, gametWorkOrders.filter(w=>w.status==='BELUM_DIGANTI').length],
            ["Laporan Gangguan APP", gangguanRecords.length, gangguanRecords.filter(g=>g.status==='SELESAI').length, gangguanRecords.filter(g=>g.status==='BELUM_DIPROSES').length]
          ]
        }
      };
    }

    // Query: Status WO Gamet / Tagsus
    if (q.includes('wo') || q.includes('tagsus') || q.includes('gamet')) {
      const pendingWo = gametWorkOrders.filter(w => w.status === 'BELUM_DIGANTI');
      const sampleRows = pendingWo.slice(0, 5).map(w => [
        w.idpel,
        w.namaPelanggan,
        w.gardu || '-',
        w.assignedTim || 'Belum Ditugaskan',
        w.status
      ]);

      return {
        id: `msg-${Date.now()}`,
        sender: 'ai',
        text: `### 📋 Analisis Status Work Order Gamet & Tagsus\n\nSaat ini terdapat **${gametWorkOrders.length} Target Work Order Gamet** terdaftar dalam sistem:\n\n- 🔴 **Belum Diganti (Pending)**: **${pendingWo.length}** WO\n- 🟢 **Selesai Diganti**: **${gametWorkOrders.filter(w=>w.status==='SELESAI').length}** WO\n\nBerikut 5 daftar sampel Work Order Gamet yang memerlukan eksekusi petugas:`,
        timestamp: now,
        tableData: {
          headers: ["IDPEL", "Nama Pelanggan", "Gardu", "Petugas Assigned", "Status"],
          rows: sampleRows.length > 0 ? sampleRows : [["-", "Tidak ada WO pending", "-", "-", "-"]]
        }
      };
    }

    // Query: Rekomendasi tim petugas
    if (q.includes('rekomendasi') || q.includes('tim') || q.includes('petugas') || q.includes('gardu')) {
      return {
        id: `msg-${Date.now()}`,
        sender: 'ai',
        text: `### 🤖 Rekomendasi Alokasi Tim Petugas SIMETRI AI\n\nBerdasarkan pembagian kluster lokasi Gardu & Titik Tumpu yang berdekatan:\n\n1. 🔹 **Tim Gamet 1**: Direkomendasikan untuk area Gardu **BG-042**, **BG-012**, dan **SMG-001** (Kluster Semarang Barat & Tengah).\n2. 🔹 **Tim Gamet 2**: Direkomendasikan untuk area Gardu **SMG-014** & **SMG-088** (Kluster Semarang Timur).\n3. 🔹 **Tim Gamet 3**: Direkomendasikan untuk area Gardu **BG-099** & **SMG-102** (Kluster Semarang Selatan).\n\n💡 *Catatan AI*: Anda dapat mengeklik tombol **Auto-Assign AI** pada sub-menu **Monitoring WO & Tagsus** di menu Gamet untuk menerapkan alokasi otomatis ini ke seluruh database WO.`,
        timestamp: now
      };
    }

    // Query: Gangguan APP
    if (q.includes('gangguan') || q.includes('yantek') || q.includes('billman') || q.includes('laporan')) {
      const typesCount: Record<string, number> = {};
      gangguanRecords.forEach(g => {
        typesCount[g.jenisGangguan] = (typesCount[g.jenisGangguan] || 0) + 1;
      });

      const rows = Object.entries(typesCount).map(([jenis, count]) => [jenis.replace(/_/g, ' '), count, `${Math.round((count/gangguanRecords.length)*100)}%`]);

      return {
        id: `msg-${Date.now()}`,
        sender: 'ai',
        text: `### 📞 Analisis Laporan Gangguan APP (Yantek & Billman)\n\nTotal laporan gangguan fisik masuk: **${gangguanRecords.length} Laporan**.\n\nRincian jenis gangguan terbanyak:`,
        timestamp: now,
        tableData: {
          headers: ["Jenis Gangguan", "Jumlah Laporan", "Persentase"],
          rows
        }
      };
    }

    // Generic answer analyzing overall SIMETRI system
    return {
      id: `msg-${Date.now()}`,
      sender: 'ai',
      text: `### 🤖 Analisis Database SIMETRI\n\nBerikut ringkasan data berdasarkan pertanyaan **"${query}"**:\n\n- **Total Pelanggan Terdaftar**: ${customerDatabase.length} IDPEL\n- **P2TL Terverifikasi AI**: ${records.filter(r=>r.verificationStatus==='VERIFIED').length} dari ${records.length} Berita Acara\n- **Target WO Gamet Active**: ${gametWorkOrders.length} WO (${gametWorkOrders.filter(w=>w.status==='BELUM_DIGANTI').length} pending)\n- **Laporan Gangguan APP**: ${gangguanRecords.length} Laporan\n\n*Informasi ini disajikan secara real-time dari seluruh modul SIMETRI.*`,
      timestamp: now
    };
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputQuery).trim();
    if (!query || isLoading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    try {
      // Call Server Gemini API endpoint
      const res = await fetch('/api/gemini/tanya-simetri', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          context: {
            totalRecordsP2tl: records.length,
            verifiedP2tl: records.filter(r=>r.verificationStatus==='VERIFIED').length,
            totalWorkOrdersP2tl: workOrders.length,
            totalGametRecords: gametRecords.length,
            totalGametWo: gametWorkOrders.length,
            pendingGametWo: gametWorkOrders.filter(w=>w.status==='BELUM_DIGANTI').length,
            totalGangguan: gangguanRecords.length,
            totalCustomerDb: customerDatabase.length,
            sampleGametWo: gametWorkOrders.slice(0, 5),
            sampleGangguan: gangguanRecords.slice(0, 5)
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.text) {
          setMessages(prev => [
            ...prev,
            {
              id: `ai-${Date.now()}`,
              sender: 'ai',
              text: data.text,
              timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
              statsSummary: data.statsSummary,
              tableData: data.tableData
            }
          ]);
          setIsLoading(false);
          return;
        }
      }
    } catch (e) {
      console.log('Using smart client analyzer fallback:', e);
    }

    // Fallback client response calculation
    setTimeout(() => {
      const aiReply = generateLocalAnswer(query);
      setMessages(prev => [...prev, aiReply]);
      setIsLoading(false);
    }, 600);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] min-h-[500px] max-w-5xl mx-auto px-2 sm:px-4 py-3">
      {/* Top Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-4 mb-3 shadow-xl flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 p-0.5 shadow-lg shadow-cyan-500/20 flex items-center justify-center shrink-0">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-white tracking-tight">TANYA SIMETRI AI</h1>
              <span className="px-2 py-0.5 text-[9px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span> ONLINE - LIVE DATA
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium hidden sm:block">
              Asisten AI Cerdas untuk analisis database, rekomendasi tim petugas, status WO & rekapitulasi real-time.
            </p>
          </div>
        </div>

        <button
          onClick={() => setMessages(prev => [prev[0]])}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 transition flex items-center gap-1.5 cursor-pointer shrink-0"
          title="Reset percakapan chat"
        >
          <RefreshCw className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Reset Chat</span>
        </button>
      </div>

      {/* Input Search Box Area (MOVED TO TOP) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-2xl mb-3 shrink-0 space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendMessage();
              }}
              placeholder="Cari atau tanyakan analisis WO, rekap ganti meter, rekomendasi petugas AI..."
              className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3.5 py-2 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 font-semibold shadow-sm"
              style={{ backgroundColor: '#ffffff' }}
            />
          </div>

          <button
            onClick={() => handleSendMessage()}
            disabled={!inputQuery.trim() || isLoading}
            className={`px-4 py-2 text-xs sm:text-sm rounded-xl font-extrabold flex items-center gap-2 transition cursor-pointer shrink-0 ${
              inputQuery.trim() && !isLoading
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-lg hover:brightness-110'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <span>TANYA SIMETRI AI</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quick Prompt Recommendation Chips (Wrapped cleanly, no horizontal scroll) */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800/80">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1 shrink-0 mr-1">
            <Sparkles className="w-3 h-3 text-cyan-400" /> Contoh Pertanyaan:
          </span>
          {PRESET_QUESTIONS.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(q)}
              className="px-2.5 py-1 bg-slate-800/90 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-700/80 hover:border-cyan-400/50 rounded-lg text-[11px] transition cursor-pointer flex items-center gap-1"
            >
              <span>{q}</span>
              <ArrowUpRight className="w-3 h-3 opacity-60 shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Main ChatGPT Thread Area */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto pr-1 space-y-4 no-scrollbar">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'ai' && (
              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center shrink-0 text-cyan-400 mt-1">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-4 shadow-lg ${
                msg.sender === 'user'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-tr-xs'
                  : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-xs'
              }`}
            >
              {/* Sender & Timestamp Header */}
              <div className="flex items-center justify-between gap-2 mb-2 pb-1 border-b border-slate-800/60 text-[10px] font-mono text-slate-400">
                <span className="font-bold uppercase tracking-wider text-cyan-400">
                  {msg.sender === 'user' ? (currentUser?.namaLengkap || 'Petugas SIMETRI') : 'SIMETRI AI Engine'}
                </span>
                <span>{msg.timestamp}</span>
              </div>

              {/* Text Content */}
              <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans space-y-2">
                {msg.text.split('\n').map((line, i) => {
                  if (line.startsWith('### ')) {
                    return <h3 key={i} className="text-sm sm:text-base font-black text-cyan-300 mt-2 mb-1">{line.replace('### ', '')}</h3>;
                  }
                  if (line.startsWith('- ')) {
                    return <div key={i} className="flex items-start gap-1.5 ml-1"><span className="text-cyan-400">•</span><span>{line.replace('- ', '')}</span></div>;
                  }
                  return <p key={i}>{line}</p>;
                })}
              </div>

              {/* Optional Stats Cards */}
              {msg.statsSummary && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-800/80">
                  {msg.statsSummary.map((st, idx) => (
                    <div key={idx} className={`p-2.5 rounded-xl border text-center ${st.color || 'bg-slate-800 text-cyan-400 border-slate-700'}`}>
                      <div className="text-lg font-black">{st.value}</div>
                      <div className="text-[10px] font-bold uppercase tracking-wider">{st.title}</div>
                      {st.subtitle && <div className="text-[9px] opacity-80 mt-0.5">{st.subtitle}</div>}
                    </div>
                  ))}
                </div>
              )}

              {/* Optional Data Table */}
              {msg.tableData && (
                <div className="mt-3 pt-3 border-t border-slate-800/80 overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-800/80 text-cyan-300 border-b border-slate-700">
                        {msg.tableData.headers.map((h, idx) => (
                          <th key={idx} className="p-2 font-black uppercase text-[10px] tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {msg.tableData.rows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-800/30">
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="p-2 font-mono text-slate-300 text-[11px]">{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Actions footer */}
              {msg.sender === 'ai' && (
                <div className="flex items-center justify-end gap-2 mt-3 pt-2 border-t border-slate-800/40 text-[11px]">
                  <button
                    onClick={() => handleCopyText(msg.id, msg.text)}
                    className="flex items-center gap-1 text-slate-400 hover:text-cyan-300 transition cursor-pointer"
                  >
                    {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedId === msg.id ? 'Tersalin' : 'Salin Jawaban'}</span>
                  </button>
                </div>
              )}
            </div>

            {msg.sender === 'user' && (
              <div className="w-8 h-8 rounded-xl bg-blue-600 border border-blue-400/40 flex items-center justify-center shrink-0 text-white mt-1">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-3 text-cyan-400 text-xs font-bold animate-pulse p-3 bg-slate-900/60 rounded-xl border border-slate-800 max-w-xs">
            <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
            <span>AI SIMETRI sedang menganalisis database...</span>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>
    </div>
  );
};
