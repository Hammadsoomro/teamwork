import { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, Bell, Users as UsersIcon } from 'lucide-react';
import { useChat } from '@/react-app/hooks/useChat';
import { useUsers } from '@/react-app/hooks/useUsers';
import { AppUser } from '@/shared/types';
import ContactList from './ContactList';

interface ChatPanelProps {
  currentUser: AppUser;
}

const roleColors = {
  admin: 'text-red-600',
  manager: 'text-blue-600',
  scrapper: 'text-green-600',
  user: 'text-gray-600',
};

export default function ChatPanel({ currentUser }: ChatPanelProps) {
  const [message, setMessage] = useState('');
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [pinnedUsers, setPinnedUsers] = useState<number[]>([]);
  const [unreadCounts] = useState<{ [key: number]: number }>({});
  const [newMessageAlert, setNewMessageAlert] = useState(false);
  
  const { messages, sendMessage, loading } = useChat();
  const { users, fetchUsers } = useUsers();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Load pinned users from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('pinnedUsers');
    if (saved) {
      setPinnedUsers(JSON.parse(saved));
    }
  }, []);

  // Save pinned users to localStorage
  const handlePinUser = (userId: number) => {
    const newPinned = [...pinnedUsers, userId];
    setPinnedUsers(newPinned);
    localStorage.setItem('pinnedUsers', JSON.stringify(newPinned));
  };

  const handleUnpinUser = (userId: number) => {
    const newPinned = pinnedUsers.filter(id => id !== userId);
    setPinnedUsers(newPinned);
    localStorage.setItem('pinnedUsers', JSON.stringify(newPinned));
  };

  // Handle new message alerts
  useEffect(() => {
    if (messages.length > 0) {
      setNewMessageAlert(true);
      const timer = setTimeout(() => setNewMessageAlert(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [messages.length]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || loading) return;

    try {
      await sendMessage(message.trim());
      setMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 flex h-[700px]">
      {/* Contact List */}
      <ContactList
        users={users}
        currentUser={currentUser}
        selectedUser={selectedUser}
        onSelectUser={setSelectedUser}
        unreadCounts={unreadCounts}
        pinnedUsers={pinnedUsers}
        onPinUser={handlePinUser}
        onUnpinUser={handleUnpinUser}
      />

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center space-x-3 p-6 border-b border-gray-100">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
            {selectedUser ? <UsersIcon className="w-5 h-5 text-white" /> : <MessageSquare className="w-5 h-5 text-white" />}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">
              {selectedUser ? `Chat with ${selectedUser.name || selectedUser.email}` : 'Team Chat'}
            </h3>
            <p className="text-sm text-gray-600">
              {selectedUser ? `Private conversation • ${selectedUser.role}` : 'Everyone can see this conversation'}
            </p>
          </div>
          {newMessageAlert && (
            <div className="flex items-center space-x-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
              <Bell className="w-4 h-4" />
              <span>New message!</span>
            </div>
          )}
        </div>

      {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                {selectedUser 
                  ? `No messages with ${selectedUser.name || selectedUser.email} yet. Start the conversation!`
                  : 'No messages yet. Start the conversation!'
                }
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isOwnMessage = msg.sender_id === currentUser.id;
              const senderRoleColor = roleColors[msg.sender?.role as keyof typeof roleColors] || 'text-gray-600';
              
              return (
                <div
                  key={msg.id}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                      isOwnMessage
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    {!isOwnMessage && msg.sender && (
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`text-xs font-medium ${senderRoleColor}`}>
                          {msg.sender.name || 'Unknown User'}
                        </span>
                        <span className="text-xs text-gray-400">
                          ({msg.sender.role})
                        </span>
                      </div>
                    )}
                    <p className="text-sm">{msg.message}</p>
                    <p className={`text-xs mt-1 ${isOwnMessage ? 'text-indigo-100' : 'text-gray-500'}`}>
                      {formatTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="p-6 border-t border-gray-100">
          <form onSubmit={handleSendMessage} className="flex space-x-3">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={selectedUser 
                ? `Message ${selectedUser.name || selectedUser.email}...`
                : "Type your message..."
              }
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!message.trim() || loading}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
