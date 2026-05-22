import OpenAI from "openai";

let openai: OpenAI | null = null;

const getOpenAI = () => {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'mock-key',
    });
  }
  return openai;
};

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
    const { image, categories, assets, defaultAssetId } = req.body;

    if (!image) {
      return res.status(400).json({ message: 'No image provided' });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ message: 'OPENAI_API_KEY is not configured on the server.' });
    }

    const categoryList = categories?.length > 0 ? categories.map((c: any) => c.name).join(',') : "None";
    const assetList = assets?.length > 0 ? assets.map((a: any) => a.name).join(',') : "None";
    const defaultAsset = assets?.find((a: any) => a.id === defaultAssetId);
    const defaultAssetHint = defaultAsset ? ` (Default: ${defaultAsset.name})` : "";

    const prompt = `You are a receipt parser. Extract receipt data and return ONLY a valid JSON object with these fields:
    - merchantName: string (store/restaurant name, empty string if not found)
    - amount: number (final TOTAL paid by customer, including all taxes and fees. Use 0 if not found.)
    - date: string (YYYY-MM-DD format, use today if not visible)
    - time: string (HH:mm format, extraction from receipt, use current time if not visible)
    - lineItems: array of objects {name: string, amount: number}.
      CRITICAL RULES FOR lineItems:
        1. List only the actual purchased items (food, products, services).
        2. Do NOT include rows for tax, PPN, service charge, subtotal, total, or change (kembalian).
        3. Use the original base prices for the items BEFORE any tax/service/discount.
        4. Use the original item names from the receipt.
        5. If an item price is not clearly visible or readable, use 0 for that item.
        6. Do NOT guess or estimate prices. Only use numbers that are clearly visible.
    - taxAmount: number (EXACT amount of tax/PPN/PB1/VAT or maybe it look like tax example tax1 , etc from receipt. Use 0 if not found or not clearly visible. Do NOT calculate or estimate.)
    - serviceChargeAmount: number (EXACT amount of service charge/service fee from receipt. Use 0 if not found or not clearly visible. Do NOT calculate or estimate.)
    - discountAmount: number (EXACT amount of all discounts from receipt. Positive number. Use 0 if not found or not clearly visible. Do NOT calculate or estimate.)
    - suggestedCategory: best match from [${categoryList}], or empty string
    - suggestedSubCategory: sub-category if applicable, or empty string
    - suggestedAsset: best match payment method from [${assetList}], or empty string. ${defaultAssetHint ? `If the payment method is not clearly stated, prefer "${defaultAsset.name}" as it is the user's default.` : ""}
    - confidence: "high" | "medium" | "low"
    
    IMPORTANT RULES:
    1. Only extract numbers that are CLEARLY VISIBLE in the receipt.
    2. If a number is blurry, unclear, or not present, use 0 instead of guessing.
    3. Do NOT calculate or estimate any values.
    4. Do NOT assume standard tax rates (like 10% or 11%).
    5. The sum of lineItems + taxAmount + serviceChargeAmount - discountAmount should equal the amount (total).
    6. If the math doesn't add up, it means some values are missing or unclear - use 0 for those values.
    
    Context: Today is ${new Date().toISOString().split('T')[0]}, currency is Indonesian Rupiah (IDR).`;

    const response = await getOpenAI().chat.completions.create({
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
                detail: "high"
              },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0,
    });

    if (!response.choices || response.choices.length === 0) {
      return res.status(500).json({ message: 'OpenAI returned an empty response.' });
    }

    const text = response.choices[0].message.content;
    const parsedData = JSON.parse(text || '{}');
    parsedData.rawText = "Optimized via OpenAI (High Detail)";

    return res.status(200).json(parsedData);
  } catch (error: any) {
    console.error('OCR API Error:', error);
    return res.status(500).json({
      message: 'OCR Failed',
      error: error.message
    });
  }
}
