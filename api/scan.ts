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
      ? categories.map((c: any) => c.name).join(',')
      : "General";
    const assetList = assets?.length > 0
      ? assets.map((a: any) => a.name).join(',')
      : "Cash";

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Parse this Indonesian receipt. Return JSON only:
{"amount":number,"date":"YYYY-MM-DD","lineItems":[{"name":"str","amount":number}],"suggestedCategory":"str","suggestedAsset":"str","confidence":"high|medium|low"}
Rules: today=${new Date().toISOString().split('T')[0]}, dot=thousands(7.000=7000), amounts=integers, use GRAND TOTAL not subtotal.
Categories:[${categoryList}] Assets:[${assetList}]`
            },
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
      max_tokens: 400,
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
