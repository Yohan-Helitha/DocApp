import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';

export default function Notifications({ navigate }) {
  const [notifications, setNotifications] = useState([]);
  const [latestNotifications, setLatestNotifications] = useState([]);
  const [latestExpandedId, setLatestExpandedId] = useState(null);
  const [latestLoading, setLatestLoading] = useState(false);
  const [readStatus, setReadStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // patientId is the JWT sub (UUID) – same as recipient_user_id in notifications table
  const token = sessionStorage.getItem('accessToken');
  let patientId = localStorage.getItem('patientId');

  // If patientId is missing, extract it from token sub
  if (!patientId && token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      patientId = payload.sub || payload.userId;
      if (patientId) localStorage.setItem('patientId', patientId);
    } catch (e) {
      console.error('Failed to parse token for patientId:', e);
    }
  }

  useEffect(() => {
    if (patientId && token) {
      fetchNotifications();
      fetchLatestNotifications();
    }
  }, [patientId, token]);

  const fetchLatestNotifications = async () => {
    try {
      setLatestLoading(true);
      const response = await fetch('/api/v1/notifications/latest', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch latest notifications');

      const data = await response.json();
      // /latest returns an array
      const list = Array.isArray(data) ? data : [];
      setLatestNotifications(list);
    } catch (err) {
      console.error('Error fetching latest notifications:', err);
      setLatestNotifications([]);
    } finally {
      setLatestLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/v1/notifications/user/${patientId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (!response.ok) throw new Error('Failed to fetch notifications');

      const data = await response.json();
      // Only show in-app notifications in this view
      const allNotifs = data.notifications || [];
      const notifs = allNotifs.filter(n => n.channel === 'in-app');
      setNotifications(notifs);
      
      // Initialize read status from the is_read field in DB
      const initialReadStatus = {};
      notifs.forEach(n => {
        if (n.is_read) initialReadStatus[n.id] = true;
      });
      setReadStatus(initialReadStatus);
      
      setError(null);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Failed to load notifications');
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      // Optimistic update
      setReadStatus(prev => ({ ...prev, [id]: true }));
      
      const response = await fetch(`/api/v1/notifications/${id}/read`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Failed to mark as read');
    } catch (err) {
      console.error('Error persisting read status:', err);
      // Revert optimistic update on failure
      setReadStatus(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const markAllAsRead = async () => {
    const unreadNotifs = notifications.filter(n => !readStatus[n.id]);
    
    // Batch updates (parallel)
    await Promise.all(unreadNotifs.map(n => markAsRead(n.id)));
  };

  const getChannelIcon = (channel) => {
    switch (channel) {
      case 'email': return 'mail';
      case 'sms': return 'sms';
      case 'in-app': return 'notifications';
      case 'push': return 'notifications';
      default: return 'info';
    }
  };

  const getChannelLabel = (channel) => {
    switch (channel) {
      case 'email': return 'Email';
      case 'sms': return 'SMS';
      case 'in-app': return 'In-App';
      case 'push': return 'Push';
      default: return 'Notification';
    }
  };

  const getStatusStyles = (status, priority) => {
    if (status === 'PENDING') {
      return 'text-amber-600 bg-amber-100';
    } else if (status === 'FAILED') {
      return 'text-red-600 bg-red-100';
    } else {
      // SENT - color based on priority
      switch (priority) {
        case 'high': return 'text-primary bg-primary/15';
        case 'normal': return 'text-blue-600 bg-blue-100';
        case 'low': return 'text-slate-600 bg-slate-200';
        default: return 'text-slate-600 bg-slate-200';
      }
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const isPaymentNotification = (notification) => {
    const code = String(notification?.template_code || '').toUpperCase();
    return code === 'PAYMENT_SUCCESS' || code === 'PAYMENT_INVOICE';
  };

  const toggleLatestExpanded = (id) => {
    setLatestExpandedId((prev) => (prev === id ? null : id));
  };

  const getFilteredNotifications = () => {
    return notifications.filter(notification => {
      const matchesSearch = searchQuery === '' || 
        notification.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        notification.template_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        getChannelLabel(notification.channel).toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesPriority = priorityFilter === 'all' || notification.priority === priorityFilter;
      
      return matchesSearch && matchesPriority;
    });
  };

  const filteredNotifications = getFilteredNotifications();
  const unreadCount = notifications.length - Object.keys(readStatus).length;

  return (
    <DashboardLayout navigate={navigate} pageName="Notifications">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-x-hidden">
        {/* Header - always visible */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              Notifications
              {unreadCount > 0 && (
                <span className="bg-primary text-white text-sm font-bold px-3 py-1 rounded-full">
                  {unreadCount} New
                </span>
              )}
            </h1>
            <p className="text-slate-600 mt-1">Stay updated with your latest alerts and messages.</p>
          </div>
          
          {unreadCount > 0 && (
            <button 
              onClick={markAllAsRead}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl border border-slate-300 transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">done_all</span>
              Mark all as read
            </button>
          )}
        </div>

        {/* Latest - horizontal bar */}
        <div className="mb-8 bg-white rounded-2xl border border-slate-200 p-6 overflow-hidden">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="material-symbols-outlined">schedule</span>
              Latest
            </h2>
            <button
              onClick={fetchLatestNotifications}
              className="text-sm font-bold text-primary"
              disabled={latestLoading}
              title="Refresh latest"
            >
              Refresh
            </button>
          </div>

          {latestLoading ? (
            <div className="mt-4 text-slate-500 text-sm">Loading latest notifications...</div>
          ) : latestNotifications.length === 0 ? (
            <div className="mt-4 text-slate-500 text-sm">No latest notifications.</div>
          ) : (
            <div className="mt-4 w-full min-w-0 overflow-x-auto overscroll-x-contain">
              <div className="flex gap-4 pb-2 w-max">
                {latestNotifications.map((n) => {
                  const payload = n.payload_json || {};
                  const isPayment = isPaymentNotification(n);
                  const expanded = latestExpandedId === n.id;
                  const isRead = !!(readStatus?.[n.id] || n.is_read);

                  return (
                    <div
                      key={n.id}
                      className={`shrink-0 w-[280px] sm:w-[320px] lg:w-[360px] rounded-2xl border p-5 min-w-0 ${
                        isRead ? 'bg-slate-50 border-slate-200' : 'bg-white border-primary/20 ring-1 ring-primary/10'
                      }`}
                    >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-black text-slate-900 truncate">
                          {n.template_code ? String(n.template_code).replace(/_/g, ' ') : 'Notification'}
                        </p>
                        <p className="text-xs font-medium text-slate-500 mt-1">
                          {formatTime(n.created_at || n.createdAt)}
                        </p>
                      </div>

                      {isPayment ? (
                        <button
                          type="button"
                          onClick={() => toggleLatestExpanded(n.id)}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 font-bold text-sm"
                          title="View payment details"
                        >
                          <span className="material-symbols-outlined">visibility</span>
                          View
                        </button>
                      ) : null}
                    </div>

                    <p className="text-sm text-slate-700 font-medium mt-3 line-clamp-3">
                      {n.message}
                    </p>

                    {isPayment && expanded && (
                      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center justify-between">
                          <p className="font-black text-slate-900">Payment</p>
                          <span className="px-3 py-1 rounded-full text-xs font-black bg-slate-900 text-white">PAID</span>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-3">
                          <div className="text-sm">
                            <p className="text-slate-500 text-xs font-bold">Amount</p>
                            <p className="text-slate-900 font-bold">
                              {payload.currency || 'LKR'} {payload.amount || ''}
                            </p>
                          </div>
                          <div className="text-sm">
                            <p className="text-slate-500 text-xs font-bold">Method</p>
                            <p className="text-slate-900 font-bold">
                              {payload.paymentMethod || 'Card'}
                              {payload.cardLast4 ? ` (•••• ${payload.cardLast4})` : ''}
                            </p>
                          </div>
                          <div className="text-sm col-span-2">
                            <p className="text-slate-500 text-xs font-bold">Time slot</p>
                            <p className="text-slate-900 font-bold">{payload.slot || '-'}</p>
                          </div>
                          <div className="text-sm">
                            <p className="text-slate-500 text-xs font-bold">Doctor email</p>
                            <p className="text-slate-900 font-bold break-all">{payload.doctorEmail || '-'}</p>
                          </div>
                          <div className="text-sm">
                            <p className="text-slate-500 text-xs font-bold">Patient email</p>
                            <p className="text-slate-900 font-bold break-all">{payload.patientEmail || '-'}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {!isRead && (
                      <div className="mt-4">
                        <button
                          onClick={() => markAsRead(n.id)}
                          className="text-primary hover:text-primary-dark text-sm font-bold flex items-center gap-2 transition-all group"
                        >
                          <span className="material-symbols-outlined text-base group-hover:scale-110 transition-transform">done</span>
                          Mark as read
                        </button>
                      </div>
                    )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Search and Filter Controls - always visible */}
        <div className="mb-8 bg-white rounded-2xl border border-slate-200 p-6">
          <div className="space-y-5">
            {/* Search Box */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-3">Search Notifications</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                <input
                  type="text"
                  placeholder="Search by message, channel, or type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Priority Filter */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-3">Filter by Priority</label>
              <div className="flex flex-wrap gap-3">
                {[
                  { value: 'all', label: 'All Notifications', icon: 'notifications', color: 'slate' },
                  { value: 'high', label: 'High Priority', icon: 'priority_high', color: 'red' },
                  { value: 'normal', label: 'Normal Priority', icon: 'schedule', color: 'blue' },
                  { value: 'low', label: 'Low Priority', icon: 'low_priority', color: 'slate' }
                ].map((filter) => (
                  <button
                    key={filter.value}
                    onClick={() => setPriorityFilter(filter.value)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                      priorityFilter === filter.value
                        ? filter.color === 'red'
                          ? 'bg-red-600 text-white shadow-lg shadow-red-200'
                          : filter.color === 'blue'
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                          : 'bg-slate-900 text-white shadow-lg shadow-slate-300'
                        : filter.color === 'red'
                        ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                        : filter.color === 'blue'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                        : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    <span className="material-symbols-outlined text-lg">{filter.icon}</span>
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Results Info */}
            {(searchQuery || priorityFilter !== 'all') && notifications.length > 0 && (
              <div className="pt-3 border-t border-slate-200">
                <p className="text-sm text-slate-600">
                  Showing <span className="font-semibold text-slate-900">{filteredNotifications.length}</span> of <span className="font-semibold text-slate-900">{notifications.length}</span> notifications
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Content area - conditional */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 flex justify-center">
            <span className="text-slate-500">Loading notifications...</span>
          </div>
        ) : error && notifications.length === 0 ? (
          <div className="bg-red-50 rounded-2xl border border-red-200 p-6 text-red-700">
            {error}
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.length > 0 ? (
              filteredNotifications.length > 0 ? (
                filteredNotifications.map((notification) => {
                const isRead = readStatus[notification.id];
                return (
                  <div 
                    key={notification.id} 
                    className={`relative p-6 rounded-2xl border transition-all duration-300 flex gap-5 items-start overflow-hidden border-l-[6px] ${
                      isRead 
                        ? 'opacity-60 bg-slate-50 border-slate-200 border-l-slate-200' 
                        : 'shadow-md bg-white border-primary/20 border-l-primary ring-1 ring-primary/10'
                    } ${
                      !isRead && notification.priority === 'high'
                        ? 'bg-red-50/30'
                        : ''
                    }`}
                  >
                    {!isRead && (
                      <div className="absolute top-0 right-0 p-2">
                        <span className="flex size-2 rounded-full bg-primary animate-pulse"></span>
                      </div>
                    )}

                    <div className={`size-14 rounded-full flex items-center justify-center shrink-0 ${
                      isRead 
                        ? 'bg-slate-100 text-slate-400' 
                        : 'bg-primary/10 text-primary'
                    }`}>
                      <span className="material-symbols-outlined text-2xl">{getChannelIcon(notification.channel)}</span>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                        <div className="flex-1">
                          <h3 className={`text-lg font-bold ${isRead ? 'text-slate-700' : 'text-slate-900'} mb-1`}>
                            {notification.template_code ? notification.template_code.replace(/_/g, ' ') : getChannelLabel(notification.channel)}
                          </h3>
                          <p className={`text-xs font-medium ${isRead ? 'text-slate-500' : 'text-primary/70'}`}>
                            <span className="inline-block mr-2">
                              <span className="material-symbols-outlined text-xs align-middle">notifications</span> In-App
                            </span>
                            • {formatTime(notification.created_at || notification.createdAt)}
                          </p>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border whitespace-nowrap ${
                          isRead
                            ? notification.priority === 'high'
                              ? 'border-red-200 bg-red-50 text-red-600'
                              : 'border-slate-200 bg-slate-100 text-slate-500'
                            : notification.priority === 'high'
                              ? 'border-red-400 bg-red-500 text-white'
                              : 'border-primary/20 bg-primary/10 text-primary'
                        }`}>
                          {notification.priority}
                        </span>
                      </div>
                      
                      <p className={`text-sm leading-relaxed mb-4 ${isRead ? 'text-slate-500' : 'text-slate-700 font-medium'}`}>
                        {notification.message}
                      </p>
                      
                      {!isRead && (
                        <button 
                          onClick={() => markAsRead(notification.id)}
                          className="text-primary hover:text-primary-dark text-sm font-bold flex items-center gap-2 transition-all group"
                        >
                          <span className="material-symbols-outlined text-base group-hover:scale-110 transition-transform">done</span>
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
              ) : (
                <div className="bg-slate-50 rounded-2xl border border-slate-200 p-12 text-center">
                  <div className="size-20 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 mx-auto mb-4">
                    <span className="material-symbols-outlined text-4xl">search_off</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">No matching notifications</h3>
                  <p className="text-slate-600">Try adjusting your search or filters.</p>
                </div>
              )
            ) : (
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-12 text-center">
                <div className="size-20 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 mx-auto mb-4">
                  <span className="material-symbols-outlined text-4xl">notifications_off</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">No notifications</h3>
                <p className="text-slate-600">You're all caught up! Check back later for updates.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
