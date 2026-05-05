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
      ? categories.map((c: any) => `${c.name} (${c.type})`).join(', ') 
      : "None";
    
    const assetList = assets?.length > 0 
      ? assets.map((a: any) => `{ id: "${a.id}", name: "${a.name}" }`).join(', ') 
      : "None";

    const defaultAssetId = assets?.length > 0 ? assets[0].id : "";

    const systemPrompt = `You are MoneyBot, a helpful AI assistant built directly into the MoneyApp personal finance application.
Your primary purpose is to help users understand the app, manage their finances, and categorize transactions.

STRICT GUARDRAILS:
1. You MUST NOT answer questions unrelated to MoneyApp, personal finance, budgeting, or transaction categorization.
2. If asked about programming, general knowledge, history, politics, or any off-topic subject, politely decline, state that you are MoneyBot, and explain what you can help with.

APP FEATURES TUTORIAL CONTEXT:
- Transaksi (Transactions): Record pengeluaran (expense), pendapatan (income), and transfer antar rekening (between assets).
- Aset (Assets): Manage dompet (wallets), rekening bank, cash, etc.
- Hutang/Piutang (Debts): Track hutang (money you owe) and piutang (money owed to you) with installment (cicilan) tracking.
- Statistik (Statistics): View charts and breakdowns of income and expenses.
- Scan: Use AI OCR to automatically parse struk belanja (receipts) or mutasi bank (bank statements).

CURRENT USER CONTEXT:
Categories: ${categoryList}
Assets: ${assetList}

BEHAVIOR RULES FOR TRANSACTIONS:
1. When a user describes a transaction (e.g., "makan kfc 10k"), DO NOT call the 'create_transaction' tool immediately.
2. First, reply with a TEXT recommendation for the best category and asset, and explicitly ask for confirmation. For example: "Menurut saya kategori yang cocok adalah Makanan. Apakah boleh saya buatkan transaksinya?"
3. ONLY WHEN the user explicitly agrees (e.g., "yes", "boleh", "ok", "ya", "silakan"), THEN you must call the 'create_transaction' tool.
4. For the asset, guess based on context (e.g., if they say "Cash", find a cash asset). If unsure, recommend the first available asset (ID: "${defaultAssetId}").

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
              description: "The closest matching category name from the user's available categories." 
            },
            assetId: { 
              type: "string", 
              description: "The ID of the best matching asset. Default to the first available asset ID if unsure." 
            },
            note: { 
              type: "string", 
              description: "A short descriptive note or merchant name based on the user's input." 
            }
          },
          required: ["type", "amount", "category", "assetId", "note"]
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
