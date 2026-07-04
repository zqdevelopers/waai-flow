import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Phone, 
  GitBranch, 
  Bot, 
  Play, 
  MessageSquare, 
  MessagesSquare, 
  Megaphone, 
  Webhook, 
  Code2, 
  Cpu, 
  Puzzle, 
  Folder, 
  BarChart2,
  Settings,
  Globe,
  FileText,
  Search,
  Bell,
  Moon,
  Sun,
  LogOut,
  ChevronDown,
  X,
  Menu,
  BotMessageSquare
} from 'lucide-react';
import { useAuth } from '../auth';
import { useTheme } from '../theme';

const SidebarItem = ({ icon: Icon, label, to, active, badge }) => {
  return (
    <Link 
      to={to} 
      className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors group ${
        active 
          ? 'bg-primary text-white shadow-lg shadow-primary/20' 
          : 'text-slate-400 hover:bg-surface-hover hover:text-slate-200'
      }`}
    >
      <div className="flex items-center space-x-3">
        <Icon size={18} className={active ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'} />
        <span className="text-sm font-medium">{label}</span>
      </div>
      {badge && (
        <span className="bg-success text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </Link>
  );
};

const Sidebar = () => {
  const location = useLocation();
  const path = location.pathname;

  return (
    <div className="w-[260px] bg-surface border-r border-border h-screen flex flex-col shrink-0">
      <div className="h-16 flex items-center px-4 border-b border-border">
        <div className="flex items-center space-x-2 text-primary">
          <div className="bg-primary p-1.5 rounded-lg shadow-lg shadow-primary/20">
            <BotMessageSquare size={20} className="text-white" />
          </div>
          <span className="text-lg font-bold text-white tracking-wide">WAAI Flow</span>
        </div>
        <button className="ml-auto text-slate-400 hover:text-white">
          <Menu size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        {/* Main Menu */}
        <div className="space-y-1">
          <SidebarItem icon={LayoutDashboard} label="Dashboard" to="/" active={path === '/'} />
          <SidebarItem icon={Phone} label="WhatsApp Sessions" to="/sessions" active={path === '/sessions'} badge="1" />
          <SidebarItem icon={GitBranch} label="Flow Builder" to="/flows" active={path === '/flows'} />
          <SidebarItem icon={Bot} label="AI Agents" to="/agents" active={path === '/agents'} />
          <SidebarItem icon={Play} label="Executions" to="/executions" active={path === '/executions'} />
          <SidebarItem icon={MessageSquare} label="Conversations" to="/conversations" active={path === '/conversations'} />
          <SidebarItem icon={MessagesSquare} label="Messages" to="/messages" active={path === '/messages'} />
          <SidebarItem icon={Megaphone} label="Broadcast" to="/broadcast" active={path === '/broadcast'} />
          <SidebarItem icon={Webhook} label="Webhooks" to="/webhooks" active={path === '/webhooks'} />
          <SidebarItem icon={Code2} label="REST API" to="/api" active={path === '/api'} />
          <SidebarItem icon={Cpu} label="AI Providers" to="/ai-providers" active={path === '/ai-providers'} />
          <SidebarItem icon={Puzzle} label="Plugins" to="/plugins" active={path === '/plugins'} />
          <SidebarItem icon={Folder} label="Files" to="/files" active={path === '/files'} />
          <SidebarItem icon={BarChart2} label="Analytics" to="/analytics" active={path === '/analytics'} />
        </div>

        {/* System Menu */}
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-3">System</div>
          <div className="space-y-1">
            <SidebarItem icon={Settings} label="Settings" to="/settings" active={path === '/settings'} />
            <SidebarItem icon={Globe} label="Environment" to="/env" active={path === '/env'} />
            <SidebarItem icon={FileText} label="Logs" to="/logs" active={path === '/logs'} />
          </div>
        </div>
      </div>

      {/* Bottom Status Card */}
      <div className="p-4 border-t border-border mt-auto">
        <div className="bg-background border border-border rounded-xl p-3 relative group cursor-pointer hover:border-slate-700 transition">
          <button className="absolute right-2 top-2 text-slate-500 hover:text-slate-300">
            <X size={14} />
          </button>
          <div className="flex items-center space-x-3">
            <div className="w-2.5 h-2.5 rounded-full bg-success ring-4 ring-success/20 animate-pulse"></div>
          <div>
              <div className="text-xs font-semibold text-white">ZQ Developers</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Support: +923144916432</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Topbar = () => {
  const auth = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="h-16 bg-surface border-b border-border flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search anything..." 
            className="bg-background border border-border text-sm text-slate-200 rounded-lg pl-9 pr-12 py-2 w-72 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition placeholder:text-slate-500"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-1">
            <kbd className="bg-surface text-slate-400 text-[10px] font-mono px-1.5 py-0.5 rounded border border-border">⌘</kbd>
            <kbd className="bg-surface text-slate-400 text-[10px] font-mono px-1.5 py-0.5 rounded border border-border">K</kbd>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-5">
        <div className="flex items-center space-x-2 cursor-pointer group">
          <div className="w-2 h-2 rounded-full bg-success"></div>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-slate-200 group-hover:text-white transition">WhatsApp Ready</span>
            <span className="text-[10px] text-slate-500">Live workspace</span>
          </div>
          <ChevronDown size={14} className="text-slate-500 group-hover:text-slate-300 ml-1" />
        </div>

        <div className="h-5 w-px bg-border"></div>

        <button className="relative text-slate-400 hover:text-white transition">
          <Bell size={18} />
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-primary text-[9px] font-bold text-white flex items-center justify-center rounded-full border border-surface">
            3
          </span>
        </button>

        <button onClick={toggleTheme} className="text-slate-400 hover:text-white transition" title="Toggle theme">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div className="h-5 w-px bg-border"></div>

        <div className="flex items-center space-x-3 cursor-pointer group">
          <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center overflow-hidden">
            <img src="https://api.dicebear.com/7.x/notionists/svg?seed=Admin&backgroundColor=transparent" alt="Admin" className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col hidden sm:flex">
            <span className="text-xs font-medium text-white">Admin</span>
            <span className="text-[10px] text-slate-400">{auth.user?.username || 'Owner'}</span>
          </div>
          <button onClick={auth.logout} className="text-slate-500 group-hover:text-slate-300" title="Sign out">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

const Layout = ({ children }) => {
  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden relative custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
