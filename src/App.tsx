/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { NavTab, ChatMessage } from './types';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ChatView } from './components/ChatView';
import { PresentationView } from './components/PresentationView';
import { CodeGenView } from './components/CodeGenView';
import { BugFixerView } from './components/BugFixerView';
import { ImageGenView } from './components/ImageGenView';
import { MusicGenView } from './components/MusicGenView';
import { HistoryView } from './components/HistoryView';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { VoiceModal } from './components/VoiceModal';
import { StorageService } from './utils/storage';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab') as NavTab;
    const validTabs: NavTab[] = ['chat', 'presentation', 'code', 'bugfix', 'image', 'music', 'history'];
    return validTabs.includes(tabParam) ? tabParam : 'chat';
  });

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPwaBannerExplicit, setShowPwaBannerExplicit] = useState(false);
  const [isGlobalVoiceModalOpen, setIsGlobalVoiceModalOpen] = useState(false);

  // Register PWA Service Worker & capture beforeinstallprompt
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV !== 'development') {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch((err) => {
          console.warn('Service worker registration failed:', err);
        });
      });
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  // Update URL search query on tab change
  const handleSelectTab = (tab: NavTab) => {
    setCurrentTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.replaceState({}, '', url.toString());
  };

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      setShowPwaBannerExplicit(true);
    }
  };

  const handleSaveVoiceTranscriptGlobal = (voiceMessages: ChatMessage[]) => {
    const existing = StorageService.getChatMessages();
    const updated = [...existing, ...voiceMessages];
    StorageService.saveChatMessages(updated);
  };

  return (
    <div id="farhee-app-container" className="flex h-screen w-screen overflow-hidden bg-[#0B0D0E] text-neutral-100 bg-grid-pattern selection:bg-[#10B981] selection:text-black">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        onTriggerInstall={handleInstallPWA}
        onLaunchVoiceCall={() => setIsGlobalVoiceModalOpen(true)}
        canInstallPWA={Boolean(deferredPrompt)}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        {/* Top Header */}
        <Header
          currentTab={currentTab}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onTriggerInstall={handleInstallPWA}
          onLaunchVoiceCall={() => setIsGlobalVoiceModalOpen(true)}
          canInstall={Boolean(deferredPrompt)}
        />

        {/* Dynamic View Router */}
        <div className="flex-1 overflow-hidden relative">
          {currentTab === 'chat' && <ChatView onNavigateToCode={(p) => handleSelectTab('code')} onNavigateToBugFix={() => handleSelectTab('bugfix')} />}
          {currentTab === 'presentation' && <PresentationView />}
          {currentTab === 'code' && <CodeGenView />}
          {currentTab === 'bugfix' && <BugFixerView />}
          {currentTab === 'image' && <ImageGenView />}
          {currentTab === 'music' && <MusicGenView />}
          {currentTab === 'history' && <HistoryView onNavigateToTab={handleSelectTab} />}
        </div>
      </main>

      {/* Global Voice Conversation Mode Modal */}
      <VoiceModal
        isOpen={isGlobalVoiceModalOpen}
        onClose={() => setIsGlobalVoiceModalOpen(false)}
        onSaveTranscriptToChat={handleSaveVoiceTranscriptGlobal}
      />

      {/* Floating PWA Install Prompt Banner */}
      <PWAInstallBanner
        onInstallClicked={handleInstallPWA}
        deferredPrompt={deferredPrompt}
        isOpenExplicitly={showPwaBannerExplicit}
        onCloseExplicit={() => setShowPwaBannerExplicit(false)}
      />
    </div>
  );
}
