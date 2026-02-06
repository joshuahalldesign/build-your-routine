export default async function handler(req, res) {
  // ------------------------------
  // CORS
  // ------------------------------
  res.setHeader('Access-Control-Allow-Origin', 'https://www.bangnbody.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { bundle_product_id, items } = req.body;

    if (!bundle_product_id || !Array.isArray(items) || !items.length) {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    console.log('📦 Incoming bundle payload', { bundle_product_id, items });

    // ------------------------------
    // 1️⃣ STOREFRONT SESSION
    // ------------------------------
    const sessionRes = await fetch(
      'https://api.rechargepayments.com/storefront/session',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Recharge-Storefront-Access-Token':
            process.env.RECHARGE_STOREFRONT_TOKEN
        },
        body: JSON.stringify({
          store_identifier: process.env.RECHARGE_STORE_IDENTIFIER
        })
      }
    );

    const sessionData = await sessionRes.json();

    if (!sessionRes.ok || !sessionData?.token) {
      console.error('❌ Session failed', sessionData);
      return res.status(401).json({
        error: 'Recharge session failed',
        details: sessionData
      });
    }

    console.log('🔑 Session token OK');

    // ------------------------------
    // 2️⃣ CREATE BUNDLE
    // ------------------------------
    const bundleRes = await fetch(
      'https://api.rechargepayments.com/storefront/bundles/selection',
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

    const bundleData = await bundleRes.json();

    if (!bundleRes.ok) {
      console.error('❌ Bundle creation failed', bundleData);
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
