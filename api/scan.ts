import { OpenAI } from 'openai';

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

    // Prepare lists for the prompt
    const categoryList = categories?.length > 0 ? categories.map((c: any) => c.name).join(', ') : "None provided";
    const assetList = assets?.length > 0 ? assets.map((a: any) => a.name).join(', ') : "None provided";

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a receipt parsing assistant. Extract data from receipt images into structured JSON."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this receipt image and return a JSON object with the following fields: 
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
              - Be extremely careful to find the Total Amount (not just the subtotal).`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${image}`,
              },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 600,
    });

    const parsedData = JSON.parse(response.choices[0].message.content || '{}');
    
    // Add raw text for UI consistency
    parsedData.rawText = "Processed via Cloud AI with context matching";
    
    return res.status(200).json(parsedData);
  } catch (error: any) {
    console.error('OCR API Error:', error);
    return res.status(500).json({ 
      message: 'Failed to process receipt', 
      error: error.message 
    });
  }
}
