import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

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

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ message: 'GEMINI_API_KEY is not configured on the server.' });
    }

    const categoryList = categories?.length > 0
      ? categories.map((c: any) => c.name).join(', ')
      : "None provided";
    const assetList = assets?.length > 0
      ? assets.map((a: any) => a.name).join(', ')
      : "None provided";

    const prompt = `Analyze this receipt image and return a JSON object with the following fields:
    - amount (number): the grand total amount paid
    - date (string as YYYY-MM-DD): the receipt date
    - lineItems (array of {name: string, amount: number}): individual items from the receipt
    - suggestedCategory (string): pick from USER'S CATEGORIES that best matches the receipt
    - suggestedAsset (string): pick from USER'S ASSETS that best matches the payment method shown
    - confidence ('high', 'medium', or 'low' based on image quality)

    USER'S CATEGORIES: [${categoryList}]
    USER'S ASSETS: [${assetList}]

    IMPORTANT RULES:
    - Today's date is ${new Date().toISOString().split('T')[0]}. Default to today if date is unclear.
    - This is an Indonesian receipt. '.' is a thousands separator and ',' is a decimal separator (e.g. 7.000 = seven thousand, not 7).
    - Return all 'amount' values as plain integers (no dots, no commas).
    - Find the TOTAL AMOUNT (grand total), not the subtotal.
    - Return ONLY valid JSON. No markdown, no code blocks.`;

    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash-preview-04-17",
      contents: [
        {
          parts: [
            { text: prompt },
            { inlineData: { data: image, mimeType: "image/jpeg" } },
          ],
        },
      ],
      config: { responseMimeType: "application/json" },
    });

    const text = response.text ?? response.text;
    const parsedData = JSON.parse(text || '{}');
    parsedData.rawText = "Processed via Gemini 2.5 Flash";

    return res.status(200).json(parsedData);

  } catch (error: any) {
    console.error('OCR API Error:', error);
    return res.status(500).json({
      message: 'Failed to process receipt with Gemini',
      error: error.message,
    });
  }
}
