function calculateScore(rfpText, vendorText) {
  const rfpWords = String(rfpText)
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  const vendorWords = String(vendorText)
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  if (!rfpWords.length) {
    return 0;
  }

  let matchCount = 0;

  rfpWords.forEach((word) => {
    if (vendorWords.includes(word)) {
      matchCount++;
    }
  });

  const score = (matchCount / rfpWords.length) * 100;

  return Number(score.toFixed(2));
}

function rankVendors(rfpText, vendors) {
  return vendors
    .map((vendor) => {
      const score = calculateScore(rfpText, vendor.text);

      return {
        name: vendor.name,
        score,
        explanation: `Matched ${score}% of RFP requirements`,
      };
    })
    .sort((a, b) => b.score - a.score);
}

module.exports = {
  calculateScore,
  rankVendors,
};
