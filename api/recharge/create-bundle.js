import fetch from 'node-fetch';

export default async function handler(req, res) {
  // ------------------------------
  // CORS
  // ------------------------------
  res.setHeader('Access-Control-Allow-Origin', 'https://www.bangnbody.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { bundle_product_id, items } = req.body;

    if (!bundle_product_id || !Array.isArray(items) || !items.length) {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    console.log('📦 Incoming bundle payload', {
      bundle_product_id,
      items
    });

    // ------------------------------
    // CREATE BUNDLE SELECTION
    // ------------------------------
    const rechargeRes = await fetch(
      'https://storefront.rechargepayments.com/bundles/selection',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Recharge-Storefront-Access-Token':
            process.env.RECHARGE_STOREFRONT_TOKEN,
          'X-Recharge-Store-Identifier':
            process.env.RECHARGE_STORE_IDENTIFIER
        },
        body: JSON.stringify({
          bundle_product_id,
          items
        })
      }
    );

    const text = await rechargeRes.text();
    console.log('📥 Recharge raw response:', text);

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res.status(500).json({
        error: 'Recharge response not JSON',
        raw: text
      });
    }

    if (!rechargeRes.ok) {
      console.error('❌ Recharge error', data);
      return res.status(400).json(data);
    }

    console.log('✅ Bundle selection created');

    return res.status(200).json(data);

  } catch (err) {
    console.error('🔥 Server error', err);
    return res.status(500).json({
      error: 'Internal server error',
      message: err.message
    });
  }
}
