import fetch from 'node-fetch';
import FormData from 'form-data';

export default async function handler(req, res) {
  // ------------------------------
  // CORS
  // ------------------------------
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

  try {
    const { bundle_product_id, items } = req.body;

    if (!bundle_product_id || !Array.isArray(items) || !items.length) {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    console.log('📦 Incoming bundle payload', { bundle_product_id, items });

    // ------------------------------
    // BUILD MULTIPART FORM DATA
    // ------------------------------
    const form = new FormData();
    form.append('bundle_product_id', bundle_product_id);

    items.forEach((item, index) => {
      form.append(`items[${index}][variant_id]`, item.variant_id);
      form.append(`items[${index}][quantity]`, item.quantity);
    });

    // ------------------------------
    // SEND TO RECHARGE
    // ------------------------------
    const rechargeRes = await fetch(
      'https://storefront.rechargepayments.com/bundles/selection',
      {
        method: 'POST',
        headers: {
          'X-Recharge-Storefront-Access-Token':
            process.env.RECHARGE_STOREFRONT_TOKEN,
          'X-Recharge-Store-Identifier':
            process.env.RECHARGE_STORE_IDENTIFIER,
          ...form.getHeaders()
        },
        body: form
      }
    );

    const raw = await rechargeRes.text();
    console.log('📥 Recharge raw response:', raw);

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return res.status(500).json({
        error: 'Recharge response not JSON',
        raw
      });
    }

    if (!rechargeRes.ok) {
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
