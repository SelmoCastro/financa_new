const fs = require('fs');

// Fix DashboardView.tsx
let dashboard = fs.readFileSync('./frontend/views/DashboardView.tsx', 'utf8');
dashboard = dashboard.replace(
  "import { Sparkles, RefreshCw, AlertCircle } from 'lucide-react';",
  "import { Sparkles, RefreshCw, AlertCircle, Crosshair, Banknote, TrendingUp, TrendingDown, CheckCircle, Trophy, PieChart } from 'lucide-react';"
);
fs.writeFileSync('./frontend/views/DashboardView.tsx', dashboard);

// Fix ImportOverlay.tsx
let importOverlay = fs.readFileSync('./frontend/components/ImportOverlay.tsx', 'utf8');
const importRegex = /import \{ [^}]+ \} from 'lucide-react';\n/;
const match = importOverlay.match(importRegex);
if (match) {
  importOverlay = importOverlay.replace(match[0], ''); // Remove from wrong place
  importOverlay = match[0] + importOverlay; // Add to top
  fs.writeFileSync('./frontend/components/ImportOverlay.tsx', importOverlay);
}
