import fs from 'fs';

function cosineSim(a, b) {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dot / (magA * magB);
}

export function getTopMatches(queryEmbedding, k = 5, filters = {}) {
  const embeddedStrains = JSON.parse(fs.readFileSync('./embeddedStrains.json', 'utf-8'));

  const filtered = embeddedStrains.filter((strain) => {
    const prices = Array.isArray(strain.price)
      ? strain.price.map(parseFloat)
      : typeof strain.price === 'string'
      ? [parseFloat(strain.price)]
      : [];

    const minPrice = Math.min(...prices);

    return (
      (!filters.strainTypes || filters.strainTypes.includes(strain.strainType.toLowerCase())) &&
      (!filters.minTHC || strain.thc >= filters.minTHC) &&
      (!filters.maxTHC || strain.thc <= filters.maxTHC) &&
      (!filters.maxPrice || (!isNaN(minPrice) && minPrice <= filters.maxPrice)) &&
      (!filters.weights || filters.weights.some(w => strain.weight.includes(w))) &&
      (!filters.brands || filters.brands.includes(strain.brand?.name)) &&
      (!filters.preferredTerpenes || strain.terpenes?.some(t => filters.preferredTerpenes.includes(t.terpene.name))) &&
      (!filters.dislikedStrains || !filters.dislikedStrains.includes(strain.id))
    );
  });

  const scored = filtered.map((strain) => ({
    ...strain,
    similarity: cosineSim(queryEmbedding, strain.embedding),
  }));

  return scored.sort((a, b) => b.similarity - a.similarity).slice(0, k);
}
