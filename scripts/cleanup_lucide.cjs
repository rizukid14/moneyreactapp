const fs = require('fs');
const path = require('path');

const filesToProcess = [
  'c:/Users/user.test/OneDrive/Documents/Naufal/Pribadi/code/moneyreactapp/src/pages/Statistics.tsx',
  'c:/Users/user.test/OneDrive/Documents/Naufal/Pribadi/code/moneyreactapp/src/pages/Settings.tsx',
  'c:/Users/user.test/OneDrive/Documents/Naufal/Pribadi/code/moneyreactapp/src/pages/ReceiptScanner.tsx',
  'c:/Users/user.test/OneDrive/Documents/Naufal/Pribadi/code/moneyreactapp/src/pages/BulkInput.tsx'
];

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
  'ArrowDownLeft': 'call_received',
  'Flame': 'whatshot',
  'Heart': 'favorite',
  'ShieldCheck': 'verified_user',
  'LayoutDashboard': 'dashboard',
  'UploadCloud': 'cloud_upload',
  'DownloadCloud': 'cloud_download',
  'Database': 'storage',
  'Trash': 'delete',
  'CheckSquare': 'check_box',
  'Palette': 'palette',
  'MessageSquare': 'chat_bubble',
  'Share': 'share',
  'Gift': 'card_giftcard',
  'Menu': 'menu'
};

filesToProcess.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Extract lucide imports to find what aliases they use (if any)
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

      // Add MaterialIcon import if missing
      if (!content.includes('import MaterialIcon')) {
        const lastImportIndex = content.lastIndexOf('import ');
        if (lastImportIndex !== -1) {
          const endOfLine = content.indexOf('\n', lastImportIndex);
          content = content.slice(0, endOfLine + 1) + "import MaterialIcon from '../components/common/MaterialIcon';\n" + content.slice(endOfLine + 1);
        } else {
          content = "import MaterialIcon from '../components/common/MaterialIcon';\n" + content;
        }
      }

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
        } else {
          console.log(`Mapping not found for ${item.original} in ${filePath}`);
        }
      });

      // Cleanup style and color in MaterialIcon
      content = content.replace(/(<MaterialIcon\s+[^>]*?)\s+color=(['"][^'"]+['"]|\{[^}]+\})/g, '$1');
      content = content.replace(/(<MaterialIcon\s+[^>]*?)\s+style=\{\{[^}]+\}\}/g, '$1');

      fs.writeFileSync(filePath, content);
      console.log(`Replaced icons in ${path.basename(filePath)}`);
    } else {
      console.log(`No lucide-react imports found in ${path.basename(filePath)}`);
    }
  }
});

console.log('Cleanup complete.');
