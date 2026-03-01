const fs = require('fs');

let dashboard = fs.readFileSync('./frontend/views/DashboardView.tsx', 'utf8');
dashboard = dashboard.replace('Trophy, PieChart', 'Trophy, PieChart as PieChartIcon');
dashboard = dashboard.replace('<PieChart className="w-5 h-5 text-indigo-600" />', '<PieChartIcon className="w-5 h-5 text-indigo-600" />');
fs.writeFileSync('./frontend/views/DashboardView.tsx', dashboard);
