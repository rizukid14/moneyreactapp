const fs = require('fs');
const path = 'c:/Users/user.test/OneDrive/Documents/Naufal/Pribadi/code/moneyreactapp/src/components/chatbot/ChatBot.tsx';

let content = fs.readFileSync(path, 'utf8');

// Replace imports
content = content.replace(/import\s+\{\s*MessageCircle,\s*X,\s*Send,\s*Check,\s*AlertCircle,\s*Mic,\s*Square,\s*ArrowRight,\s*Trash2,\s*Plus\s*\}\s*from\s*'lucide-react';/g, "import MaterialIcon from '../common/MaterialIcon';");

// Maps
const iconMap = {
  'MessageCircle': 'forum',
  'X': 'close',
  'Send': 'send',
  'Check': 'check',
  'AlertCircle': 'error',
  'Mic': 'mic',
  'Square': 'stop',
  'ArrowRight': 'arrow_forward',
  'Trash2': 'delete',
  'Plus': 'add'
};

for (const [lucide, material] of Object.entries(iconMap)) {
  const regex = new RegExp(`<${lucide}\\s+size=\\{(\\d+)\\}\\s*\\/?>`, 'g');
  content = content.replace(regex, `<MaterialIcon name="${material}" className="text-[$1px]" />`);
  
  // Handing colors if any
  const regexColor = new RegExp(`<${lucide}\\s+size=\\{(\\d+)\\}\\s+color="([^"]+)"\\s*\\/?>`, 'g');
  content = content.replace(regexColor, `<MaterialIcon name="${material}" className="text-[$1px]" style={{ color: '$2' }} />`);

  // Handle sizes as strings
  const regexStrSize = new RegExp(`<${lucide}\\s+size="(\\d+)"\\s*\\/?>`, 'g');
  content = content.replace(regexStrSize, `<MaterialIcon name="${material}" className="text-[$1px]" />`);
}

// Special cases if any missed
content = content.replace(/<MessageCircle[^>]*>/g, '<MaterialIcon name="forum" className="text-[18px]" />');

fs.writeFileSync(path, content);
console.log('Replacement complete.');
