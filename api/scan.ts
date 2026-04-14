import OpenAI from 'openai';

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

    const categoryList = categories?.length > 0
      ? categories.map((c: any) => c.name).join(', ')
      : "None provided";
    const assetList = assets?.length > 0
      ? assets.map((a: any) => a.name).join(', ')
      : "None provided";

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a receipt parsing assistant for an Indonesian expense tracking app. Extract structured data from receipt images and return ONLY valid JSON."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this receipt image and return a JSON object with:
              - amount (number): the grand total amount paid (integer)
              - date (string YYYY-MM-DD): the receipt date
              - lineItems (array of {name: string, amount: number}): individual items
              - suggestedCategory (string): pick from [${categoryList}] that best matches the receipt
              - suggestedAsset (string): pick from [${assetList}] that best matches the payment method
              - confidence ('high', 'medium', or 'low')

              IMPORTANT:
              - Today's date is ${new Date().toISOString().split('T')[0]}. Default to today if date is unclear.
              - This is an Indonesian receipt. '.' is a THOUSANDS separator (e.g. 7.000 = 7000, not 7).
              - Return amount values as plain integers (no dots, no commas).
              - Find the GRAND TOTAL, not subtotal.
              - Return ONLY valid JSON, no markdown.`
            },
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
      max_tokens: 800,
    });

    const parsedData = JSON.parse(response.choices[0].message.content || '{}');
    parsedData.rawText = "Processed via OpenAI GPT-4o Mini";

    return res.status(200).json(parsedData);

  } catch (error: any) {
    console.error('OCR API Error:', error);
    return res.status(500).json({
      message: 'Failed to process receipt',
      error: error.message,
    });
  }
}
