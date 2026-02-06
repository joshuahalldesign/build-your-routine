export default async function handler(req, res) {
  // ==============================
  // ✅ CORS (ALWAYS FIRST)
  // ==============================
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', 'https://www.bangnbody.com');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  res.setHeader('Access-Control-Allow-Origin', 'https://www.bangnbody.com');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    const { bundle_product_id, items } = req.body;

    if (!bundle_product_id || !Array.isArray(items) || !items.length) {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    console.log('📦 Incoming bundle payload', { bundle_product_id, items });

    // ==============================
    // 1️⃣ CREATE STOREFRONT SESSION
    // ==============================
    const sessionRes = await fetch(
      'https://storefront.rechargepayments.com/session',
      {
        method: 'POST',
        headers: {
          'X-Recharge-Storefront-Access-Token':
            process.env.RECHARGE_STOREFRONT_TOKEN
        },
        body: new URLSearchParams({
          storeIdentifier: process.env.RECHARGE_STORE_IDENTIFIER
        })
      }
    );

    const sessionText = await sessionRes.text();
    console.log('🔑 Session raw:', sessionText);

    let sessionData;
    try {
      sessionData = JSON.parse(sessionText);
    } catch {
      return res.status(500).json({
        error: 'Recharge session not JSON',
        raw: sessionText
      });
    }

    if (!sessionRes.ok || !sessionData?.token) {
      return res.status(401).json({
        error: 'Recharge session failed',
        response: sessionData
      });
    }

    // ==============================
    // 2️⃣ CREATE BUNDLE SELECTION
    // ==============================
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
    console.log('📥 Bundle raw:', bundleText);

    let bundleData;
    try {
      bundleData = JSON.parse(bundleText);
    } catch {
      return res.status(500).json({
        error: 'Bundle response not JSON',
        raw: bundleText
      });
    }

    if (!bundleRes.ok) {
      return res.status(400).json({
        error: 'Bundle creation failed',
        response: bundleData
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
