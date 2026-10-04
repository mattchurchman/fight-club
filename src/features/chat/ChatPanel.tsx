import { useEffect, useRef, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import clsx from 'clsx';
import { useSession } from '../auth/SessionProvider.tsx';
import { useToast } from '../../components/ui/Toast.tsx';
import { Avatar } from '../../components/ui/Avatar.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { Card } from '../../components/ui/Card.tsx';
import { Sheet } from '../../components/ui/Sheet.tsx';
import { db } from '../../lib/firebase.ts';
import type { CommentWithId } from '../live/hooks.ts';

const QUICK_EMOJIS = ['🔥', '😂', '🩸', '💀', '🐐'] as const;
const MAX_CHARS = 280;

interface ChatPanelProps {
  eventId: string | null;
  comments: CommentWithId[] | undefined;
  bouts: Array<{ id: string; a: { name: string }; b: { name: string } }> | undefined;
  open: boolean;
  onClose: () => void;
}

export function ChatPanel({ eventId, comments, bouts, open, onClose }: ChatPanelProps) {
  const { user, profile } = useSession();
  const { show: showToast } = useToast();
  const [text, setText] = useState('');
  const [selectedBoutId, setSelectedBoutId] = useState<string | null>(null);
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom();
    }
  }, [comments, isAtBottom]);

  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    setIsAtBottom(scrollHeight - scrollTop - clientHeight < 10);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId || !user || !profile || !text.trim()) return;

    setIsSubmitting(true);
    try {
      const emoji = selectedEmoji || null;
      const boutId = selectedBoutId || null;

      await addDoc(collection(db, 'events', eventId, 'comments'), {
        uid: user.uid,
        displayName: profile.displayName,
        boutId,
        text: text.trim(),
        emoji,
        createdAt: serverTimestamp(),
      });

      setText('');
      setSelectedEmoji(null);
      setSelectedBoutId(null);
    } catch {
      showToast('Failed to send message', { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!eventId) return;
    try {
      await deleteDoc(doc(db, 'events', eventId, 'comments', commentId));
    } catch {
      showToast('Failed to delete message', { variant: 'error' });
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    if (selectedEmoji === emoji) {
      setSelectedEmoji(null);
    } else {
      setSelectedEmoji(emoji);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Trash Talk">
      <div className="flex h-full flex-col gap-3">
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="flex flex-1 flex-col gap-2 overflow-y-auto px-4"
        >
          {comments && comments.length === 0 && (
            <p className="py-8 text-center text-sm text-muted">No messages yet. Start the trash talk!</p>
          )}
          {comments?.map((comment) => (
            <Card key={comment.id} className="flex gap-2 p-2">
              <Avatar
                name={comment.displayName}
                size={32}
                className="flex-shrink-0"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-text">{comment.displayName}</p>
                  {comment.uid === user?.uid && (
                    <button
                      type="button"
                      onClick={() => handleDelete(comment.id)}
                      className="text-xs text-muted hover:text-text"
                      aria-label="Delete message"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <p className="text-sm text-text">{comment.text}</p>
                {comment.emoji && <p className="text-lg">{comment.emoji}</p>}
                {comment.boutId && bouts && (
                  <p className="text-xs text-muted">
                    on {bouts.find((b) => b.id === comment.boutId)?.a.name}
                  </p>
                )}
              </div>
            </Card>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="border-t border-line px-4 py-3 space-y-2">
          {/* Quick emoji buttons */}
          <div className="flex gap-2">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleEmojiSelect(emoji)}
                className={clsx(
                  'text-xl transition-colors',
                  selectedEmoji === emoji ? 'opacity-100' : 'opacity-50 hover:opacity-75'
                )}
                aria-label={`Select ${emoji} emoji`}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Bout selector */}
          {bouts && bouts.length > 0 && (
            <select
              value={selectedBoutId || ''}
              onChange={(e) => setSelectedBoutId(e.target.value || null)}
              className="w-full rounded border border-line bg-surface px-2 py-1 text-xs text-text"
            >
              <option value="">General chat</option>
              {bouts.map((bout) => (
                <option key={bout.id} value={bout.id}>
                  {bout.a.name} vs {bout.b.name}
                </option>
              ))}
            </select>
          )}

          {/* Text input */}
          <div className="space-y-1">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
              placeholder="Say something..."
              rows={2}
              className="w-full rounded border border-line bg-surface px-3 py-2 text-sm text-text placeholder-muted resize-none"
              disabled={isSubmitting}
            />
            <div className="flex items-center justify-between">
              <span className={clsx('text-xs', text.length >= MAX_CHARS - 20 ? 'text-gold' : 'text-muted')}>
                {text.length}/{MAX_CHARS}
              </span>
              <Button
                type="submit"
                disabled={!text.trim() || isSubmitting}
                className="px-4 py-1 text-xs"
              >
                {isSubmitting ? '...' : 'Send'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </Sheet>
  );
}
