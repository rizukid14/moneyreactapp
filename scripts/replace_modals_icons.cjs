const fs = require('fs');
const path = require('path');

const modalsDir = 'c:/Users/user.test/OneDrive/Documents/Naufal/Pribadi/code/moneyreactapp/src/components/modals';

const iconMap = {
  'X': 'close',
  'Save': 'save',
  'Plus': 'add',
  'Trash2': 'delete',
  'AlertCircle': 'error',
  'Check': 'check',
  'ChevronRight': 'chevron_right',
  'ChevronLeft': 'chevron_left',
  'ChevronDown': 'expand_more',
  'ChevronUp': 'expand_less',
  'Calendar': 'calendar_today',
  'Search': 'search',
  'Edit2': 'edit',
  'ArrowRight': 'arrow_forward',
  'ArrowLeft': 'arrow_back',
  'ArrowUpRight': 'call_made',
  'ArrowDownRight': 'call_received',
  'ArrowDown': 'arrow_downward',
  'ArrowUp': 'arrow_upward',
  'Wallet': 'account_balance_wallet',
  'Tag': 'local_offer',
  'FileText': 'description',
  'Camera': 'camera_alt',
  'Image': 'image',
  'Download': 'download',
  'Upload': 'upload',
  'MoreHorizontal': 'more_horiz',
  'MoreVertical': 'more_vert',
  'Settings': 'settings',
  'Info': 'info',
  'HelpCircle': 'help',
  'User': 'person',
  'Users': 'people',
  'Repeat': 'repeat',
  'RefreshCw': 'refresh',
  'CreditCard': 'credit_card',
  'TrendingUp': 'trending_up',
  'TrendingDown': 'trending_down',
  'List': 'list',
  'PieChart': 'pie_chart',
  'BarChart2': 'bar_chart',
  'Activity': 'local_activity',
  'Zap': 'bolt',
  'Star': 'star',
  'Shield': 'security',
  'Unlock': 'lock_open',
  'Lock': 'lock',
  'Eye': 'visibility',
  'EyeOff': 'visibility_off',
  'Clock': 'schedule',
  'Bell': 'notifications',
  'Mail': 'mail',
  'MessageCircle': 'forum',
  'Phone': 'phone',
  'MapPin': 'location_on',
  'Link': 'link',
  'Globe': 'language',
  'LogOut': 'logout',
  'LogIn': 'login',
  'Sliders': 'tune',
  'Filter': 'filter_list',
  'Target': 'track_changes',
  'Calculator': 'calculate',
  'ExternalLink': 'open_in_new',
  'Receipt': 'receipt',
  'AlertTriangle': 'warning',
  'CheckCircle2': 'check_circle',
  'Landmark': 'account_balance',
  'Smartphone': 'smartphone',
  'PiggyBank': 'savings',
  'HandCoins': 'payments',
  'Folder': 'folder',
  'Delete': 'backspace',
  'FolderOpen': 'folder_open',
  'UserPlus': 'person_add',
  'CalendarDays': 'calendar_month',
  'ArrowRightLeft': 'swap_horiz',
  'Share2': 'share',
  'History': 'history',
  'Copy': 'content_copy',
  'ShoppingBag': 'shopping_bag',
  'Plane': 'flight',
  'Loader2': 'autorenew',
  'Link2Off': 'link_off',
  'ArrowDownLeft': 'call_received'
};

const files = fs.readdirSync(modalsDir);

files.forEach(file => {
  if (file.endsWith('.tsx')) {
    const filePath = path.join(modalsDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Remove lucide-react import and extract imported icons
    // We must handle cases like "import { History as HistoryIcon } from 'lucide-react';"
    // Because we just need to replace the tag uses.
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

      // Remove the import statement
      content = content.replace(/import\s+\{[^}]+\}\s+from\s+['"]lucide-react['"];?\n?/, '');

      // Add MaterialIcon import if not already present
      if (!content.includes('import MaterialIcon')) {
        const lastImportIndex = content.lastIndexOf('import ');
        if (lastImportIndex !== -1) {
          const endOfLine = content.indexOf('\n', lastImportIndex);
          content = content.slice(0, endOfLine + 1) + "import MaterialIcon from '../common/MaterialIcon';\n" + content.slice(endOfLine + 1);
        } else {
          content = "import MaterialIcon from '../common/MaterialIcon';\n" + content;
        }
      }

      // Replace icons in the code
      importedIcons.forEach(item => {
        const material = iconMap[item.original];
        if (material) {
          const lucide = item.alias;
          // e.g. <Save size={20} /> -> <MaterialIcon name="save" className="text-[20px]" />
          const regex1 = new RegExp(`<${lucide}\\s+size=\\{(\\d+)\\}\\s*\\/?>`, 'g');
          content = content.replace(regex1, `<MaterialIcon name="${material}" className="text-[$1px]" />`);
          
          // e.g. <Save size={20} className="..." /> -> <MaterialIcon name="save" className="text-[20px] ..." />
          const regex2 = new RegExp(`<${lucide}\\s+size=\\{(\\d+)\\}\\s+className=(['"])(.*?)(['"])\\s*\\/?>`, 'g');
          content = content.replace(regex2, `<MaterialIcon name="${material}" className="text-[$1px] $3" />`);
          
          // e.g. <Save size={20} color="..." /> -> <MaterialIcon name="save" className="text-[20px]" style={{ color: '...' }} />
          const regex3 = new RegExp(`<${lucide}\\s+size=\\{(\\d+)\\}\\s+color=(['"])(.*?)(['"])\\s*\\/?>`, 'g');
          content = content.replace(regex3, `<MaterialIcon name="${material}" className="text-[$1px]" style={{ color: '$3' }} />`);

          // Plain usage like <Save />
          const regex4 = new RegExp(`<${lucide}\\s*\\/?>`, 'g');
          content = content.replace(regex4, `<MaterialIcon name="${material}" className="text-base" />`);
          
          // Fallback catch-all for any other props: it might leave invalid props on MaterialIcon but usually icons don't have many props
          const regex5 = new RegExp(`<${lucide}\\b([^>]*)>`, 'g');
          content = content.replace(regex5, (match, props) => {
            let newProps = props.replace(/size=\{[^\}]+\}/, '');
            newProps = newProps.replace(/size=['"][^'"]+['"]/, '');
            return `<MaterialIcon name="${material}" ${newProps}>`;
          });
        } else {
          console.log(`Mapping not found for ${item.original} in ${file}`);
        }
      });

      fs.writeFileSync(filePath, content);
      console.log(`Replaced in ${file}`);
    }
  }
});

console.log('Modals processing complete (Pass 2).');
