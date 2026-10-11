import React from 'react';
import { Button } from '@/components/ui/button';
import {
  IconPlus,
  IconBriefcase,
  IconUsers,
} from '@tabler/icons-react';

export interface SidebarProps {
  activeTab: 'scheduled' | 'sent' | 'candidates';
  onTabChange: (tab: 'scheduled' | 'sent' | 'candidates') => void;
  onOpenCompose: () => void;
  scheduledCount?: number;
  sentCount?: number;
  candidatesCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  onOpenCompose,
}) => {
  return (
    <aside className="w-64 border-r border-border/70 p-4 flex flex-col justify-between shrink-0 bg-sidebar select-none">
      <div className="space-y-4">
        {/* Create new Job Action Button */}
        <Button
          onClick={onOpenCompose}
          className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-heading font-semibold shadow-md flex items-center justify-center gap-2 text-sm transition-all cursor-pointer"
        >
          <IconPlus className="h-4 w-4 stroke-[2.5]" />
          <span>Create new Job</span>
        </Button>

        {/* Navigation Tabs */}
        <nav className="space-y-1.5 pt-2">
          <div className="pl-1 pb-2 pt-2 text-xs font-semibold text-muted-foreground">
            RECRUITMENT
          </div>


          {/* Jobs Tab */}
          <button
            onClick={() => onTabChange('sent')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'sent'
                ? 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-xs'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground border border-transparent'
            }`}
          >
            <div className="flex items-center gap-3">
              <IconBriefcase
                className={`h-4.5 w-4.5 ${
                  activeTab === 'sent'
                    ? 'text-emerald-600 dark:text-emerald-400 stroke-[2]'
                    : 'text-muted-foreground'
                }`}
              />
              <span>Jobs</span>
            </div>
          </button>

          {/* Candidates Tab */}
          <button
            onClick={() => onTabChange('candidates')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'candidates'
                ? 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-xs'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground border border-transparent'
            }`}
          >
            <div className="flex items-center gap-3">
              <IconUsers
                className={`h-4.5 w-4.5 ${
                  activeTab === 'candidates'
                    ? 'text-emerald-600 dark:text-emerald-400 stroke-[2]'
                    : 'text-muted-foreground'
                }`}
              />
              <span>Candidates</span>
            </div>
          </button>
        </nav>
      </div>
    </aside>
  );
};
