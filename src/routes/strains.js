import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { recommendStrains } from '../services/recommendStrains.js';
import { embedStrainsFromAPI } from '../services/embedStrains.js';

const prisma = new PrismaClient();
const router = Router();

router.get('/embed-strains', async (req, res) => {
  try {
    console.log('📦 Embedding strains from API...');
    await embedStrainsFromAPI();
    console.log('✅ Embedding completed.');
    res.json({ success: true, message: 'Strains embedded and saved.' });
  } catch (err) {
    console.error('❌ Error during embedding:', err);
    res.status(500).json({ success: false, error: 'Embedding failed' });
  }
});

// routes/strain.ts

router.post('/create-strains', async (req, res) => {
  const { storeName, strains } = req.body;
  console.log(`📥 Creating strains for store: ${storeName}`);
  console.log(`📦 Strains data: ${JSON.stringify(strains, null, 2)}`);

  try {
    let store = await prisma.store.findFirst({ where: { name: storeName } });
    if (!store) {
      console.log('🏪 Store not found, creating new store');
      store = await prisma.store.create({ data: { name: storeName } });
    }

    const createdStrains = [];

    for (const s of strains) {
      console.log(`🌿 Creating strain: ${s.name}`);

      if (!s.brand || typeof s.brand !== 'string') {
        throw new Error(`Missing or invalid brand for strain: ${s.name}`);
      }

      const brandName = s.brand.trim();
      let brand = await prisma.brand.findUnique({ where: { name: brandName } });

      if (!brand) {
        console.log('🏷️ Creating new brand:', brandName);
        brand = await prisma.brand.create({ data: { name: brandName } });
      }

      const weightArray = Array.isArray(s.weights)
        ? s.weights
        : s.weight
        ? [s.weight]
        : [];

      const priceArray = Array.isArray(s.prices)
        ? s.prices
        : s.price
        ? [s.price]
        : [];

      const thc = s.thc ? parseFloat(s.thc) : null;

      let strain = await prisma.strain.findUnique({ where: { name: s.name } });

      if (!strain) {
        strain = await prisma.strain.create({
          data: {
            name: s.name,
            url: s.url,
            thc,
            weight: weightArray,
            price: priceArray,
            strainType: s.strain_type,
            brand: {
              connect: { id: brand.id },
            },
          },
        });
      }

      await prisma.strainStore.create({
        data: {
          strainId: strain.id,
          storeId: store.id,
          offer: s.offer || null,
        },
      });

      for (const [terpeneName, raw] of Object.entries(s.terpenes ?? {})) {
        console.log(`🧪 Processing terpene: ${terpeneName}`);

        let terpene = await prisma.terpene.findUnique({ where: { name: terpeneName } });
        if (!terpene) {
          console.log('🆕 Creating new terpene:', terpeneName);
          terpene = await prisma.terpene.create({
            data: {
              name: terpeneName,
              description: '',
            },
          });
        }

        const clean = raw.toLowerCase().replace('%', '').replace('mg/g', '').trim();
        const isMg = raw.toLowerCase().includes('mg/g');
        const percentage = parseFloat(clean);
        const finalPercentage = isMg ? percentage / 10 : percentage;

        await prisma.strainTerpene.upsert({
          where: {
            strainId_terpeneId: {
              strainId: strain.id,
              terpeneId: terpene.id,
            },
          },
          update: {
            percentage: finalPercentage,
          },
          create: {
            strainId: strain.id,
            terpeneId: terpene.id,
            percentage: finalPercentage,
          },
        });
      }

      createdStrains.push(strain);
    }

    console.log(`✅ Created ${createdStrains.length} strains.`);
    res.status(201).json({ success: true, strains: createdStrains });
  } catch (err) {
    console.error('❌ Error creating strains:', err);
    res.status(500).json({ success: false, error: 'Failed to create strains' });
  }
});



router.post('/create-user-strain-preference', async (req, res) => {
  const {
    userId,
    strainId,
    liked,
    reason,
    effectsFelt,
    symptomRelief
  } = req.body;

  console.log(`📥 Creating or updating user strain preference for user ${userId} and strain ${strainId}`);

  if (!userId || !strainId || liked === undefined) {
    return res.status(400).json({ success: false, error: 'Missing required fields.' });
  }

  try {
    const preference = await prisma.userStrain.upsert({
      where: {
        userId_strainId: {
          userId,
          strainId,
        },
      },
      update: {
        liked,
        reason,
        effectsFelt,
        symptomRelief,
      },
      create: {
        user: { connect: { id: userId } },
        strain: { connect: { id: strainId } },
        liked,
        reason,
        effectsFelt,
        symptomRelief,
      },
      include: {
        user: true,
        strain: true,
      },
    });

    res.status(200).json({ success: true, preference });
  } catch (err) {
    console.error('❌ Error creating or updating user strain preference:', err);
    res.status(500).json({ success: false, error: 'Failed to create or update preference.' });
  }
});





router.post('/recommend', async (req, res) => {
  try {
    const { strainType, thcTier, priceTier, weight, mood, text } = req.body;

    const parts = [];

    if (strainType) parts.push(`a ${strainType}`);
    if (thcTier) {
      if (thcTier === 'low') parts.push('low THC');
      else if (thcTier === 'mid') parts.push('moderate THC');
      else if (thcTier === 'high') parts.push('high THC');
    }
    if (priceTier) {
      if (priceTier === 'low') parts.push('under $30');
      else if (priceTier === 'mid') parts.push('around $30-$60');
      else if (priceTier === 'high') parts.push('premium pricing');
    }
    if (weight) parts.push(`weighing around ${weight}`);
    if (mood) parts.push(`for a ${mood} mood`);
    if (text) parts.push(text);

    const userQuery = `I'm looking for ${parts.join(', ')}`;

    console.log(`🤖 Recommending strains for query: "${userQuery}"`);
    const recommendations = await recommendStrains(userQuery);

    res.json({
      success: true,
      recommendations,
    });
  } catch (err) {
    console.error('❌ Error recommending strains:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch recommendations' });
  }
});


router.get('/get-strains', async (req, res) => {
  try {
    console.log('📡 Fetching strains from database...');
    const strains = await prisma.strain.findMany({
  include: {
    brand: {
      select: { id: true, name: true },
    },
    strainTerpenes: {
      include: {
        terpene: {
          select: { id: true, name: true, description: true },
        },
      },
    },
    strainStores: {
      include: {
        store: {
          select: { id: true, name: true },
        },
      },
    },
  },
});


    const formatted = strains.map((s) => ({
  id: s.id,
  name: s.name,
  url: s.url,
  thc: s.thc,
  weight: s.weight,
  price: s.price,
  strainType: s.strainType,
  brand: s.brand,
  terpenes: s.strainTerpenes.map((st) => ({
    id: st.terpene.id,
    name: st.terpene.name,
    description: st.terpene.description,
    percentage: st.percentage,
  })),
  stores: s.strainStores.map((ss) => ({
    id: ss.store.id,
    name: ss.store.name,
    offer: ss.offer,
  })),
}));


    console.log(`✅ Returned ${formatted.length} strains.`);
    res.json(formatted);
  } catch (err) {
    console.error('❌ Error fetching strains:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch strains' });
  }
});

function extractStrainName(url) {
  const parts = url.split('/');
  const slug = parts[parts.length - 1];
  return slug.replace(/[-_]/g, ' ').replace(/\d+(\.\d+)?g/g, '').trim();
}

export default router;
