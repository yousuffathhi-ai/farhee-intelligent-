import React, { useState, useEffect } from 'react';
import { 
  History, 
  Search, 
  Trash2, 
  MessageSquare, 
  Presentation,
  Code, 
  Bug, 
  Image as ImageIcon, 
  Music, 
  Copy, 
  Check, 
  Download, 
  ExternalLink,
  Filter,
  Sparkles,
  Cloud,
  CloudCheck,
  RefreshCw
} from 'lucide-react';
import { HistoryItem, NavTab } from '../types';
import { StorageService } from '../utils/storage';
import { auth, CloudStoreService } from '../utils/firebase';
import { User } from 'firebase/auth';

interface HistoryViewProps {
  onNavigateToTab: (tab: NavTab) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ onNavigateToTab }) => {
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);
  const [cloudSessions, setCloudSessions] = useState<any[]>([]);
  const [isLoadingCloud, setIsLoadingCloud] = useState(false);

  useEffect(() => {
    setHistoryItems(StorageService.getHistory());
  }, []);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      setCurrentUser(u);
      if (u) {
        setIsLoadingCloud(true);
        try {
          const sessions = await CloudStoreService.loadUserChatSessions(u.uid);
          setCloudSessions(sessions);
        } catch (e) {
          console.error(e);
        } finally {
          setIsLoadingCloud(false);
        }
      } else {
        setCloudSessions([]);
      }
    });

    return () => unsub();
  }, []);

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all stored history and creations?')) {
      StorageService.clearAllHistory();
      setHistoryItems([]);
    }
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = historyItems.filter((item) => {
    const matchesFilter = filterType === 'all' || item.type === filterType;
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.previewText.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getIconForType = (type: string) => {
    switch (type) {
      case 'chat': return <MessageSquare className="w-4 h-4 text-[#10B981]" />;
      case 'presentation': return <Presentation className="w-4 h-4 text-[#CCFF00]" />;
      case 'code': return <Code className="w-4 h-4 text-[#10B981]" />;
      case 'bugfix': return <Bug className="w-4 h-4 text-amber-400" />;
      case 'image': return <ImageIcon className="w-4 h-4 text-cyan-400" />;
      case 'music': return <Music className="w-4 h-4 text-teal-400" />;
      default: return <Sparkles className="w-4 h-4 text-neutral-400" />;
    }
  };

  return (
    <div id="farhee-history-view" className="flex flex-col h-[calc(100vh-4rem)] bg-[#0B0D0E] overflow-y-auto">
      {/* Control bar */}
      <div className="p-4 lg:p-6 border-b border-[#1A2227] bg-[#0E1317]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-200">
                <History className="w-4 h-4 text-[#10B981]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
                  Farhee Vault & Cloud Synchronization
                  {currentUser && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#10B981]/20 text-[#CCFF00] border border-[#10B981]/30">
                      Cloud Sync Active
                    </span>
                  )}
                </h3>
                <p className="text-xs text-neutral-400">
                  {currentUser
                    ? `Logged in as ${currentUser.email} • Synced to Google Cloud Firestore`
                    : 'All creations cached locally. Sign in with Google at top right to sync across devices.'}
                </p>
              </div>
            </div>

            <button
              onClick={handleClearAll}
              disabled={historyItems.length === 0}
              className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-40"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          </div>

          {/* Search and Category Filters */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search history by title, presentation topic or keyword..."
                className="w-full pl-10 pr-4 py-2.5 bg-[#12171B] border border-[#202B32] focus:border-[#10B981] rounded-xl text-xs text-neutral-100 placeholder:text-neutral-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {['all', 'presentation', 'code', 'bugfix', 'image', 'music'].map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-2 rounded-xl text-xs font-mono uppercase font-semibold transition-all border whitespace-nowrap ${
                    filterType === type
                      ? 'bg-[#10B981]/20 border-[#10B981] text-[#CCFF00]'
                      : 'bg-[#141A1E] border-[#222C33] text-neutral-400 hover:text-white'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* History Items Grid */}
      <div className="flex-1 p-4 lg:p-6 max-w-6xl w-full mx-auto space-y-4">
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-[#0E1317] border border-[#1E272D] hover:border-[#10B981]/40 transition-all flex flex-col justify-between space-y-3 shadow-lg"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#141A1E] border border-[#222C33] flex items-center justify-center">
                        {getIconForType(item.type)}
                      </div>
                      <span className="text-xs font-bold text-neutral-200">{item.title}</span>
                    </div>
                    <span className="text-[10px] font-mono text-neutral-400">{item.timestamp}</span>
                  </div>

                  <p className="text-xs text-neutral-400 line-clamp-3 leading-relaxed">
                    {item.previewText}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#182126]">
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#141A1E] text-neutral-400 border border-[#222C33]">
                    {item.type}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyText(JSON.stringify(item.data, null, 2), item.id)}
                      className="text-xs text-neutral-400 hover:text-white flex items-center gap-1"
                    >
                      {copiedId === item.id ? (
                        <>
                          <Check className="w-3 h-3 text-[#CCFF00]" />
                          <span className="text-[#CCFF00]">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-[#10B981]" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => onNavigateToTab(item.type as NavTab)}
                      className="text-xs text-[#10B981] hover:text-[#CCFF00] font-semibold flex items-center gap-1"
                    >
                      <span>Open Tool</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl bg-[#0E1317]/50 border border-dashed border-[#1E272D] space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-400">
              <History className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-white font-display">No History Records Found</h3>
            <p className="text-xs text-neutral-400 max-w-sm">
              Any presentation decks, code snippets, bugs analyzed, images generated, or audio synthesized will appear here automatically with cloud persistence.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
