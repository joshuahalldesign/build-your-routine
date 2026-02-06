export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { bundle_product_id, items } = req.body;

    if (!bundle_product_id || !items?.length) {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    console.log('📦 Incoming bundle request', {
      bundle_product_id,
      items
    });

    // 1️⃣ Create Recharge session using storefront token
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

    const authData = await authRes.json();

    if (!authData?.token) {
      console.error('❌ Recharge auth failed', authData);
      return res.status(401).json({
        error: 'Recharge authentication failed',
        details: authData
      });
    }

    console.log('🔑 Recharge session token created');

    // 2️⃣ Create bundle selection
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
