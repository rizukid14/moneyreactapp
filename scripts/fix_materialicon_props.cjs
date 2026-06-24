const fs = require('fs');
const path = require('path');

const modalsDir = 'c:/Users/user.test/OneDrive/Documents/Naufal/Pribadi/code/moneyreactapp/src/components/modals';

const files = fs.readdirSync(modalsDir);

files.forEach(file => {
  if (file.endsWith('.tsx')) {
    const filePath = path.join(modalsDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Replace color="..." or color={...} in MaterialIcon
    content = content.replace(/(<MaterialIcon\s+[^>]*?)\s+color=(['"][^'"]+['"]|\{[^}]+\})/g, '$1');
    
    // Replace style={{...}} in MaterialIcon
    content = content.replace(/(<MaterialIcon\s+[^>]*?)\s+style=\{\{[^}]+\}\}/g, '$1');

    fs.writeFileSync(filePath, content);
    console.log(`Cleaned up MaterialIcon props in ${file}`);
  }
});
