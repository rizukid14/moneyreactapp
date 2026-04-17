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

    const prompt = `Extract receipt data to JSON:
    - amount: total (number)
    - date: YYYY-MM-DD
    - lineItems: array of {name, amount}
    - suggestedCategory: from [${categoryList}]
    - suggestedAsset: from [${assetList}]
    - confidence: high/medium/low
    
    Ref context: Today is ${new Date().toISOString().split('T')[0]}, Indonesia currency.`;

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
