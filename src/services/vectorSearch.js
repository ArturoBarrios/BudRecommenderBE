import fs from 'fs';

function cosineSim(a, b) {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dot / (magA * magB);
}

export function getTopMatches(queryEmbedding, k = 5) {
  const embeddedStrains = JSON.parse(fs.readFileSync('./embeddedStrains.json', 'utf-8'));

  const scored = embeddedStrains.map((strain) => ({
    ...strain,
    similarity: cosineSim(queryEmbedding, strain.embedding),
  }));

  return scored.sort((a, b) => b.similarity - a.similarity).slice(0, k);
}
