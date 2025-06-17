// services/embedStrains.ts
import { OpenAI } from 'openai';
import fs from 'fs';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function embedStrainsFromAPI() {
  const res = await fetch('http://localhost:4000/strains/get-strains'); // native fetch
  const strains = await res.json();

  const embedded = [];

  for (const strain of strains) {
    const text = `${strain.name}, ${strain.strainType}, ${strain.thc}% THC, ${strain.weight}, ${strain.price}`;
    const embeddingRes = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });

    embedded.push({
      ...strain,
      embedding: embeddingRes.data[0].embedding,
    });

    await new Promise((r) => setTimeout(r, 100)); // avoid rate limit
  }

  fs.writeFileSync('./embeddedStrains.json', JSON.stringify(embedded, null, 2));
  console.log('✅ Embedding complete. Saved to embeddedStrains.json');
}
