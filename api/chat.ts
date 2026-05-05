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
    const { messages, categories, assets } = req.body;

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
      ? assets.map((a: any) => `- ID: "${a.id}", Name: "${a.name}", Type: "${a.type}"`).join('\n') 
      : "None";

    const defaultAssetId = assets?.length > 0 ? assets[0].id : "";

    const systemPrompt = `You are MoneyBot, a helpful AI assistant built directly into the MoneyApp personal finance application.
Your primary purpose is to help users understand the app, manage their finances, and categorize transactions.

STRICT GUARDRAILS:
1. You MUST NOT answer questions unrelated to MoneyApp, personal finance, budgeting, or transaction categorization.
2. If asked about programming, general knowledge, history, politics, or any off-topic subject, politely decline, state that you are MoneyBot, and explain what you can help with.

APP FEATURES TUTORIAL CONTEXT:
- Transaksi (Transactions): Menu utama untuk mencatat pengeluaran, pendapatan, dan transfer. Tekan tombol '+' di pojok kanan bawah untuk membuka menu aksi cepat.
- Aset (Assets): Menu untuk melihat total saldo dari semua akun (Cash, Bank, eWallet, dsb). Kamu bisa menambah aset baru di sini.
- Hutang & Piutang (Debts): Menu untuk mencatat uang yang kamu pinjam (Hutang) atau uang yang dipinjam orang lain darimu (Piutang).
  - Offset (Potong Silang): Fitur canggih jika kamu punya hutang DAN piutang ke orang yang sama. Banner "Tersedia Potong Silang" akan muncul otomatis di atas halaman Hutang. Klik "Selesaikan" untuk mengurangi saldo keduanya sekaligus.
  - Cicilan: Kamu bisa mengaktifkan mode cicilan saat menambah hutang/piutang untuk melacak progress pembayaran bulanan.
- Statistik (Statistics): Menampilkan visualisasi pie chart dan kategori mana yang paling banyak menghabiskan uangmu.
- Scan (OCR): Menggunakan kamera untuk membaca struk belanja dan otomatis mengisi nominal serta item belanja.
- Bulk Input: Cara cepat mencatat banyak transaksi sekaligus dengan bantuan AI.
- Pengaturan: Ubah mata uang, tema gelap/terang, ekspor/impor data, dan setting PIN keamanan.

CURRENT USER CONTEXT:
Categories: ${categoryList}
Assets: ${assetList}

BEHAVIOR RULES FOR TRANSACTIONS:
1. When a user describes a transaction (e.g., "makan kfc 10k"), DO NOT call the 'create_transaction' tool immediately.
2. First, reply with a TEXT recommendation for the best category, subcategory, and asset NAME, and explicitly ask for confirmation. Example: "Menurut saya kategori yang cocok adalah Makanan > Jajan, aset Blu. Boleh saya buatkan?"
3. ONLY WHEN the user explicitly agrees (e.g., "yes", "boleh", "ok", "ya", "silakan"), THEN call 'create_transaction'.
4. CRITICAL: The tool call arguments MUST EXACTLY MATCH your earlier recommendation. If you recommended asset "Blu" in your text, you MUST use the ID for "Blu" in the tool call.
5. CRITICAL: If you recommended a subcategory (e.g. "Jajan") in your text, you MUST include it in the 'subCategory' field of the tool call. DO NOT leave it empty if you mentioned it.
6. For the asset, guess based on context. If unsure, recommend the first available asset (ID: "${defaultAssetId}") — but state that specific asset name in your text so the user knows what to expect.
7. Always check your previous messages to maintain consistency. If you promised "Blu", don't switch to "BCA" in the tool call.

Keep your text responses extremely concise, friendly, and in Indonesian by default unless the user speaks English.`;

    const toolDefinition = {
      type: "function" as const,
      function: {
        name: "create_transaction",
        description: "Draft a transaction for the user to confirm. Call this IMMEDIATELY when the user describes an expense, income, or transfer.",
        parameters: {
          type: "object",
          properties: {
            type: { 
              type: "string", 
              enum: ["pengeluaran", "pendapatan", "transfer"],
              description: "The type of transaction."
            },
            amount: { 
              type: "number", 
              description: "The nominal amount of the transaction." 
            },
            category: { 
              type: "string", 
              description: "The EXACT parent category name you recommended earlier. Must match your text recommendation." 
            },
            subCategory: { 
              type: "string", 
              description: "The EXACT subcategory name you recommended earlier. Use empty string only if the category has no subcategories." 
            },
            assetId: { 
              type: "string", 
              description: "The EXACT asset ID matching the asset name you recommended earlier. Look up the correct ID from the assets list." 
            },
            note: { 
              type: "string", 
              description: "A short descriptive note or merchant name based on the user's input." 
            },
            date: {
              type: "string",
              description: "The transaction date in YYYY-MM-DD format. Default to today's date if not specified."
            }
          },
          required: ["type", "amount", "category", "subCategory", "assetId", "note", "date"]
        }
      }
    };

    const apiMessages = [
      { role: "system", content: systemPrompt },
      ...messages
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: apiMessages,
      tools: [toolDefinition],
      tool_choice: "auto",
    });

    const choice = response.choices[0];
    const message = choice.message;

    // Check if the AI decided to call the tool
    if (message.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls[0];
      if (toolCall.type === 'function') {
        return res.status(200).json({
          role: "assistant",
          content: message.content || "Ini draft transaksinya, silakan dikonfirmasi ya!",
          toolCall: {
            name: toolCall.function.name,
            arguments: JSON.parse(toolCall.function.arguments)
          }
        });
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
