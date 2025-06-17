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

router.post('/create-strains', async (req, res) => {
  const { storeName, strains } = req.body;
  console.log(`📥 Creating strains for store: ${storeName}`);

  try {
    let store = await prisma.store.findFirst({ where: { name: storeName } });
    if (!store) {
      console.log('🏪 Store not found, creating new store');
      store = await prisma.store.create({ data: { name: storeName } });
    }

    const createdStrains = [];

    for (const s of strains) {
      console.log(`🌿 Creating strain: ${s.name}`);
      const strain = await prisma.strain.create({
        data: {
          name: s.name,
          url: s.url,
          thc: parseFloat(s.thc),
          weight: s.weight,
          price: s.price,
          strainType: s.strain_type,
          stores: {
            connect: [{ id: store.id }],
          },
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

        await prisma.strainTerpene.create({
          data: {
            strainId: strain.id,
            terpeneId: terpene.id,
            percentage: isMg ? percentage / 10 : percentage,
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
        stores: {
          select: { id: true, name: true },
        },
        strainTerpenes: {
          include: {
            terpene: {
              select: { id: true, name: true, description: true },
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
      stores: s.stores,
      terpenes: s.strainTerpenes.map((st) => ({
        id: st.terpene.id,
        name: st.terpene.name,
        description: st.terpene.description,
        percentage: st.percentage,
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
