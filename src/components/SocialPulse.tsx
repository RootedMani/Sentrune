import React, { useState, useMemo } from 'react';
import { 
  MessageSquare, 
  ThumbsUp, 
  Share2, 
  ExternalLink, 
  Sparkles, 
  Database,
  Send,
  TrendingUp,
  TrendingDown,
  Repeat2,
  Bookmark,
  CheckCircle2,
  Filter,
  Flame,
  UserCheck,
  Hash,
  Smile,
  Image as ImageIcon,
  BarChart2
} from 'lucide-react';
import { useWorkstation } from '../context/WorkstationContext';
import { INITIAL_DISCUSSIONS } from '../data/mockMarketData';
import { MarketCacheService } from '../services/marketCache';

interface SocialComment {
  id: string;
  author: string;
  handle: string;
  content: string;
  time: string;
}

export const SocialPulse: React.FC = () => {
  const { selectedAsset, theme, socialItems, addSocialPost, upvoteSocialPost } = useWorkstation();

  // Composer state
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostSentiment, setNewPostSentiment] = useState<'bullish' | 'bearish' | 'neutral'>('bullish');
  const [newPostAsset, setNewPostAsset] = useState(selectedAsset.symbol);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);

  // Filter state
  const [assetFilter, setAssetFilter] = useState<'current' | 'all'>('all');
  const [sentimentFilter, setSentimentFilter] = useState<'all' | 'bullish' | 'bearish'>('all');
  const [platformFilter, setPlatformFilter] = useState<'all' | 'x' | 'reddit' | 'discord'>('all');
  const [activeSort, setActiveSort] = useState<'trending' | 'latest' | 'top'>('trending');

  // Expanded reply drawers
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [localReplies, setLocalReplies] = useState<Record<string, SocialComment[]>>({
    'disc-1': [
      { id: 'rep-1', author: 'QuantNinja', handle: '@quant_ninja', content: 'Agreed, funding rates are completely normalized right now.', time: '12m ago' },
      { id: 'rep-2', author: 'MacroSam', handle: '@macrosam', content: 'Watching the $68,500 reclaim level closely.', time: '5m ago' }
    ]
  });

  // Interactive Poll state
  const [pollVoted, setPollVoted] = useState<string | null>(null);
  const [pollVotes, setPollVotes] = useState({ bull: 74, bear: 26 });

  const isLight = theme === 'light';

  // Combine discussions from context / cache / initial
  const allDiscussions = useMemo(() => {
    // If socialItems exists in context and has items, use it
    if (socialItems && socialItems.length > 0) {
      return socialItems;
    }
    return MarketCacheService.getDiscussions();
  }, [socialItems]);

  // Filtered discussions list
  const filteredDiscussions = useMemo(() => {
    return allDiscussions.filter((disc: any) => {
      // Asset filter
      if (assetFilter === 'current' && disc.asset !== selectedAsset.symbol) {
        return false;
      }
      // Sentiment filter
      if (sentimentFilter !== 'all' && disc.sentiment !== sentimentFilter) {
        return false;
      }
      // Platform filter
      if (platformFilter === 'x' && !disc.platform.toLowerCase().includes('twitter') && !disc.platform.toLowerCase().includes('x')) {
        return false;
      }
      if (platformFilter === 'reddit' && !disc.platform.toLowerCase().includes('reddit')) {
        return false;
      }
      if (platformFilter === 'discord' && !disc.platform.toLowerCase().includes('discord') && !disc.platform.toLowerCase().includes('alpha')) {
        return false;
      }
      return true;
    }).sort((a: any, b: any) => {
      if (activeSort === 'top') {
        return (b.upvotes || 0) - (a.upvotes || 0);
      }
      // Trending or latest
      return 0;
    });
  }, [allDiscussions, assetFilter, sentimentFilter, platformFilter, activeSort, selectedAsset.symbol]);

  // Handle post submit
  const handlePublishPost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim()) return;

    setIsSubmitting(true);
    const newPost = {
      author: 'You (Trader)',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      handle: '@pro_trader',
      platform: 'Alpha Room',
      time: 'Just now',
      sentiment: newPostSentiment,
      content: newPostContent.trim(),
      upvotes: 1,
      asset: newPostAsset || selectedAsset.symbol,
      replies: 0
    };

    if (addSocialPost) {
      addSocialPost(newPost);
    } else {
      MarketCacheService.addDiscussion(newPost);
    }

    setNewPostContent('');
    setIsSubmitting(false);
  };

  // Handle upvote
  const handleUpvote = (id: string) => {
    if (upvoteSocialPost) {
      upvoteSocialPost(id);
    } else {
      MarketCacheService.upvoteDiscussion(id);
    }
  };

  // Handle copy share link
  const handleCopyLink = (id: string) => {
    setCopiedPostId(id);
    setTimeout(() => setCopiedPostId(null), 2000);
  };

  // Handle submit reply
  const handleSendReply = (postId: string) => {
    const text = replyInputs[postId];
    if (!text || !text.trim()) return;

    const newReply: SocialComment = {
      id: `rep-${Date.now()}`,
      author: 'You (Trader)',
      handle: '@pro_trader',
      content: text.trim(),
      time: 'Just now'
    };

    setLocalReplies(prev => ({
      ...prev,
      [postId]: [...(prev[postId] || []), newReply]
    }));

    setReplyInputs(prev => ({ ...prev, [postId]: '' }));
  };

  // Handle poll vote
  const handlePollVote = (choice: 'bull' | 'bear') => {
    if (pollVoted) return;
    setPollVoted(choice);
    if (choice === 'bull') {
      setPollVotes(prev => ({ ...prev, bull: prev.bull + 1 }));
    } else {
      setPollVotes(prev => ({ ...prev, bear: prev.bear + 1 }));
    }
  };

  return (
    <div id="community-social-view" className="space-y-4 p-4">
      {/* Top Banner */}
      <div className="bg-white dark:bg-[#081322] p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm transition-colors">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-cyan-500" />
            Social Pulse & Verified Trader Community
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time chatter aggregated across Twitter/X, Reddit r/wsb, and exclusive quant trading alpha desks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800/60 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            {filteredDiscussions.length} Active Feeds
          </span>
        </div>
      </div>

      {/* Main Grid: Feed on Left (2/3), Social Sidebar on Right (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* LEFT 2 COLUMNS: Post Composer + Feed Filter + Post List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Post Creation Composer */}
          <div className="bg-white dark:bg-[#07111e] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
              <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
              <span>Share Market Insight / Alpha Post</span>
            </div>

            <form onSubmit={handlePublishPost} className="space-y-3">
              <textarea
                value={newPostContent}
                onChange={e => setNewPostContent(e.target.value)}
                placeholder={`What's your trade setup or sentiment on $${selectedAsset.symbol}? Share levels, catalysts, or charts...`}
                rows={3}
                className="w-full p-3 rounded-lg bg-slate-50 dark:bg-[#040810] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500 resize-none"
              />

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                {/* Asset Tag & Sentiment Selector */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Asset Tag */}
                  <select
                    value={newPostAsset}
                    onChange={e => setNewPostAsset(e.target.value)}
                    className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2 py-1 text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400 cursor-pointer"
                  >
                    <option value={selectedAsset.symbol}>${selectedAsset.symbol} (Selected)</option>
                    <option value="BTC">$BTC</option>
                    <option value="ETH">$ETH</option>
                    <option value="SOL">$SOL</option>
                    <option value="NVDA">$NVDA</option>
                    <option value="AAPL">$AAPL</option>
                  </select>

                  {/* Sentiment Pills */}
                  <div className="flex items-center bg-slate-100 dark:bg-slate-900 rounded p-0.5 border border-slate-200 dark:border-slate-800 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setNewPostSentiment('bullish')}
                      className={`px-2 py-0.5 rounded font-semibold transition-all cursor-pointer ${
                        newPostSentiment === 'bullish'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      🚀 Bullish
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewPostSentiment('neutral')}
                      className={`px-2 py-0.5 rounded font-semibold transition-all cursor-pointer ${
                        newPostSentiment === 'neutral'
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      ⚖️ Neutral
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewPostSentiment('bearish')}
                      className={`px-2 py-0.5 rounded font-semibold transition-all cursor-pointer ${
                        newPostSentiment === 'bearish'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      🐻 Bearish
                    </button>
                  </div>
                </div>

                {/* Publish Button */}
                <button
                  type="submit"
                  disabled={!newPostContent.trim() || isSubmitting}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white font-semibold text-xs shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <Send className="w-3 h-3" />
                  <span>Publish Alpha</span>
                </button>
              </div>
            </form>
          </div>

          {/* Social Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-white dark:bg-[#07111e] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors text-xs">
            {/* Asset Scope Pill: Current Asset vs All Assets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <div className="flex items-center bg-slate-100 dark:bg-slate-900 rounded-lg p-0.5 border border-slate-200 dark:border-slate-800 font-semibold text-[11px]">
                <button
                  onClick={() => setAssetFilter('all')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    assetFilter === 'all'
                      ? 'bg-cyan-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  All Assets ({allDiscussions.length})
                </button>
                <button
                  onClick={() => setAssetFilter('current')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    assetFilter === 'current'
                      ? 'bg-cyan-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  ${selectedAsset.symbol} Only
                </button>
              </div>

              {/* Platform Pills */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-900 rounded-lg p-0.5 border border-slate-200 dark:border-slate-800 font-semibold text-[11px]">
                {(['all', 'x', 'reddit', 'discord'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setPlatformFilter(p)}
                    className={`px-2 py-1 rounded-md uppercase transition-all cursor-pointer ${
                      platformFilter === p
                        ? 'bg-slate-300 dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    {p === 'x' ? '𝕏 Twitter' : p}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort Toggle */}
            <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="hidden sm:inline">Sort:</span>
              <button
                onClick={() => setActiveSort('trending')}
                className={`font-semibold cursor-pointer ${activeSort === 'trending' ? 'text-cyan-600 dark:text-cyan-400 underline' : 'hover:text-slate-800 dark:hover:text-slate-200'}`}
              >
                Hot
              </button>
              <span>•</span>
              <button
                onClick={() => setActiveSort('top')}
                className={`font-semibold cursor-pointer ${activeSort === 'top' ? 'text-cyan-600 dark:text-cyan-400 underline' : 'hover:text-slate-800 dark:hover:text-slate-200'}`}
              >
                Top Upvoted
              </button>
            </div>
          </div>

          {/* Social Post Stream */}
          <div className="space-y-3">
            {filteredDiscussions.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-[#07111e] rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <MessageSquare className="w-8 h-8 text-slate-400 mx-auto" />
                <div className="text-sm font-bold text-slate-800 dark:text-slate-200">No posts match this filter</div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Switch to "All Assets" or post the first market analysis using the composer above!
                </p>
                <button
                  onClick={() => { setAssetFilter('all'); setSentimentFilter('all'); setPlatformFilter('all'); }}
                  className="mt-2 px-3 py-1 rounded bg-cyan-600 text-white text-xs font-semibold"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              filteredDiscussions.map((disc: any) => {
                const isBullish = disc.sentiment === 'bullish';
                const isBearish = disc.sentiment === 'bearish';
                const comments = localReplies[disc.id] || [];
                const isExpanded = !!expandedComments[disc.id];

                return (
                  <article 
                    key={disc.id}
                    id={`social-post-${disc.id}`}
                    className="p-4 rounded-xl bg-white dark:bg-[#07111e] border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-sm space-y-3"
                  >
                    {/* Header: Author + Handle + Verified + Timestamp + Sentiment Pill */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        {/* Avatar */}
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs ring-2 ring-cyan-500/30 overflow-hidden flex-shrink-0">
                          {disc.avatar ? (
                            <img src={disc.avatar} alt={disc.author} className="w-full h-full object-cover" />
                          ) : (
                            disc.author.slice(0, 2).toUpperCase()
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-slate-900 dark:text-white">
                              {disc.author}
                            </span>
                            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-500 flex-shrink-0" />
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                              {disc.handle || '@trader'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                            <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                              {disc.platform}
                            </span>
                            <span>•</span>
                            <span>{disc.time}</span>
                          </div>
                        </div>
                      </div>

                      {/* Sentiment & Asset Badge */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-xs font-mono font-bold bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800/60 px-2 py-0.5 rounded">
                          ${disc.asset}
                        </span>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          isBullish
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800/60'
                            : isBearish
                            ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800/60'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700'
                        }`}>
                          {disc.sentiment}
                        </span>
                      </div>
                    </div>

                    {/* Post Content */}
                    <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-sans select-text">
                      {disc.content}
                    </p>

                    {/* Action & Engagement Toolbar */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/60 text-xs text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-4">
                        {/* Upvote Button */}
                        <button
                          onClick={() => handleUpvote(disc.id)}
                          className="flex items-center gap-1.5 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors cursor-pointer group"
                        >
                          <ThumbsUp className="w-3.5 h-3.5 group-hover:scale-110 transition-transform text-cyan-500" />
                          <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                            {disc.upvotes}
                          </span>
                          <span className="hidden sm:inline text-[11px]">Upvotes</span>
                        </button>

                        {/* Comments / Replies Toggle Button */}
                        <button
                          onClick={() => setExpandedComments(prev => ({ ...prev, [disc.id]: !prev[disc.id] }))}
                          className="flex items-center gap-1.5 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-mono font-semibold">
                            {(disc.replies || 0) + comments.length}
                          </span>
                          <span className="hidden sm:inline text-[11px]">Replies</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Share link button */}
                        <button
                          onClick={() => handleCopyLink(disc.id)}
                          className="flex items-center gap-1 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer text-[11px]"
                          title="Copy Link to Post"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>{copiedPostId === disc.id ? 'Copied!' : 'Share'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Expandable Comments & Reply Section */}
                    {isExpanded && (
                      <div className="pt-2.5 mt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5 bg-slate-50/60 dark:bg-[#050c17]/60 p-3 rounded-lg">
                        <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Discussion Thread</div>
                        
                        {/* Existing replies */}
                        {comments.length === 0 ? (
                          <div className="text-[11px] text-slate-400 italic">No replies yet. Be the first to comment!</div>
                        ) : (
                          comments.map((rep: any) => (
                            <div key={rep.id} className="p-2 rounded bg-white dark:bg-[#07111e] border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-bold text-slate-800 dark:text-slate-200">{rep.author}</span>
                                <span className="text-slate-400 font-mono text-[10px]">{rep.time}</span>
                              </div>
                              <p className="text-slate-600 dark:text-slate-300 text-[11px]">{rep.content}</p>
                            </div>
                          ))
                        )}

                        {/* Reply input */}
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="text"
                            value={replyInputs[disc.id] || ''}
                            onChange={e => setReplyInputs({ ...replyInputs, [disc.id]: e.target.value })}
                            onKeyDown={e => { if (e.key === 'Enter') handleSendReply(disc.id); }}
                            placeholder="Write a reply..."
                            className="flex-1 px-3 py-1.5 text-xs rounded-md bg-white dark:bg-[#07111e] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                          />
                          <button
                            onClick={() => handleSendReply(disc.id)}
                            className="px-3 py-1.5 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-colors cursor-pointer"
                          >
                            Reply
                          </button>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT 1 COLUMN: Trending Cashtags + Interactive Community Poll + Top Traders */}
        <div className="space-y-4">
          {/* Trending Cashtags & Discussions Widget */}
          <div className="bg-white dark:bg-[#07111e] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
              <Flame className="w-4 h-4 text-amber-500" />
              <span>Trending Cashtags & Narratives</span>
            </div>

            <div className="space-y-2 text-xs">
              {[
                { tag: '#BitcoinBreakout', count: '48.2K posts', change: '+32%' },
                { tag: '#NVIDIASqueeze', count: '31.4K posts', change: '+24%' },
                { tag: '#EthereumETF', count: '22.8K posts', change: '+18%' },
                { tag: '#FedPivot', count: '14.9K posts', change: '+9%' },
                { tag: '#SolanaSummer', count: '11.5K posts', change: '+15%' }
              ].map((trend, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors">
                  <div>
                    <div className="font-bold text-cyan-600 dark:text-cyan-400">{trend.tag}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{trend.count}</div>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                    {trend.change}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Community Sentiment Poll */}
          <div className="bg-white dark:bg-[#07111e] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white">Weekly Market Sentiment Poll</span>
              <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono font-semibold">Live Poll</span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
              Where will ${selectedAsset.symbol} trade at the weekly close?
            </p>

            <div className="space-y-2 pt-1">
              <button
                onClick={() => handlePollVote('bull')}
                className={`w-full p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                  pollVoted === 'bull'
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-500 ring-1 ring-emerald-500'
                    : 'bg-slate-50 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>🚀 Higher (Bullish Extension)</span>
                <span className="font-mono font-bold">{pollVotes.bull}%</span>
              </button>

              <button
                onClick={() => handlePollVote('bear')}
                className={`w-full p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                  pollVoted === 'bear'
                    ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-500 ring-1 ring-rose-500'
                    : 'bg-slate-50 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>🐻 Lower (Pullback / Consolidation)</span>
                <span className="font-mono font-bold">{pollVotes.bear}%</span>
              </button>
            </div>

            <div className="text-[10px] text-slate-500 dark:text-slate-400 text-center pt-1 font-mono">
              {pollVoted ? '✓ Your vote has been recorded on-chain.' : 'Click an option to cast your vote.'}
            </div>
          </div>

          {/* Top Alpha Contributors Leaderboard */}
          <div className="bg-white dark:bg-[#07111e] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
              <UserCheck className="w-4 h-4 text-cyan-500" />
              <span>Top Alpha Contributors</span>
            </div>

            <div className="space-y-2.5">
              {[
                { name: 'Elena Rostova', handle: '@elena_fx', winRate: '84% Win Rate', followers: '18.4K' },
                { name: 'SatoshiQuant', handle: '@satoshi_q', winRate: '79% Win Rate', followers: '42.1K' },
                { name: 'MacroApex', handle: '@macro_apex', winRate: '88% Win Rate', followers: '12.6K' }
              ].map((trader, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">{trader.name}</div>
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">{trader.winRate}</div>
                  </div>
                  <button className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-cyan-600 hover:text-white text-slate-700 dark:text-slate-300 font-semibold text-[11px] transition-colors cursor-pointer">
                    Follow
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
