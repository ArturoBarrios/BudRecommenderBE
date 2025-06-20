// services/embedStrains.ts
import { OpenAI } from 'openai';
import fs from 'fs';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function embedStrainsFromAPI() {
  const res = await fetch('http://localhost:4000/strains/get-strains'); // native fetch
  const strains = await res.json();

  const embedded = [];

  console.log(`🔍 Total strains fetched: ${strains.length}`);

  for (const [index, strain] of strains.entries()) {
    if (!strain) {
      console.warn(`⚠️ Skipping undefined strain at index ${index}`);
      continue;
    }

    if (!strain.name) {
      console.warn(`⚠️ Missing strain name at index ${index}`, strain);
      continue;
    }

    console.log(`📌 Embedding strain ${index + 1}/${strains.length}: ${strain.name}`);

    try {
      const text = `${strain.name}, ${strain.strainType}, ${strain.thc}% THC, weights: ${strain.weight}, prices: ${strain.price}, brand: ${strain.brand?.name}, terpenes: ${Array.isArray(strain.terpenes) ? strain.terpenes.map(t => t?.name || 'unknown').join(', ') : 'none'}`;


      const embeddingRes = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });

      embedded.push({
        ...strain,
        embedding: embeddingRes.data[0].embedding,
      });
    } catch (embedErr) {
      console.error(`❌ Error embedding strain at index ${index}:`, strain);
      console.error(embedErr);
    }

    await new Promise((r) => setTimeout(r, 100)); // avoid rate limit
  }

  fs.writeFileSync('./embeddedStrains.json', JSON.stringify(embedded, null, 2));
  console.log('✅ Embedding complete. Saved to embeddedStrains.json');
}

