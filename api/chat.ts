import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { 
      messages, categories, assets, transactions, contacts, 
      recurringTransactions, subscriptions, budgetMode, monthlyIncome,
      currentDate, currentTime 
    } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ message: 'Valid messages array is required' });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ message: 'OPENAI_API_KEY is not configured on the server.' });
    }

    const categoryList = categories?.length > 0 
      ? categories.map((c: any) => {
          const subs = c.subcategories?.length > 0 
            ? c.subcategories.map((s: any) => s.name).join(', ') 
            : 'none';
          return `${c.name} (${c.type}) [sub: ${subs}]`;
        }).join('; ') 
      : "None";
    
    const assetList = assets?.length > 0 
      ? assets.map((a: any) => `- ID: "${a.id}", Name: "${a.name}", Type: "${a.type}", Balance: ${a.balance}`).join('\n') 
      : "None";

    const contactList = contacts?.length > 0
      ? contacts.map((c: any) => `- Name: "${c.name}"`).join('\n')
      : "No existing contacts.";

    const transactionSummary = transactions?.length > 0
      ? transactions.map((t: any) => `${t.date}: ${t.type} ${t.amount} [${t.category}] ${t.note}`).join('\n')
      : "No recent transactions found.";
    
    const recurringSummary = recurringTransactions?.length > 0
      ? recurringTransactions.map((rt: any) => `- ${rt.type} ${rt.amount} [${rt.category}] ${rt.frequency} starts ${rt.startDate} (${rt.note})`).join('\n')
      : "None";

    const subscriptionSummary = subscriptions?.length > 0
      ? subscriptions.map((s: any) => `- ${s.name}: ${s.amount}/${s.billingCycle} next: ${s.nextBillingDate}`).join('\n')
      : "None";

    const systemPrompt = `You are MoneyBot, a helpful AI assistant for MoneyApp.
Your primary purpose is to help users manage their finances and categorize transactions.

CURRENT DATE & TIME: ${currentDate || "Unknown"} ${currentTime || ""}
Use this as the reference for "today", "yesterday", or other relative dates.

STRICT GUARDRAILS:
1. ONLY answer questions related to MoneyApp, personal finance, or budgeting. Decline all other topics.
2. If the user asks for help, tutorial, or how to use ANY feature, you MUST call 'get_app_help' to get the user manual.
3. You can ONLY process and create ONE transaction/debt at a time. If the user provides multiple transactions (e.g. "makan 10rb dan bensin 20rb"), do NOT call 'create_transaction' for all. Instead, pick the first one or ask for clarification, and inform the user that for multiple entries, they should use the "Input Sekaligus" (Bulk Input) feature found in the main (+) menu.

CURRENT USER CONTEXT:
Categories: ${categoryList}
Assets: ${assetList}
Contacts: ${contactList}
Budget Mode: ${budgetMode || "regular"} (Income: ${monthlyIncome || 0})

RECENT TRANSACTIONS (Last 150):
${transactionSummary}

RECURRING TRANSACTIONS:
${recurringSummary}

SUBSCRIPTIONS:
${subscriptionSummary}

BEHAVIOR RULES:
1. When a user describes a transaction (e.g., "makan kfc 10k"), First, recommend category and asset name and ask for confirmation.
2. ONLY call 'create_transaction' or 'create_debt' when the user explicitly agrees.
3. For help/tutorial requests, use 'get_app_help'.
4. For transfers between assets, use 'create_transaction' with 'type': 'transfer'.
5. For debts (hutang) or receivables (piutang), use 'create_debt'.
6. Do NOT try to handle multiple transactions in one turn. Direct them to "Input Sekaligus" for bulk entries.
7. Keep responses concise and in Indonesian.`;

    const tools = [
      {
        type: "function" as const,
        function: {
          name: "create_transaction",
          description: "Draft a transaction for the user to confirm.",
          parameters: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["pengeluaran", "pendapatan", "transfer"] },
              amount: { type: "number" },
              category: { type: "string" },
              subCategory: { type: "string" },
              assetId: { type: "string", description: "Used for 'pengeluaran' or 'pendapatan'" },
              fromAssetId: { type: "string", description: "Source asset for 'transfer'" },
              toAssetId: { type: "string", description: "Destination asset for 'transfer'" },
              note: { type: "string" },
              date: { type: "string", description: "YYYY-MM-DD" },
              adminFee: { type: "number" },
              adminFeeTarget: { type: "string", enum: ["sender", "receiver"] }
            },
            required: ["type", "amount", "category", "note", "date"]
          }
        }
      },
      {
        type: "function" as const,
        function: {
          name: "create_debt",
          description: "Draft a debt (hutang) or receivable (piutang) record for the user.",
          parameters: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["hutang", "piutang"] },
              contactName: { type: "string" },
              amount: { type: "number" },
              description: { type: "string" },
              date: { type: "string", description: "YYYY-MM-DD" },
              category: { type: "string" },
              subCategory: { type: "string" },
              assetId: { type: "string", description: "For hutang: liability asset or receiving asset. For piutang: asset used to lend money." },
              isInstallment: { type: "boolean" },
              totalInstallments: { type: "number" }
            },
            required: ["type", "contactName", "amount", "date"]
          }
        }
      },
      {
        type: "function" as const,
        function: {
          name: "get_app_help",
          description: "Retrieve the comprehensive user manual and tutorial for all app features.",
          parameters: { type: "object", properties: {} }
        }
      }
    ];

    const apiMessages = [
      { role: "system", content: systemPrompt },
      ...messages
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: apiMessages,
      tools: tools as any,
      tool_choice: "auto",
    });

    const choice = response.choices[0];
    const message = choice.message;

    const APP_TUTORIAL = `
1. Transaksi (Transactions):
   - Cara Tambah: Klik tombol '+' di pojok kanan bawah, pilih 'Tambah Pengeluaran' atau 'Pendapatan'.
   - Transfer: Gunakan menu 'Transfer' untuk memindahkan uang antar rekening.
   - Input Sekaligus: Mendukung banyak transaksi sekaligus. Kini bisa memilih rekening berbeda untuk tiap baris transaksi (Multi-Asset support).
   - Edit/Hapus: Klik pada item transaksi di daftar.
   - Copy: Di menu edit transaksi, klik tombol 'Copy'.
   - Pencarian: Gunakan ikon kaca pembesar di atas daftar transaksi.
   - Auto-Collapse: Daftar hanya membuka hari ini. Klik baris tanggal untuk melihat riwayat lainnya.

2. Aset & Kekayaan (Assets):
   - Kelola Aset: Tambah akun bank/cash di menu Aset.
   - Gacha Tier System: Total kekayaanmu menentukan tingkat 'Gacha' (Bronze -> Sultan 👑). 
   - Pesan Motivasi: Setiap tier punya pesan motivasi berbeda.

3. Hutang & Piutang (Debts):
   - Bayar/Cicil: Klik pada catatan hutang untuk membayar sebagian atau lunas.
   - Offset (Potong Silang): Gunakan banner di atas halaman Hutang untuk potong saldo hutang vs piutang ke orang yang sama.
   - Tips Profesional: Kosongkan "Aset" saat buat hutang agar pembayaran nanti tercatat sebagai Pengeluaran (Expense). Jika pilih aset, pembayaran akan tercatat sebagai Transfer.
   - Merge Otomatis: Hutang ke kontak yang sama otomatis digabung jika belum lunas.

4. MoneyBot AI:
   - Chatbot canggih yang bisa diajak diskusi keuangan.
   - Kini bisa mencatat Transfer antar rekening dan membuat catatan Hutang/Piutang otomatis.
   - Cukup ketik seperti: "Transfer dari BCA ke Gopay 50rb" atau "Hutang ke Budi 100rb buat makan".

5. Anggaran & Perencanaan (Budgets):
   - Regular Mode: Set budget bulanan per kategori di Pengaturan -> Anggaran.
   - Zero-Based Budgeting (Anggaran Berbasis Nol): Aktifkan di Pengaturan. Alokasikan setiap rupiah pendapatan ke "amplop" (kategori) hingga sisa Rp 0.
   - Pace Feature: Memberi tahu jika kecepatan belanjamu terlalu tinggi dibandingkan hari yang sudah berlalu dalam bulan tersebut.
   - Pindahkan Uang: Dalam mode Zero-Based, kamu bisa memindahkan saldo antar amplop jika salah satu kategori over-budget.

6. Proyeksi Kas (Cash Flow Forecast):
   - Tersedia di menu Statistik -> Proyeksi Kas.
   - Memprediksi saldo harian 30, 60, hingga 90 hari ke depan berdasarkan transaksi rutin dan langganan.
   - Safe to Spend: Menghitung uang yang aman dibelanjakan hari ini setelah menyisihkan dana untuk tagihan 30 hari ke depan.
   - Danger Zone: Menandai hari-hari di mana saldo diprediksi akan negatif (merah).

7. Langganan (Subscriptions): Kelola layanan bulanan/tahunan (Netflix, Spotify, dll) agar tidak lupa tanggal tagihan dan terekam di Proyeksi Kas.
8. Target Tabungan (Savings Goals): Buat target untuk impianmu dan hubungkan transaksi menabung agar progres terpantau otomatis.
9. Scan Struk (OCR) & Split Bill: Scan struk, lalu klik "Split Bill" untuk bagi belanjaan ke teman-teman (otomatis jadi piutang).
10. Pengaturan: PIN keamanan, Backup (Ekspor/Impor), Sinkronisasi Cloud, dan Custom Mata Uang/Tanggal mulai bulan.
11. Statistik: Analisis pie chart, perbandingan bulan lalu, dan Financial Health Score.
`;

    // Check if the AI decided to call the tool
    if (message.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls[0] as any;
      
      if (toolCall.type === 'function') {
        const functionName = toolCall.function.name;

        if (functionName === 'get_app_help') {
          return res.status(200).json({
            role: "assistant",
            content: `Tentu! Berikut adalah panduan singkat cara menggunakan fitur di MoneyApp:\n${APP_TUTORIAL}\n\nAda fitur spesifik yang ingin ditanyakan lebih lanjut?`
          });
        }

        if (functionName === 'create_transaction' || functionName === 'create_debt') {
          return res.status(200).json({
            role: "assistant",
            content: message.content || "Ini draft datanya, silakan dikonfirmasi ya!",
            toolCall: {
              name: functionName,
              arguments: JSON.parse(toolCall.function.arguments)
            }
          });
        }
      }
    }

    // Normal text response
    return res.status(200).json({
      role: "assistant",
      content: message.content
    });

  } catch (error: any) {
    console.error('Chat API Error:', error);
    return res.status(500).json({
      message: 'Chat Failed',
      error: error.message
    });
  }
}
