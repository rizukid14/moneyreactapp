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
    const { messages, categories, assets, transactions } = req.body;

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

    const transactionSummary = transactions?.length > 0
      ? transactions.map((t: any) => `${t.date}: ${t.type} ${t.amount} [${t.category}] ${t.note}`).join('\n')
      : "No recent transactions found.";

    const defaultAssetId = assets?.length > 0 ? assets[0].id : "";

    const APP_TUTORIAL = `
1. Transaksi (Transactions):
   - Cara Tambah: Klik tombol '+' di pojok kanan bawah, pilih 'Tambah Pengeluaran' atau 'Pendapatan'.
   - Transfer: Gunakan menu 'Transfer' untuk memindahkan uang antar rekening.
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

4. Anggaran (Budgets): Set di Pengaturan -> Anggaran & Target per kategori.
5. Scan Struk (OCR) & Split Bill: Scan struk, lalu klik "Split Bill" untuk bagi belanjaan ke teman-teman (otomatis jadi piutang).
6. Pengaturan: PIN keamanan, Backup (Ekspor/Impor), Sinkronisasi Cloud, dan Custom Mata Uang/Tanggal mulai bulan.
7. Statistik: Analisis pie chart dan perbandingan bulan lalu.
`;

    const systemPrompt = `You are MoneyBot, a helpful AI assistant for MoneyApp.
Your primary purpose is to help users manage their finances and categorize transactions.

STRICT GUARDRAILS:
1. ONLY answer questions related to MoneyApp, personal finance, or budgeting. Decline all other topics.
2. If the user asks for help, tutorial, or how to use ANY feature, you MUST call 'get_app_help' to get the user manual.

CURRENT USER CONTEXT:
Categories: ${categoryList}
Assets: ${assetList}

RECENT TRANSACTIONS (Last 150):
${transactionSummary}

BEHAVIOR RULES:
1. When a user describes a transaction (e.g., "makan kfc 10k"), First, recommend category and asset name and ask for confirmation.
2. ONLY call 'create_transaction' when the user explicitly agrees.
3. For help/tutorial requests, use 'get_app_help'.
4. Answer questions about spending summaries (e.g., "how much did I spend on food this month?") by analyzing the RECENT TRANSACTIONS provided.
5. If the user asks about account balances, use the Balance info in the Assets list.
6. If the user's question requires data beyond the provided 150 transactions, honestly state that you only have access to recent history.

Keep responses concise and in Indonesian.`;

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
              assetId: { type: "string" },
              note: { type: "string" },
              date: { type: "string" }
            },
            required: ["type", "amount", "category", "subCategory", "assetId", "note", "date"]
          }
        }
      },
      {
        type: "function" as const,
        function: {
          name: "get_app_help",
          description: "Retrieve the comprehensive user manual and tutorial for all app features. Call this when the user asks 'how to', 'help', or about specific features.",
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

        if (functionName === 'create_transaction') {
          return res.status(200).json({
            role: "assistant",
            content: message.content || "Ini draft transaksinya, silakan dikonfirmasi ya!",
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
