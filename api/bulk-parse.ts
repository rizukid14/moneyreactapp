import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb',
    },
  },
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { text, image, categories, assets, currentDate } = req.body; 

    if (!text && !image) {
      return res.status(400).json({ message: 'No text or image provided' });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ message: 'OPENAI_API_KEY is not configured on the server.' });
    }

    const categoryWithSubs = categories?.length > 0 
      ? categories.map((c: any) => `${c.name}${c.subcategories?.length > 0 ? ` (Sub: ${c.subcategories.map((s: any) => s.name).join(', ')})` : ''}`).join(' | ')
      : "None";
    const assetList = assets?.length > 0 ? assets.map((a: any) => a.name).join(',') : "None";
    const dateContext = currentDate || new Date().toISOString().split('T')[0];

    const prompt = `You are a fin-tech data extraction assistant. Parse the following unstructured textual transactions into a structured JSON array.
    
    CRITICAL RULES:
    1. TREAT EVERY DISTINCT LINE OR LOGICAL ENTRY AS A SEPARATE TRANSACTION.
    2. DO NOT MERGE multiple items into one unless they are clearly part of the exact same payment.
    3. If there are 3 separate lines describing different things, there MUST be 3 objects in the "transactions" array.
    4. If no amount is found for a line, still try to extract the note/date and set amount to 0.
    
    Currency Handling (IDR):
    - "k" or "rb" = thousand (e.g., 50k or 50rb = 50000)
    - "jt" = million (e.g., 1.5jt = 1500000)
    
    Context:
    - Current date: ${dateContext}
    - Relative dates: If "kemarin", "tadi", or day names are used, calculate the date relative to ${dateContext}.

    For each transaction, extract:
    - type: "pengeluaran", "pendapatan", or "transfer"
    - amount: numeric value (int)
    - date: YYYY-MM-DD (fallback to ${dateContext})
    - note: concise description
    - category: best match from available categories (leave empty if transfer).
    - subCategory: best match if a subcategory is identified.
    - asset: best match for payment method from [${assetList}] (for pengeluaran/pendapatan).
    - fromAsset: best match for sender/source from [${assetList}] (only for transfer).
    - toAsset: best match for receiver/destination from [${assetList}] (only for transfer).
    - adminFee: numeric value (int) if there's a fee explicitly mentioned, otherwise 0.
    - adminFeeTarget: "sender" or "receiver" (only if adminFee > 0).

    Available Categories & Subcategories:
    ${categoryWithSubs}

    Transactions Data:
    """
    ${text || "Data provided via image"}
    """
    
    Respond STRICTLY in JSON: { "transactions": [{ "type": "...", "amount": 0, "date": "...", "note": "...", "category": "...", "subCategory": "...", "asset": "...", "fromAsset": "...", "toAsset": "...", "adminFee": 0, "adminFeeTarget": "sender" }] }`;

    const messageContent: any[] = [{ type: "text", text: prompt }];
    if (image) {
      messageContent.push({
        type: "image_url",
        image_url: {
          url: `data:image/jpeg;base64,${image}`,
          detail: "high"
        }
      });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: messageContent,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2, // lowering temperature for better structural output and predictability
    });

    const responseText = response.choices[0].message.content;
    const parsedData = JSON.parse(responseText || '{"transactions": []}');
    
    return res.status(200).json(parsedData);
  } catch (error: any) {
    console.error('Bulk Parse API Error:', error);
    return res.status(500).json({ 
      message: 'Bulk Parse Failed', 
      error: error.message 
    });
  }
}
