import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';

export default function Notifications({ navigate }) {
  const [notifications, setNotifications] = useState([]);
  const [readStatus, setReadStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const patientId = localStorage.getItem('patientId');
  const token = sessionStorage.getItem('accessToken');

  useEffect(() => {
    if (patientId && token) {
      fetchNotifications();
    }
  }, [patientId, token]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/v1/notifications?recipient_user_id=${patientId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (!response.ok) throw new Error('Failed to fetch notifications');

      const data = await response.json();
      setNotifications(data.notifications || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Failed to load notifications');
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = (id) => {
    setReadStatus(prev => ({ ...prev, [id]: true }));
  };

  const markAllAsRead = () => {
    const allRead = {};
    notifications.forEach(n => {
      allRead[n.id] = true;
    });
    setReadStatus(allRead);
  };

  const getChannelIcon = (channel) => {
    switch (channel) {
      case 'email': return 'mail';
      case 'sms': return 'sms';
      case 'push': return 'notifications';
      default: return 'info';
    }
  };

  const getChannelLabel = (channel) => {
    switch (channel) {
      case 'email': return 'Email';
      case 'sms': return 'SMS';
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
                    className={`p-6 rounded-2xl border transition-all duration-300 flex gap-5 items-start ${
                      isRead 
                        ? 'opacity-75' 
                        : 'shadow-sm hover:shadow-md'
                    } ${
                      notification.priority === 'high'
                        ? 'bg-red-50 border-red-200'
                        : notification.priority === 'normal'
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className={`size-14 rounded-full flex items-center justify-center shrink-0 ${getStatusStyles(notification.status, notification.priority)}`}>
                      <span className="material-symbols-outlined text-2xl">{getChannelIcon(notification.channel)}</span>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                        <div className="flex-1">
                          <h3 className={`text-lg font-bold ${isRead ? 'text-slate-700' : 'text-slate-900'} mb-1`}>
                            {notification.template_code ? notification.template_code.replace(/_/g, ' ') : getChannelLabel(notification.channel)}
                          </h3>
                          <p className="text-xs text-slate-500 font-medium">
                            <span className="inline-block mr-2">
                              <span className="material-symbols-outlined text-xs align-middle">mail_outline</span> {getChannelLabel(notification.channel)}
                            </span>
                            • {formatTime(notification.createdAt)}
                          </p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border whitespace-nowrap ${
                          notification.priority === 'high'
                            ? 'border-red-300 bg-red-100 text-red-700'
                            : notification.priority === 'normal'
                            ? 'border-blue-300 bg-blue-100 text-blue-700'
                            : 'border-slate-300 bg-slate-100 text-slate-700'
                        }`}>
                          {notification.priority}
                        </span>
                      </div>
                      
                      <p className={`text-sm leading-relaxed mb-3 ${isRead ? 'text-slate-600' : 'text-slate-700'}`}>
                        {notification.message}
                      </p>
                      
                      {!isRead && (
                        <button 
                          onClick={() => markAsRead(notification.id)}
                          className="text-primary hover:text-primary/80 text-sm font-bold flex items-center gap-1 transition-colors"
                        >
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
