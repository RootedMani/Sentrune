import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { WorkstationProvider, useWorkstation } from './context/WorkstationContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { TabsNav } from './components/TabsNav';
import { NewsTable } from './components/NewsTable';
import { PriceChart } from './components/PriceChart';
import { TechnicalAnalysis } from './components/TechnicalAnalysis';
import { AiPredictionsView } from './components/AiPredictionsView';
import { SentimentPulse } from './components/SentimentPulse';
import { SocialPulse } from './components/SocialPulse';
import { MarketOverview } from './components/MarketOverview';
import { AlertsView } from './components/AlertsView';
import { SettingsView } from './components/SettingsView';
import { NewsletterAlertsModal } from './components/NewsletterAlertsModal';
import { AccountModal } from './components/AccountModal';
import { SettingsModal } from './components/SettingsModal';
import { ErrorBoundary } from './components/ErrorBoundary';

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
      {/* Left Sidebar */}
      <Sidebar />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header */}
        <Header />

        {/* Tab Navigation */}
        <TabsNav />

        {/* Active Tab Viewport with Error Boundary */}
        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-gradient-to-b dark:from-[#060e1a] dark:to-[#040810] transition-colors">
          <ErrorBoundary fallbackTitle="Tab Content View">
            {activeTab === 'news' && <NewsTable />}
            {activeTab === 'price' && <PriceChart />}
            {activeTab === 'technical' && <TechnicalAnalysis />}
            {activeTab === 'predictions' && <AiPredictionsView />}
            {activeTab === 'sentiment' && <SentimentPulse />}
            {activeTab === 'social' && <SocialPulse />}
            {activeTab === 'overview' && <MarketOverview />}
            {activeTab === 'alerts' && <AlertsView />}
            {activeTab === 'settings' && <SettingsView />}
          </ErrorBoundary>
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
    <ErrorBoundary fallbackTitle="Sentrune Workstation Shell">
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <WorkstationProvider>
              <WorkstationMain />
            </WorkstationProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
