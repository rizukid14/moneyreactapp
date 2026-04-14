import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

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

    // Initialize Gemini 1.5 Flash
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: { 
        responseMimeType: "application/json" 
      }
    });

    // Prepare lists for the prompt
    const categoryList = categories?.length > 0 ? categories.map((c: any) => c.name).join(', ') : "None provided";
    const assetList = assets?.length > 0 ? assets.map((a: any) => a.name).join(', ') : "None provided";

    const prompt = `Analyze this receipt image and return a JSON object with the following fields: 
    - amount (number)
    - date (string as YYYY-MM-DD)
    - lineItems (array of {name: string, amount: number})
    - suggestedCategory (string): Select a category from the list below that MOST CLOSELY matches the receipt content. If no list provided, suggest a general one.
    - suggestedAsset (string): Select an asset/payment method from the list below that MOST CLOSELY matches the payment method on the receipt (e.g. "BCA", "Cash", "Tuna").
    - confidence ('high', 'medium', or 'low' based on image quality)

    USER'S CATEGORIES: [${categoryList}]
    USER'S ASSETS: [${assetList}]
    
    IMPORTANT: 
    - Today's date is ${new Date().toISOString().split('T')[0]}. Use this as a reference.
    - If the receipt does not have a clear date, default to today's date.
    - The receipt is from Indonesia. Amounts use '.' as a thousands separator and ',' as a decimal separator (e.g., 7.000 means seven thousand).
    - Return all 'amount' values as plain numbers (integers where possible).
    - Be extremely careful to find the Total Amount (not just the subtotal).`;

    const imagePart = {
      inlineData: {
        data: image, // Already base64 from frontend
        mimeType: "image/jpeg",
      },
    };

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    const parsedData = JSON.parse(text || '{}');
    
    // Add raw text for UI consistency
    parsedData.rawText = "Processed via Gemini 1.5 Flash (Free Tier)";
    
    return res.status(200).json(parsedData);
  } catch (error: any) {
    console.error('OCR API Error:', error);
    return res.status(500).json({ 
      message: 'Failed to process receipt with Gemini', 
      error: error.message 
    });
  }
}
