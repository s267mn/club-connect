'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';

type Notification = {
  id: string;
  message: string;
  link: string | null;
  read: boolean | null;
  created_at: string | null;
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const load = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData.session?.user.id;
    if (!uid) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('id, message, link, read, created_at')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Failed to load notifications:', error);
    } else {
      setNotifications(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      load();
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

    const { error } = await supabase.from('notifications').update({ read: true }).in('id', unreadIds);
    if (error) {
      console.error('Failed to mark notifications as read:', error);
      load();
    }
  };

  const handleNotificationClick = async (n: Notification) => {
    setOpen(false);

    if (!n.read) {
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      const { error } = await supabase.from('notifications').update({ read: true }).eq('id', n.id);
      if (error) console.error('Failed to mark notification as read:', error);
    }

    if (n.link) router.push(n.link);
  };

  const timeAgo = (dateStr: string | null) => {
    if (!dateStr) return '';
    // Supabase timestamps without an explicit timezone are stored as UTC.
    // Force-parse as UTC by appending 'Z' if there's no zone marker already,
    // otherwise the browser assumes local time and skews the diff by your UTC offset.
    const hasZone = /Z|[+-]\d{2}:?\d{2}$/.test(dateStr);
    const normalized = hasZone ? dateStr : `${dateStr}Z`;
    const diffMs = Date.now() - new Date(normalized).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="fixed top-3 right-4 lg:top-4 lg:right-6 z-[60]" ref={dropdownRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-full hover:bg-[rgba(255,255,255,0.08)] transition-colors"
        aria-label="Notifications"
      >
        <Bell size={20} className="text-[var(--steel)]" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-600 text-white text-[10px] font-semibold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto card bg-[var(--bg)] border border-[var(--border)] rounded-xl shadow-xl">
          <div className="flex justify-between items-center px-4 py-3 border-b border-[var(--border)]">
            <h3 className="text-sm font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-[var(--cyan)] hover:underline">
                Mark all read
              </button>
            )}
          </div>

          {loading ? (
            <p className="px-4 py-6 text-sm text-[var(--ink-dim)] text-center">Loading...</p>
          ) : notifications.length === 0 ? (
            <p className="px-4 py-6 text-sm text-[var(--ink-dim)] text-center">No notifications yet.</p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`px-4 py-3 text-sm cursor-pointer hover:bg-[rgba(255,255,255,0.05)] transition-colors ${!n.read ? 'bg-[rgba(45,212,206,0.05)]' : ''}`}
                >
                  <div className="flex items-start gap-2">
                    {!n.read && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--cyan)] shrink-0" />}
                    <div className="flex-1">
                      <p className="text-[var(--ink)]">{n.message}</p>
                      <p className="text-xs text-[var(--ink-dim)] mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}