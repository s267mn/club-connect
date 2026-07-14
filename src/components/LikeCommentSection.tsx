'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Heart, MessageCircle, Send } from 'lucide-react';
import { enforceWordLimit, TEXT_LIMITS } from '@/lib/textLimits';

type Comment = {
  id: string;
  comment: string;
  created_at: string;
  user_id: string;
  parent_comment_id: string | null;
  users: { name: string; avatar_url: string | null } | null;
};

export default function LikeCommentSection({
  contributionId,
  contributionOwnerId,
  contributionTitle,
  clubId,
}: {
  contributionId: string;
  contributionOwnerId: string;
  contributionTitle: string;
  clubId: string;
}) {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentCount, setCommentCount] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [allUsers, setAllUsers] = useState<{ id: string; name: string }[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStartIdx, setMentionStartIdx] = useState<number | null>(null);
  const [highlightedCommentId, setHighlightedCommentId] = useState<string | null>(null);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [collapsedThreads, setCollapsedThreads] = useState<Set<string>>(new Set());

  // Listen for a global "focus-comment" event dispatched by NotificationBell.
  // This is the single, reliable mechanism for scroll+expand+highlight —
  // no hash/URL parsing, no timing guesses.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { contributionId: string; commentId: string | null };
      if (detail.contributionId !== contributionId) return;

      setShowComments(true);

      const focusTarget = async () => {
        await loadComments();
        if (detail.commentId) {
          setTimeout(() => {
            const el = document.getElementById(`comment-${detail.commentId}`);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              setHighlightedCommentId(detail.commentId);
              setTimeout(() => setHighlightedCommentId(null), 2000);
            }
          }, 250);
        }
      };
      focusTarget();
    };

    window.addEventListener('focus-comment', handler);
    return () => window.removeEventListener('focus-comment', handler);
  }, [contributionId]);

  useEffect(() => {
    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user.id ?? null;
      setUserId(uid);

      const { count } = await supabase
        .from('contribution_likes')
        .select('*', { count: 'exact', head: true })
        .eq('contribution_id', contributionId);
      setLikeCount(count ?? 0);

      const { count: cCount } = await supabase
        .from('contribution_comments')
        .select('*', { count: 'exact', head: true })
        .eq('contribution_id', contributionId);
      setCommentCount(cCount ?? 0);

      if (uid) {
        const { data: myLike } = await supabase
          .from('contribution_likes')
          .select('id')
          .eq('contribution_id', contributionId)
          .eq('user_id', uid)
          .maybeSingle();
        setLiked(!!myLike);
      }
    };
    load();
  }, [contributionId]);

  useEffect(() => {
    const loadUsers = async () => {
      const { data } = await supabase.from('users').select('id, name');
      const sorted = (data ?? []).sort((a, b) => a.name.localeCompare(b.name));
      setAllUsers(sorted);
    };
    loadUsers();
  }, []);

  const handleCommentInputChange = (value: string, cursorPos: number) => {
    const capped = value.slice(0, TEXT_LIMITS.comment);
    setCommentText(capped);

    const textBeforeCursor = capped.slice(0, cursorPos);
    const atIdx = textBeforeCursor.lastIndexOf('@');

    if (atIdx === -1) {
      setMentionQuery(null);
      setMentionStartIdx(null);
      return;
    }

    const textAfterAt = textBeforeCursor.slice(atIdx + 1);
    if (/\s/.test(textAfterAt)) {
      setMentionQuery(null);
      setMentionStartIdx(null);
      return;
    }

    setMentionQuery(textAfterAt);
    setMentionStartIdx(atIdx);
  };

  const selectMention = (name: string) => {
    if (mentionStartIdx === null) return;
    const before = commentText.slice(0, mentionStartIdx);
    const after = commentText.slice(mentionStartIdx + 1 + (mentionQuery?.length ?? 0));
    const newText = `${before}@${name} ${after}`;
    setCommentText(newText);
    setMentionQuery(null);
    setMentionStartIdx(null);
  };

  const matchingUsers = mentionQuery !== null
    ? allUsers.filter((u) => u.name.toLowerCase().startsWith(mentionQuery.toLowerCase())).slice(0, 5)
    : [];

  const renderCommentWithMentions = (text: string) => {
    const parts = text.split(/(@[A-Za-z][A-Za-z\s]*?)(?=\s|$)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        const name = part.slice(1).trim();
        const isKnownUser = allUsers.some((u) => u.name === name);
        if (isKnownUser) {
          return <span key={i} className="text-[var(--peach-ink)] font-medium">{part}</span>;
        }
      }
      return <span key={i}>{part}</span>;
    });
  };

  const extractMentionedUserIds = (text: string): string[] => {
    const ids: string[] = [];
    allUsers.forEach((u) => {
      if (text.includes(`@${u.name}`)) ids.push(u.id);
    });
    return ids;
  };

  const loadComments = async () => {
    const { data } = await supabase
      .from('contribution_comments')
      .select('id, comment, created_at, user_id, parent_comment_id, users(name, avatar_url)')
      .eq('contribution_id', contributionId)
      .order('created_at', { ascending: true });
    setComments((data as any) ?? []);
  };

  const toggleComments = () => {
    const next = !showComments;
    setShowComments(next);
    if (next && comments.length === 0) loadComments();
  };

  const handleLikeToggle = async () => {
    if (!userId) return;

    setAnimating(true);
    setTimeout(() => setAnimating(false), 400);

    if (liked) {
      setLiked(false);
      setLikeCount((c) => Math.max(0, c - 1));
      const { error } = await supabase
        .from('contribution_likes')
        .delete()
        .eq('contribution_id', contributionId)
        .eq('user_id', userId);
      if (error) console.error('Failed to unlike:', error);
    } else {
      setLiked(true);
      setLikeCount((c) => c + 1);
      const { error } = await supabase
        .from('contribution_likes')
        .insert({ contribution_id: contributionId, user_id: userId });
      if (error) {
        console.error('Failed to like:', error);
      } else if (userId !== contributionOwnerId) {
        const { error: notifError } = await supabase.from('notifications').insert({
          user_id: contributionOwnerId,
          message: `Someone liked your contribution "${contributionTitle}"`,
          activity_type: 'like',
          club_id: clubId,
          contribution_id: contributionId,
          actor_id: userId,
        });
        if (notifError) console.error('Failed to notify like:', notifError);
      }
    }
  };

  const handleCommentSubmit = async () => {
    if (!userId || !commentText.trim()) return;
    setSubmitting(true);
    const submittedText = commentText.trim();

    const { data, error } = await supabase
      .from('contribution_comments')
      .insert({ contribution_id: contributionId, user_id: userId, comment: submittedText })
      .select('id, comment, created_at, user_id, parent_comment_id, users(name, avatar_url)')
      .single();

    if (error) {
      console.error('Failed to post comment:', error);
    } else if (data) {
      setComments((prev) => [...prev, data as any]);
      setCommentCount((c) => c + 1);
      setCommentText('');

      if (userId !== contributionOwnerId) {
        const { error: notifError } = await supabase.from('notifications').insert({
          user_id: contributionOwnerId,
          message: `Someone commented on your contribution "${contributionTitle}"`,
          activity_type: 'comment',
          club_id: clubId,
          contribution_id: contributionId,
          comment_id: data.id,
          actor_id: userId,
        });
        if (notifError) console.error('Failed to notify comment:', notifError);
      }

      const mentionedIds = extractMentionedUserIds(submittedText).filter(
        (id) => id !== userId && id !== contributionOwnerId
      );
      for (const mentionedId of mentionedIds) {
        const { error: mentionError } = await supabase.from('notifications').insert({
          user_id: mentionedId,
          message: `You were mentioned in a comment on "${contributionTitle}"`,
          activity_type: 'mention',
          club_id: clubId,
          contribution_id: contributionId,
          comment_id: data.id,
          actor_id: userId,
        });
        if (mentionError) console.error('Failed to notify mention:', mentionError);
      }
    }

    setSubmitting(false);
  };

  const handleReplySubmit = async (parentId: string, parentAuthorId: string) => {
    if (!userId || !replyText.trim()) return;
    setSubmitting(true);
    const submittedText = replyText.trim();

    const { data, error } = await supabase
      .from('contribution_comments')
      .insert({ contribution_id: contributionId, user_id: userId, comment: submittedText, parent_comment_id: parentId })
      .select('id, comment, created_at, user_id, parent_comment_id, users(name, avatar_url)')
      .single();

    if (error) {
      console.error('Failed to post reply:', error);
    } else if (data) {
      setComments((prev) => [...prev, data as any]);
      setCommentCount((c) => c + 1);
      setReplyText('');
      setReplyingToId(null);

      const notifiedIds = new Set<string>();

      if (userId !== contributionOwnerId) {
        notifiedIds.add(contributionOwnerId);
        const { error: notifError } = await supabase.from('notifications').insert({
          user_id: contributionOwnerId,
          message: `Someone commented on your contribution "${contributionTitle}"`,
          activity_type: 'comment',
          club_id: clubId,
          contribution_id: contributionId,
          comment_id: data.id,
          actor_id: userId,
        });
        if (notifError) console.error('Failed to notify comment:', notifError);
      }

      if (parentAuthorId !== userId && !notifiedIds.has(parentAuthorId)) {
        notifiedIds.add(parentAuthorId);
        const { error: replyNotifError } = await supabase.from('notifications').insert({
          user_id: parentAuthorId,
          message: `Someone replied to your comment on "${contributionTitle}"`,
          activity_type: 'reply',
          club_id: clubId,
          contribution_id: contributionId,
          comment_id: data.id,
          actor_id: userId,
        });
        if (replyNotifError) console.error('Failed to notify reply:', replyNotifError);
      }

      const mentionedIds = extractMentionedUserIds(submittedText).filter(
        (id) => id !== userId && !notifiedIds.has(id)
      );
      for (const mentionedId of mentionedIds) {
        const { error: mentionError } = await supabase.from('notifications').insert({
          user_id: mentionedId,
          message: `You were mentioned in a comment on "${contributionTitle}"`,
          activity_type: 'mention',
          club_id: clubId,
          contribution_id: contributionId,
          comment_id: data.id,
          actor_id: userId,
        });
        if (mentionError) console.error('Failed to notify mention:', mentionError);
      }
    }

    setSubmitting(false);
  };

  const toggleThreadCollapse = (commentId: string) => {
    setCollapsedThreads((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  };

  const topLevelComments = comments.filter((c) => !c.parent_comment_id);
  const repliesFor = (parentId: string) => comments.filter((c) => c.parent_comment_id === parentId);

  return (
    <div className="mt-3 pt-3 border-t border-[var(--border)]">
      <div className="flex items-center gap-4">
        <button
          onClick={handleLikeToggle}
          disabled={!userId}
          className="flex items-center gap-1.5 text-sm text-[var(--ink-dim)] hover:text-[var(--peach-ink)] transition-colors disabled:opacity-50"
        >
          <Heart
            size={16}
            className={`transition-transform ${animating ? 'scale-125' : 'scale-100'}`}
            style={{ transitionDuration: '200ms' }}
            fill={liked ? 'var(--peach-ink)' : 'none'}
            color={liked ? 'var(--peach-ink)' : 'currentColor'}
          />
          <span>{likeCount > 0 ? likeCount : ''}</span>
        </button>

        <button
          onClick={toggleComments}
          className="flex items-center gap-1.5 text-sm text-[var(--ink-dim)] hover:text-[var(--ink)] transition-colors"
        >
          <MessageCircle size={16} />
          <span>{commentCount > 0 ? commentCount : ''}</span>
        </button>
      </div>

      {showComments && (
        <div className="mt-3 space-y-3">
          {topLevelComments.map((c) => {
            const initials = (c.users?.name ?? '?').split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
            const replies = repliesFor(c.id);
            const isCollapsed = collapsedThreads.has(c.id);

            return (
              <div key={c.id}>
                <div id={`comment-${c.id}`} className="flex items-start gap-2">
                  <button onClick={() => router.push(`/profile/${c.user_id}`)} className="shrink-0">
                    <span className="avatar w-6 h-6 text-[10px] overflow-hidden">
                      {c.users?.avatar_url ? (
                        <img src={c.users.avatar_url} alt={c.users.name} className="w-full h-full object-cover" />
                      ) : (
                        initials
                      )}
                    </span>
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className={`bg-[var(--bg)] rounded-xl px-3 py-2 transition-shadow ${highlightedCommentId === c.id ? 'pulse-highlight' : ''}`}>
                      <button onClick={() => router.push(`/profile/${c.user_id}`)} className="text-xs font-medium hover:underline">
                        {c.users?.name ?? 'Unknown'}
                      </button>
                      <p className="text-sm text-[var(--ink)] break-words">{renderCommentWithMentions(c.comment)}</p>
                    </div>

                    <div className="flex items-center gap-3 mt-1 ml-1">
                      {userId && (
                        <button
                          onClick={() => {
                            setReplyingToId(replyingToId === c.id ? null : c.id);
                            setReplyText('');
                          }}
                          className="text-xs text-[var(--ink-dim)] hover:text-[var(--peach-ink)]"
                        >
                          Reply
                        </button>
                      )}
                      {replies.length > 0 && (
                        <button
                          onClick={() => toggleThreadCollapse(c.id)}
                          className="text-xs text-[var(--ink-dim)] hover:text-[var(--ink)]"
                        >
                          {isCollapsed ? `Show ${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}` : 'Hide replies'}
                        </button>
                      )}
                    </div>

                    {replyingToId === c.id && (
                      <div className="flex items-center gap-2 mt-2 ml-1">
                        <input
                          type="text"
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value.slice(0, TEXT_LIMITS.comment))}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleReplySubmit(c.id, c.user_id); }}
                          placeholder={`Reply to ${c.users?.name ?? 'this comment'}...`}
                          maxLength={TEXT_LIMITS.comment}
                          className="flex-1 p-2 text-sm bg-transparent border border-[var(--border)] rounded-lg focus:border-[var(--peach-ink)] focus:outline-none"
                          autoFocus
                        />
                        <button
                          onClick={() => handleReplySubmit(c.id, c.user_id)}
                          disabled={submitting || !replyText.trim()}
                          className="p-2 text-[var(--peach-ink)] disabled:opacity-40"
                          aria-label="Send reply"
                        >
                          <Send size={16} />
                        </button>
                      </div>
                    )}

                    {!isCollapsed && replies.length > 0 && (
                      <div className="mt-3 space-y-3 pl-4 border-l-2 border-[var(--border)]">
                        {replies.map((r) => {
                          const rInitials = (r.users?.name ?? '?').split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
                          return (
                            <div key={r.id} id={`comment-${r.id}`} className="flex items-start gap-2">
                              <button onClick={() => router.push(`/profile/${r.user_id}`)} className="shrink-0">
                                <span className="avatar w-5 h-5 text-[9px] overflow-hidden">
                                  {r.users?.avatar_url ? (
                                    <img src={r.users.avatar_url} alt={r.users.name} className="w-full h-full object-cover" />
                                  ) : (
                                    rInitials
                                  )}
                                </span>
                              </button>
                              <div className={`flex-1 min-w-0 bg-[var(--bg)] rounded-xl px-3 py-2 transition-shadow ${highlightedCommentId === r.id ? 'pulse-highlight' : ''}`}>
                                <button onClick={() => router.push(`/profile/${r.user_id}`)} className="text-xs font-medium hover:underline">
                                  {r.users?.name ?? 'Unknown'}
                                </button>
                                <p className="text-sm text-[var(--ink)] break-words">{renderCommentWithMentions(r.comment)}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {userId && (
            <div className="relative">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => handleCommentInputChange(e.target.value, e.target.selectionStart ?? e.target.value.length)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && mentionQuery === null) handleCommentSubmit(); }}
                  placeholder="Write a comment... use @ to mention someone"
                  maxLength={TEXT_LIMITS.comment}
                  className="flex-1 p-2 text-sm bg-transparent border border-[var(--border)] rounded-lg focus:border-[var(--peach-ink)] focus:outline-none"
                />
                <button
                  onClick={handleCommentSubmit}
                  disabled={submitting || !commentText.trim()}
                  className="p-2 text-[var(--peach-ink)] disabled:opacity-40"
                  aria-label="Send comment"
                >
                  <Send size={16} />
                </button>
              </div>

              {mentionQuery !== null && matchingUsers.length > 0 && (
                <div className="absolute bottom-full left-0 mb-1 w-56 max-h-40 overflow-y-auto bg-[var(--bg)] border border-[var(--border)] rounded-lg shadow-lg z-10">
                  {matchingUsers.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => selectMention(u.name)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--border)] transition-colors"
                    >
                      {u.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}