const fs = require('fs');
const path = require('path');

function kebabToPascal(str) {
  return str.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');
}

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lucideRegex = /<i data-lucide=\{?"?([^"}\n]*)"?\}?(?:\s+className="(.*?)")?><\/i>/g;
  
  let newContent = content;
  const iconsToImport = new Set();

  newContent = newContent.replace(lucideRegex, (match, iconName, className) => {
    // If it's a dynamic variable like `isOpen ? 'chevron-left' : 'chevron-right'` ignore or handle manually
    if (iconName.includes('?')) return match; 
    
    // Some are pure variables like `item.icon`
    if (iconName === 'item.icon') return `<item.icon className="${className}" />`;

    const componentName = kebabToPascal(iconName);
    iconsToImport.add(componentName);
    return `<${componentName} className="${className || ''}" />`;
  });

  // For complex ones like <i data-lucide={...} ... ></i>
  newContent = newContent.replace(/<i data-lucide=\{isOpen \? 'chevron-left' : 'chevron-right'\} className="(.*?)"><\/i>/g, 
    `{isOpen ? <ChevronLeft className="$1" /> : <ChevronRight className="$1" />}`);
  iconsToImport.add('ChevronLeft');
  iconsToImport.add('ChevronRight');

  newContent = newContent.replace(/<i data-lucide=\{isPrivacyEnabled \? "eye-off" : "eye"\} className="(.*?)"><\/i>/g, 
    `{isPrivacyEnabled ? <EyeOff className="$1" /> : <Eye className="$1" />}`);
  iconsToImport.add('EyeOff');
  iconsToImport.add('Eye');
  
  newContent = newContent.replace(/<i data-lucide=\{step === 2 \? 'check-square' : 'upload-cloud'\} className="(.*?)"><\/i>/g, 
    `{step === 2 ? <CheckSquare className="$1" /> : <UploadCloud className="$1" />}`);
  iconsToImport.add('CheckSquare');
  iconsToImport.add('UploadCloud');

  newContent = newContent.replace(/<i data-lucide=\{importMode === 'receipt' \? 'image' : 'file-spreadsheet'\} className="(.*?)"><\/i>/g, 
    `{importMode === 'receipt' ? <Image className="$1" /> : <FileSpreadsheet className="$1" />}`);
  iconsToImport.add('Image');
  iconsToImport.add('FileSpreadsheet');

  if (content !== newContent && iconsToImport.size > 0) {
    const importsArray = Array.from(iconsToImport).filter(x => x !== 'Item.Icon' && x !== 'item.icon');
    if (importsArray.length > 0) {
       // Search for existing lucide-react import
       if (newContent.includes('lucide-react')) {
         // Just append simple, we will fix up manually if needed or replace whole
       } else {
         const importStatement = `import { ${importsArray.join(', ')} } from 'lucide-react';\n`;
         // find last import
         const lastImportIndex = newContent.lastIndexOf('import ');
         const endOfLastImport = newContent.indexOf('\n', lastImportIndex);
         newContent = newContent.slice(0, endOfLastImport + 1) + importStatement + newContent.slice(endOfLastImport + 1);
       }
    }
  }

  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log('Fixed', filePath);
}

processFile('./frontend/components/Sidebar.tsx');
processFile('./frontend/components/ImportOverlay.tsx');
processFile('./frontend/App.tsx');
processFile('./frontend/views/DashboardView.tsx');

