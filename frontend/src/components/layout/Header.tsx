import React from 'react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useClickOutside } from '@/hooks/use-click-outside';
import type { User } from '@/lib/api';
import {
  IconChevronDown,
  IconLogout,
} from '@tabler/icons-react';

export interface HeaderProps {
  user: User;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  onRefresh?: () => void;
  slackStatus?: any;
  onConnectSlack?: () => void;
  onDisconnectSlack?: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onLogout,
}) => {
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const userMenuRef = useClickOutside<HTMLDivElement>(() => setUserMenuOpen(false));

  return (
    <header className="h-16 border-b border-border/80 px-6 flex items-center justify-between bg-card shrink-0 select-none z-30">
      {/* Left: Brand / App Identifier */}
      <div className="flex items-center gap-8">
        <div className="flex items-center">
          <span className="font-heading font-black text-xl md:text-2xl tracking-tight text-foreground select-none">
            HireLens AI
          </span>
        </div>
      </div>

      {/* Right: Theme Switcher + Profile Dropdown */}
      <div className="flex items-center gap-3">
        {/* Theme Switcher Toggle */}
        <ThemeToggle />

        {/* User Profile Dropdown */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2.5 p-1 rounded-full hover:bg-muted/70 transition-colors text-left focus:outline-none cursor-pointer"
          >
            <img
              src="https://api.dicebear.com/10.x/squircles/svg?seed=Felix"
              alt={user.name || 'User'}
              className="h-9 w-9 rounded-full object-cover border border-border shadow-2xs"
            />
            <div className="hidden md:block pr-1">
              <div className="text-sm font-bold leading-tight text-foreground">
                {user.name || 'Recruiter'}
              </div>
              <div className="text-xs text-muted-foreground leading-tight">
                {user.email}
              </div>
            </div>
            <IconChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>

          {/* Profile Dropdown Menu */}
          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-card p-2 shadow-xl z-50 animate-in fade-in-50 zoom-in-95 duration-100">
              <div className="px-3 py-2 border-b border-border/60">
                <p className="text-sm font-bold text-foreground">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>

              <div className="pt-1.5">
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-destructive/10 text-destructive transition-colors cursor-pointer"
                >
                  <IconLogout className="h-4.5 w-4.5" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
