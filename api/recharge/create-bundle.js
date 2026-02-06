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

    console.log('📦 Incoming bundle payload', { bundle_product_id, items });

    // ------------------------------
    // 1️⃣ AUTH SESSION (multipart/form-data)
    // ------------------------------
    const form = new FormData();
    form.append('storeIdentifier', process.env.RECHARGE_STORE_IDENTIFIER);

    const sessionRes = await fetch(
      'https://storefront.rechargepayments.com/auth/session',
      {
        method: 'POST',
        headers: {
          // IMPORTANT: do NOT set Content-Type manually
          'X-Recharge-Storefront-Access-Token':
            process.env.RECHARGE_STOREFRONT_TOKEN
        },
        body: form
      }
    );

    const sessionText = await sessionRes.text();
    console.log('🔍 Session raw:', sessionText);

    let sessionData;
    try {
      sessionData = JSON.parse(sessionText);
    } catch {
      return res.status(500).json({
        error: 'Recharge session parse failed',
        raw: sessionText
      });
    }

    if (!sessionRes.ok || !sessionData?.token) {
      return res.status(401).json({
        error: 'Recharge session failed',
        details: sessionData
      });
    }

    console.log('🔑 Recharge session token OK');

    // ------------------------------
    // 2️⃣ CREATE BUNDLE SELECTION
    // ------------------------------
    const bundleRes = await fetch(
      'https://storefront.rechargepayments.com/bundles/selection',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData.token}`
        },
        body: JSON.stringify({
          bundle_product_id,
          items
        })
      }
    );

    const bundleText = await bundleRes.text();
    console.log('📦 Bundle raw:', bundleText);

    let bundleData;
    try {
      bundleData = JSON.parse(bundleText);
    } catch {
      return res.status(500).json({
        error: 'Bundle parse failed',
        raw: bundleText
      });
    }

    if (!bundleRes.ok) {
      return res.status(400).json({
        error: 'Bundle creation failed',
        details: bundleData
      });
    }

    console.log('✅ Bundle selection created');

    return res.status(200).json(bundleData);

  } catch (err) {
    console.error('🔥 Server error', err);
    return res.status(500).json({
      error: 'Internal server error',
      message: err.message
    });
  }
}
