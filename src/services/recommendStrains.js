import { OpenAI } from 'openai';
import { getTopMatches } from './vectorSearch.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function recommendStrains(userQuery) {
  console.log('🤖 Starting recommendation process...');
  console.log(`📝 User query: "${userQuery}"`);

  const embeddingRes = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: userQuery,
  });

  console.log('🧠 Embedding generated.');

  const queryEmbedding = embeddingRes.data[0].embedding;
  const topStrains = getTopMatches(queryEmbedding, 5);

  console.log('🌿 Top matching strains:');
  topStrains.forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.name} - ${s.strainType}, ${s.thc}% THC, ${s.weight}, ${s.price}`);
  });

  const prompt = `
A user wants cannabis for: "${userQuery}".
Here are some strains that might match:

${topStrains.map((s, i) => 
  `${i + 1}. ${s.name} - ${s.strainType}, ${s.thc}% THC, ${s.weight}, ${s.price}`
).join('\n')}

Choose the best 3 and explain why.
Format as:
[
  { "name": "Strain", "reason": "..." },
  ...
]
`;

  console.log('✍️ Sending prompt to OpenAI:');
  console.log(prompt);

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
  });

  console.log('📩 Response received from OpenAI:');
  console.log(response.choices[0].message.content);

  return response.choices[0].message.content;
}
