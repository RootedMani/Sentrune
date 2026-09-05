import React from 'react';
import { 
  LineChart, 
  Activity, 
  HeartHandshake, 
  Newspaper, 
  MessageSquare, 
  Briefcase, 
  BellRing, 
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useWorkstation } from '../context/WorkstationContext';
import { TRANSLATIONS } from '../data/translations';

export const TabsNav: React.FC = () => {
  const { activeTab, setActiveTab, language } = useWorkstation();
  const t = TRANSLATIONS[language];

  const tabs = [
    { id: 'news', label: t.tabNews, icon: Newspaper },
    { id: 'price', label: t.tabPriceHistory, icon: LineChart },
    { id: 'technical', label: t.tabTechnical, icon: Activity },
    { id: 'sentiment', label: t.tabSentiment, icon: HeartHandshake },
    { id: 'social', label: t.tabCommunity, icon: MessageSquare },
    { id: 'overview', label: t.tabStrategy, icon: Briefcase },
    { id: 'alerts', label: t.tabAlerts, icon: BellRing },
    { id: 'settings', label: t.tabSettings, icon: SlidersHorizontal },
  ];

  return (
    <nav 
      id="sentrune-tabs-nav"
      className="bg-[#060e1a] border-b border-slate-800/80 px-3 py-2 flex items-center gap-1.5 overflow-x-auto select-none"
    >
      <div className="flex items-center gap-1.5 min-w-max">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              id={`tab-button-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950/40 ring-1 ring-cyan-400/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#0c1a2d]'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
