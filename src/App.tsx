import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { WorkstationProvider, useWorkstation } from './context/WorkstationContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { TabsNav } from './components/TabsNav';
import { NewsTable } from './components/NewsTable';
import { PriceChart } from './components/PriceChart';
import { TechnicalAnalysis } from './components/TechnicalAnalysis';
import { SentimentPulse } from './components/SentimentPulse';
import { SocialPulse } from './components/SocialPulse';
import { MarketOverview } from './components/MarketOverview';
import { AlertsView } from './components/AlertsView';
import { NewsletterAlertsModal } from './components/NewsletterAlertsModal';
import { AccountModal } from './components/AccountModal';
import { SettingsModal } from './components/SettingsModal';

const WorkstationMain: React.FC = () => {
  const { activeTab, language, theme } = useWorkstation();

  const isRtl = language === 'fa';
  const isLight = theme === 'light';

  return (
    <div 
      dir={isRtl ? 'rtl' : 'ltr'}
      className={`min-h-screen flex flex-col md:flex-row font-sans transition-colors duration-200 ${
        isLight 
          ? 'bg-slate-100 text-slate-900' 
          : 'bg-[#050b14] text-slate-100'
      }`}
    >
      {/* Left Sidebar matching screenshot */}
      <Sidebar />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header */}
        <Header />

        {/* Tab Navigation */}
        <TabsNav />

        {/* Active Tab Viewport */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-b from-[#060e1a] to-[#040810]">
          {activeTab === 'news' && <NewsTable />}
          {activeTab === 'price' && <PriceChart />}
          {activeTab === 'technical' && <TechnicalAnalysis />}
          {activeTab === 'sentiment' && <SentimentPulse />}
          {activeTab === 'social' && <SocialPulse />}
          {activeTab === 'overview' && <MarketOverview />}
          {activeTab === 'alerts' && <AlertsView />}
          {activeTab === 'settings' && <NewsTable />}
        </main>
      </div>

      {/* Global Modals */}
      <NewsletterAlertsModal />
      <AccountModal />
      <SettingsModal />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <WorkstationProvider>
        <WorkstationMain />
      </WorkstationProvider>
    </AuthProvider>
  );
}
