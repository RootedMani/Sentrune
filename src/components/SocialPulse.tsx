import React, { useState, useMemo } from 'react';
import { 
  MessageSquare, 
  ThumbsUp, 
  Share2, 
  Send, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle2, 
  Filter, 
  Flame, 
  BarChart2,
  Smile
} from 'lucide-react';
import { useWorkstation } from '../context/WorkstationContext';
import { MarketCacheService } from '../services/marketCache';

interface NormalizedDiscussion {
  id: string;
  author: string;
  avatar: string | null;
  handle: string;
  platform: string;
  time: string;
  content: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  upvotes: number;
  commentCount: number;
  isFollowed: boolean;
  asset: string;
  tags: string[];
}

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
  const [newPostAsset, setNewPostAsset] = useState(selectedAsset?.symbol || 'AAPL');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);

  // Filter state
  const [assetFilter, setAssetFilter] = useState<'all' | 'current'>('all');
  const [sentimentFilter, setSentimentFilter] = useState<'all' | 'bullish' | 'bearish'>('all');
  const [platformFilter, setPlatformFilter] = useState<'all' | 'x' | 'reddit' | 'discord'>('all');
  const [activeSort, setActiveSort] = useState<'trending' | 'latest' | 'top'>('trending');

  // Expanded reply drawers
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [localReplies, setLocalReplies] = useState<Record<string, SocialComment[]>>({
    'disc-1': [
      { id: 'rep-1', author: 'QuantNinja', handle: '@quant_ninja', content: 'Agreed, funding rates are completely normalized right now.', time: '12m ago' },
      { id: 'rep-2', author: 'MacroSam', handle: '@macrosam', content: 'Watching the $320 reclaim level closely.', time: '5m ago' }
    ]
  });

  // Interactive Poll state
  const [pollVoted, setPollVoted] = useState<string | null>(null);
  const [pollVotes, setPollVotes] = useState({ bull: 74, bear: 26 });

  // Safe normalized discussion items
  const allDiscussions: NormalizedDiscussion[] = useMemo(() => {
    const rawList = MarketCacheService.getDiscussions();
    const backendItems = Array.isArray(socialItems) ? socialItems : [];
    
    // Combine both sources seamlessly
    const combined = [...backendItems, ...rawList];

    return combined.map((disc: any, index: number): NormalizedDiscussion => {
      const author = String(disc.author || disc.author_username || 'AlphaDesk');
      const handle = String(disc.handle || (disc.author_username ? `@${disc.author_username}` : '@trader'));
      const platform = String(disc.platform || 'Community Alpha');
      const time = String(
        disc.time || 
        (disc.created_at ? new Date(disc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '15m ago')
      );
      const content = String(
        disc.content || 
        [disc.title, disc.body].filter(Boolean).join(' - ') || 
        'Quant order flow and liquidity accumulation observed.'
      );
      
      let sentiment: 'bullish' | 'bearish' | 'neutral' = 'bullish';
      if (disc.sentiment === 'bearish' || disc.sentiment === 'negative') sentiment = 'bearish';
      else if (disc.sentiment === 'neutral') sentiment = 'neutral';

      const upvotes = typeof disc.upvotes === 'number' ? disc.upvotes : typeof disc.score === 'number' ? disc.score : 15 + (index * 3);
      const commentCount = typeof disc.commentCount === 'number' ? disc.commentCount : typeof disc.comment_count === 'number' ? disc.comment_count : 4;
      const asset = String(disc.asset || disc.symbol || selectedAsset?.symbol || 'AAPL').toUpperCase();
      const tags = Array.isArray(disc.tags) ? disc.tags : [`#${asset}`, '#AlphaFlow'];

      return {
        id: String(disc.id || `disc-item-${index}`),
        author,
        avatar: disc.avatar || null,
        handle,
        platform,
        time,
        content,
        sentiment,
        upvotes,
        commentCount,
        isFollowed: !!disc.isFollowed || !!disc.is_followed_account,
        asset,
        tags
      };
    });
  }, [socialItems, selectedAsset?.symbol]);

  // Filtered discussions list
  const filteredDiscussions = useMemo(() => {
    return allDiscussions.filter((disc) => {
      if (!disc) return false;
      // Asset filter
      if (assetFilter === 'current' && disc.asset !== (selectedAsset?.symbol || 'AAPL')) {
        return false;
      }
      // Sentiment filter
      if (sentimentFilter !== 'all' && disc.sentiment !== sentimentFilter) {
        return false;
      }
      // Platform filter
      const plat = disc.platform.toLowerCase();
      if (platformFilter === 'x' && !plat.includes('twitter') && !plat.includes('x')) {
        return false;
      }
      if (platformFilter === 'reddit' && !plat.includes('reddit')) {
        return false;
      }
      if (platformFilter === 'discord' && !plat.includes('discord') && !plat.includes('alpha') && !plat.includes('telegram')) {
        return false;
      }
      return true;
    }).sort((a, b) => {
      if (activeSort === 'top') {
        return b.upvotes - a.upvotes;
      }
      return 0;
    });
  }, [allDiscussions, assetFilter, sentimentFilter, platformFilter, activeSort, selectedAsset?.symbol]);

  // Handle post submit
  const handlePublishPost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim()) return;

    setIsSubmitting(true);
    const newPost = {
      author: 'You (Trader)',
      avatar: null,
      handle: '@pro_trader',
      platform: 'Alpha Room',
      time: 'Just now',
      sentiment: newPostSentiment,
      content: newPostContent.trim(),
      upvotes: 1,
      asset: newPostAsset || selectedAsset?.symbol || 'AAPL',
      replies: 0
    };

    if (addSocialPost) {
      addSocialPost({
        title: newPostContent.trim().slice(0, 60),
        body: newPostContent.trim(),
        platform: 'Alpha Room',
        sentiment: newPostSentiment,
        symbol: newPostAsset || selectedAsset?.symbol || 'AAPL'
      });
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
            Social Pulse & Market Discussions
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time trader commentary, institutional desk chatter, and on-chain intelligence.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800/60 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            {filteredDiscussions.length} Active Feeds
          </span>
        </div>
      </div>

      {/* Grid: Left Column Composer + Feed, Right Column Community Poll */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Feed Column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Post Creation Composer Card */}
          <div className="p-4 rounded-xl bg-white dark:bg-[#07111e] border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 transition-colors">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span>Share Quantitative Signal or Discussion</span>
              <span className="text-[11px] font-mono text-cyan-600 dark:text-cyan-400">
                Posting as Verified Member
              </span>
            </div>

            <form onSubmit={handlePublishPost} className="space-y-3">
              <textarea
                value={newPostContent}
                onChange={e => setNewPostContent(e.target.value)}
                placeholder={`What are you seeing in ${selectedAsset?.symbol || 'the market'} orderbook or macro today?`}
                className="w-full h-20 p-3 text-xs rounded-lg bg-slate-50 dark:bg-[#060e1a] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500 resize-none font-sans"
              />

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                <div className="flex items-center gap-2">
                  {/* Asset selector */}
                  <select
                    value={newPostAsset}
                    onChange={e => setNewPostAsset(e.target.value)}
                    aria-label="Target Asset"
                    className="text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 px-2.5 py-1 rounded-md focus:outline-none"
                  >
                    <option value="AAPL">$AAPL</option>
                    <option value="MSFT">$MSFT</option>
                    <option value="BTC">$BTC</option>
                    <option value="ETH">$ETH</option>
                    <option value="NVDA">$NVDA</option>
                    <option value="SOL">$SOL</option>
                  </select>

                  {/* Sentiment pills */}
                  <div className="flex items-center bg-slate-100 dark:bg-slate-900 rounded-lg p-0.5 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setNewPostSentiment('bullish')}
                      className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                        newPostSentiment === 'bullish'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-emerald-500'
                      }`}
                    >
                      Bullish
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewPostSentiment('bearish')}
                      className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                        newPostSentiment === 'bearish'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-rose-500'
                      }`}
                    >
                      Bearish
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !newPostContent.trim()}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Publish</span>
                </button>
              </div>
            </form>
          </div>

          {/* Filtering & Feed Control Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-white dark:bg-[#07111e] border border-slate-200 dark:border-slate-800 text-xs transition-colors">
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Asset Filter Button */}
              <button
                onClick={() => setAssetFilter(assetFilter === 'all' ? 'current' : 'all')}
                className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                  assetFilter === 'current'
                    ? 'bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 border-cyan-300 dark:border-cyan-800'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                }`}
              >
                {assetFilter === 'current' ? `Showing $${selectedAsset?.symbol || 'AAPL'} Only` : 'All Assets'}
              </button>

              {/* Sentiment Filter */}
              <button
                onClick={() => setSentimentFilter(sentimentFilter === 'all' ? 'bullish' : sentimentFilter === 'bullish' ? 'bearish' : 'all')}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer text-xs font-medium"
              >
                Sentiment: <strong className="capitalize">{sentimentFilter}</strong>
              </button>

              {/* Platform Filter */}
              <button
                onClick={() => setPlatformFilter(platformFilter === 'all' ? 'x' : platformFilter === 'x' ? 'reddit' : 'all')}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer text-xs font-medium"
              >
                Source: <strong className="uppercase">{platformFilter}</strong>
              </button>
            </div>

            {/* Sort Toggle */}
            <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
              <span>Sort:</span>
              <button
                onClick={() => setActiveSort(activeSort === 'trending' ? 'top' : 'trending')}
                className="font-bold text-cyan-600 dark:text-cyan-400 hover:underline capitalize cursor-pointer"
              >
                {activeSort}
              </button>
            </div>
          </div>

          {/* Posts List */}
          <div className="space-y-3">
            {filteredDiscussions.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-[#07111e] rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500">
                <p className="text-xs">No discussions match your filter criteria.</p>
                <button
                  onClick={() => { setAssetFilter('all'); setSentimentFilter('all'); setPlatformFilter('all'); }}
                  className="mt-2 text-xs font-bold text-cyan-600 hover:underline cursor-pointer"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              filteredDiscussions.map((disc) => {
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
                            (disc.author || 'TR').slice(0, 2).toUpperCase()
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-slate-900 dark:text-white">
                              {disc.author}
                            </span>
                            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-500 flex-shrink-0" />
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                              {disc.handle}
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

                    {/* Tags */}
                    {disc.tags && disc.tags.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {disc.tags.map((tag, tIdx) => (
                          <span key={tIdx} className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

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
                            {disc.commentCount + comments.length}
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
                          <div className="text-[11px] text-slate-400 italic">No community replies yet. Be the first to comment!</div>
                        ) : (
                          comments.map((rep) => (
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
                            placeholder="Write a quant reply..."
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

        {/* Right Sidebar: Daily Sentiment Pulse & Alpha Channels */}
        <div className="space-y-4">
          {/* Daily Sentiment Poll Widget */}
          <div className="p-4 rounded-xl bg-white dark:bg-[#07111e] border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <BarChart2 className="w-4 h-4 text-cyan-500" />
                Community Sentiment Consensus
              </span>
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
                Live
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Where do you see <strong>${selectedAsset?.symbol || 'AAPL'}</strong> closing by end of week?
            </p>

            <div className="space-y-2 pt-1">
              <button
                onClick={() => handlePollVote('bull')}
                disabled={!!pollVoted}
                className={`w-full p-2.5 rounded-lg border text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                  pollVoted === 'bull'
                    ? 'bg-emerald-100 dark:bg-emerald-950/80 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                    : 'bg-slate-50 dark:bg-[#060e1a] border-slate-200 dark:border-slate-800 hover:border-emerald-500 text-slate-800 dark:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <span>Higher (Bullish Reclaim)</span>
                </div>
                {pollVoted && (
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">
                    {Math.round((pollVotes.bull / (pollVotes.bull + pollVotes.bear)) * 100)}%
                  </span>
                )}
              </button>

              <button
                onClick={() => handlePollVote('bear')}
                disabled={!!pollVoted}
                className={`w-full p-2.5 rounded-lg border text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                  pollVoted === 'bear'
                    ? 'bg-rose-100 dark:bg-rose-950/80 border-rose-500 text-rose-700 dark:text-rose-300'
                    : 'bg-slate-50 dark:bg-[#060e1a] border-slate-200 dark:border-slate-800 hover:border-rose-500 text-slate-800 dark:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-rose-500" />
                  <span>Lower (Support Test)</span>
                </div>
                {pollVoted && (
                  <span className="font-mono text-rose-600 dark:text-rose-400">
                    {Math.round((pollVotes.bear / (pollVotes.bull + pollVotes.bear)) * 100)}%
                  </span>
                )}
              </button>
            </div>

            {pollVoted && (
              <div className="text-[11px] text-center text-slate-500 dark:text-slate-400 pt-1 font-mono">
                Vote recorded • {pollVotes.bull + pollVotes.bear} participants
              </div>
            )}
          </div>

          {/* Top Trending Tickers */}
          <div className="p-4 rounded-xl bg-white dark:bg-[#07111e] border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 transition-colors">
            <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
              <span className="flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-500" />
                Social Momentum Leaders
              </span>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-[#060e1a]">
                <span className="font-bold text-slate-800 dark:text-slate-200">$BTC</span>
                <span className="text-emerald-600 dark:text-emerald-400">+42% 24h mentions</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-[#060e1a]">
                <span className="font-bold text-slate-800 dark:text-slate-200">$NVDA</span>
                <span className="text-emerald-600 dark:text-emerald-400">+38% 24h mentions</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-[#060e1a]">
                <span className="font-bold text-slate-800 dark:text-slate-200">$SOL</span>
                <span className="text-emerald-600 dark:text-emerald-400">+29% 24h mentions</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-[#060e1a]">
                <span className="font-bold text-slate-800 dark:text-slate-200">$AAPL</span>
                <span className="text-cyan-600 dark:text-cyan-400">+18% 24h mentions</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
