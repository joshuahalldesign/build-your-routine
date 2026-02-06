import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', 'https://www.bangnbody.com');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Access-Control-Allow-Origin', 'https://www.bangnbody.com');

  const { bundle_product_id, items } = req.body;

  if (!bundle_product_id || !items?.length) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  const rechargeRes = await fetch(
    'https://storefront.rechargepayments.com/bundles/selection',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Recharge-Storefront-Access-Token': process.env.RECHARGE_STOREFRONT_TOKEN,
        'X-Recharge-Store-Identifier': process.env.RECHARGE_STORE_IDENTIFIER
      },
      body: JSON.stringify({ bundle_product_id, items })
    }
  );

  const text = await rechargeRes.text();

  try {
    const json = JSON.parse(text);
    if (!rechargeRes.ok) {
      return res.status(400).json(json);
    }
    return res.status(200).json(json);
  } catch {
    return res.status(500).json({
      error: 'Recharge response not JSON',
      raw: text
    });
  }
}
