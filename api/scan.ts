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
    const { image, categories, assets } = req.body; 

    if (!image) {
      return res.status(400).json({ message: 'No image provided' });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ message: 'OPENAI_API_KEY is not configured on the server.' });
    }

    const categoryList = categories?.length > 0 ? categories.map((c: any) => c.name).join(',') : "None";
    const assetList = assets?.length > 0 ? assets.map((a: any) => a.name).join(',') : "None";

    const prompt = `You are a receipt parser. Extract receipt data and return ONLY a valid JSON object with these fields:
    - merchantName: string (store/restaurant name)
    - amount: number (final TOTAL paid by customer, including all taxes and fees)
    - date: string (YYYY-MM-DD format, use today if not visible)
    - lineItems: array of objects {name: string, amount: number}.
      CRITICAL RULES FOR lineItems:
        1. List only the actual purchased items (food, products, services).
        2. Do NOT include rows for tax, PPN, service charge, subtotal, total, or change (kembalian).
        3. Use the original base prices for the items.
        4. Use the original item names from the receipt.
    - taxAmount: number (Amount of tax, PPN, PB1, VAT, etc. 0 if none.)
    - serviceChargeAmount: number (Amount of service charge, service fee, etc. 0 if none.)
    - discountAmount: number (Amount of all discounts. Positive number. 0 if none.)
    - suggestedCategory: best match from [${categoryList}], or empty string
    - suggestedSubCategory: sub-category if applicable, or empty string
    - suggestedAsset: best match payment method from [${assetList}], or empty string
    - confidence: "high" | "medium" | "low"
    
    Context: Today is ${new Date().toISOString().split('T')[0]}, currency is Indonesian Rupiah (IDR).`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${image}`,
                detail: "low"
              },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
    });

    const text = response.choices[0].message.content;
    const parsedData = JSON.parse(text || '{}');
    parsedData.rawText = "Optimized via OpenAI (Low Detail/65 tokens)";
    
    return res.status(200).json(parsedData);
  } catch (error: any) {
    console.error('OCR API Error:', error);
    return res.status(500).json({ 
      message: 'OCR Failed', 
      error: error.message 
    });
  }
}
