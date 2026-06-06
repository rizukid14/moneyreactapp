const fs = require('fs');
const path = require('path');

const filesToProcess = [
  'c:/Users/user.test/OneDrive/Documents/Naufal/Pribadi/code/moneyreactapp/src/pages/Settings.tsx'
];

const iconMap = {
  'Moon': 'dark_mode',
  'DatabaseBackup': 'backup',
  'FileSpreadsheet': 'table_view',
  'GripVertical': 'drag_indicator'
};

filesToProcess.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Remove lucide-react import and extract imported icons
    let lucideMatch = content.match(/import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"];?/);
    if (lucideMatch) {
      let importedIconsRaw = lucideMatch[1].split(',').map(i => i.trim());
      
      let importedIcons = [];
      importedIconsRaw.forEach(i => {
        if(i.includes(' as ')) {
          const parts = i.split(' as ');
          importedIcons.push({ original: parts[0].trim(), alias: parts[1].trim() });
        } else {
          importedIcons.push({ original: i, alias: i });
        }
      });

      // Remove the lucide-react import
      content = content.replace(/import\s+\{[^}]+\}\s+from\s+['"]lucide-react['"];?\n?/, '');

      // Replace icons
      importedIcons.forEach(item => {
        const material = iconMap[item.original];
        if (material) {
          const lucide = item.alias;
          
          const regex1 = new RegExp(`<${lucide}\\s+size=\\{(\\d+)\\}\\s*\\/?>`, 'g');
          content = content.replace(regex1, `<MaterialIcon name="${material}" className="text-[$1px]" />`);
          
          const regex2 = new RegExp(`<${lucide}\\s+size=\\{(\\d+)\\}\\s+className=(['"])(.*?)(['"])\\s*\\/?>`, 'g');
          content = content.replace(regex2, `<MaterialIcon name="${material}" className="text-[$1px] $3" />`);
          
          const regex3 = new RegExp(`<${lucide}\\s+size=\\{(\\d+)\\}\\s+color=(['"])(.*?)(['"])\\s*\\/?>`, 'g');
          content = content.replace(regex3, `<MaterialIcon name="${material}" className="text-[$1px]" style={{ color: '$3' }} />`);

          const regex4 = new RegExp(`<${lucide}\\s*\\/?>`, 'g');
          content = content.replace(regex4, `<MaterialIcon name="${material}" className="text-base" />`);
          
          const regex5 = new RegExp(`<${lucide}\\b([^>]*)>`, 'g');
          content = content.replace(regex5, (match, props) => {
            let newProps = props.replace(/size=\{[^\}]+\}/, '');
            newProps = newProps.replace(/size=['"][^'"]+['"]/, '');
            return `<MaterialIcon name="${material}" ${newProps}>`;
          });
        }
      });

      // Cleanup style and color in MaterialIcon
      content = content.replace(/(<MaterialIcon\s+[^>]*?)\s+color=(['"][^'"]+['"]|\{[^}]+\})/g, '$1');
      content = content.replace(/(<MaterialIcon\s+[^>]*?)\s+style=\{\{[^}]+\}\}/g, '$1');

      fs.writeFileSync(filePath, content);
      console.log(`Replaced icons in ${path.basename(filePath)}`);
    } else {
        // Fallback pass if import is already gone:
        for (const [lucide, material] of Object.entries(iconMap)) {
            if (content.includes(`<${lucide}`)) {
                const regex1 = new RegExp(`<${lucide}\\s+size=\\{(\\d+)\\}\\s*\\/?>`, 'g');
                content = content.replace(regex1, `<MaterialIcon name="${material}" className="text-[$1px]" />`);
                
                const regex2 = new RegExp(`<${lucide}\\s+size=\\{(\\d+)\\}\\s+className=(['"])(.*?)(['"])\\s*\\/?>`, 'g');
                content = content.replace(regex2, `<MaterialIcon name="${material}" className="text-[$1px] $3" />`);
                
                const regex3 = new RegExp(`<${lucide}\\s+size=\\{(\\d+)\\}\\s+color=(['"])(.*?)(['"])\\s*\\/?>`, 'g');
                content = content.replace(regex3, `<MaterialIcon name="${material}" className="text-[$1px]" style={{ color: '$3' }} />`);
      
                const regex4 = new RegExp(`<${lucide}\\s*\\/?>`, 'g');
                content = content.replace(regex4, `<MaterialIcon name="${material}" className="text-base" />`);
                
                const regex5 = new RegExp(`<${lucide}\\b([^>]*)>`, 'g');
                content = content.replace(regex5, (match, props) => {
                  let newProps = props.replace(/size=\{[^\}]+\}/, '');
                  newProps = newProps.replace(/size=['"][^'"]+['"]/, '');
                  return `<MaterialIcon name="${material}" ${newProps}>`;
                });
            }
        }
        content = content.replace(/(<MaterialIcon\s+[^>]*?)\s+color=(['"][^'"]+['"]|\{[^}]+\})/g, '$1');
        content = content.replace(/(<MaterialIcon\s+[^>]*?)\s+style=\{\{[^}]+\}\}/g, '$1');
        fs.writeFileSync(filePath, content);
        console.log(`Replaced missing icons in ${path.basename(filePath)} via fallback`);
    }
  }
});

console.log('Cleanup complete (Pass 2).');
