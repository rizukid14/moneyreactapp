const fs = require('fs');
const file = 'd:/Naufal/Pribadi/code/moneyreactapp/src/pages/Statistics.tsx';
const content = fs.readFileSync(file, 'utf-8');
const lines = content.split('\n');

const heatmapStart = 643; // 0-indexed for line 644
const heatmapEnd = 1012; // 0-indexed for line 1013 (exclusive)

const heatmapLines = lines.slice(heatmapStart, heatmapEnd);

// Remove heatmap from its original place
lines.splice(heatmapStart, heatmapEnd - heatmapStart);

// Find the index of the Trend Chart (now shifted!)
// Original trend chart was at line 1542 (index 1541).
// Since we removed (1012 - 643) = 369 lines before it,
// its new index is 1541 - 369 = 1172.
const trendChartIdx = 1172;

// Insert heatmap lines before the trend chart
lines.splice(trendChartIdx, 0, ...heatmapLines);

fs.writeFileSync(file, lines.join('\n'));
console.log('Heatmap moved successfully.');
