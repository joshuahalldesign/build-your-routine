export default async function handler(req, res) {
  /* ===============================
     CORS HEADERS — REQUIRED
  =============================== */
  res.setHeader('Access-Control-Allow-Origin', 'https://www.bangnbody.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization'
  );

  // 🔑 Preflight request
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

    console.log('📦 Incoming bundle request', {
      bundle_product_id,
      items
    });

    /* ===============================
       1️⃣ AUTH — STOREFRONT TOKEN
    =============================== */

    const authRes = await fetch(
      'https://storefront.rechargepayments.com/auth/login',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Recharge-Storefront-Access-Token':
            process.env.RECHARGE_STOREFRONT_TOKEN
        },
        body: JSON.stringify({
          storeIdentifier: process.env.RECHARGE_STORE_IDENTIFIER
        })
      }
    );

    const authText = await authRes.text();
    let authData;

    try {
      authData = JSON.parse(authText);
    } catch {
      throw new Error(`Auth JSON parse failed: ${authText}`);
    }

    if (!authRes.ok || !authData?.token) {
      console.error('❌ Recharge auth failed', authData);
      return res.status(401).json({
        error: 'Recharge authentication failed',
        details: authData
      });
    }

    console.log('🔑 Recharge session token created');

    /* ===============================
       2️⃣ CREATE BUNDLE SELECTION
    =============================== */

    const bundleRes = await fetch(
      'https://storefront.rechargepayments.com/bundles/selection',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authData.token}`
        },
        body: JSON.stringify({
          bundle_product_id,
          items
        })
      }
    );

    const bundleText = await bundleRes.text();
    let bundleData;

    try {
      bundleData = JSON.parse(bundleText);
    } catch {
      throw new Error(`Bundle JSON parse failed: ${bundleText}`);
    }

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
