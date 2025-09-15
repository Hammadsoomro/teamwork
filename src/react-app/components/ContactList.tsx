import { useState, useMemo } from 'react';
import { Search, Pin, Archive, Star, Users, Crown, Database } from 'lucide-react';
import { AppUser } from '@/shared/types';

interface ContactListProps {
  users: AppUser[];
  currentUser: AppUser;
  selectedUser: AppUser | null;
  onSelectUser: (user: AppUser | null) => void;
  unreadCounts: { [key: number]: number };
  pinnedUsers: number[];
  onPinUser: (userId: number) => void;
  onUnpinUser: (userId: number) => void;
}

const roleIcons = {
  admin: Crown,
  manager: Star,
  scrapper: Database,
  user: Users,
};

const roleColors = {
  admin: 'text-red-600 bg-red-100',
  manager: 'text-blue-600 bg-blue-100',
  scrapper: 'text-green-600 bg-green-100',
  user: 'text-gray-600 bg-gray-100',
};

export default function ContactList({
  users,
  currentUser,
  selectedUser,
  onSelectUser,
  unreadCounts,
  pinnedUsers,
  onPinUser,
  onUnpinUser,
}: ContactListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const filteredUsers = useMemo(() => {
    let filtered = users.filter(user => 
      user.id !== currentUser.id &&
      (user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       user.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Sort by: pinned first, then by last activity, then alphabetically
    return filtered.sort((a, b) => {
      const aIsPinned = pinnedUsers.includes(a.id);
      const bIsPinned = pinnedUsers.includes(b.id);
      
      if (aIsPinned && !bIsPinned) return -1;
      if (!aIsPinned && bIsPinned) return 1;
      
      // Then by last activity
      if (a.last_activity_at && b.last_activity_at) {
        return new Date(b.last_activity_at).getTime() - new Date(a.last_activity_at).getTime();
      }
      
      // Finally alphabetically
      const aName = a.name || a.email;
      const bName = b.name || b.email;
      return aName.localeCompare(bName);
    });
  }, [users, currentUser.id, searchTerm, pinnedUsers]);

  const handleUserClick = (user: AppUser) => {
    onSelectUser(selectedUser?.id === user.id ? null : user);
  };

  const handlePinToggle = (e: React.MouseEvent, userId: number) => {
    e.stopPropagation();
    if (pinnedUsers.includes(userId)) {
      onUnpinUser(userId);
    } else {
      onPinUser(userId);
    }
  };

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Contacts</h2>
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Archive className="w-4 h-4 text-gray-600" />
          </button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Team Chat Option */}
      <div className="p-2 border-b border-gray-100">
        <button
          onClick={() => onSelectUser(null)}
          className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 ${
            selectedUser === null
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
              : 'hover:bg-gray-50 text-gray-700'
          }`}
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            selectedUser === null
              ? 'bg-white/20'
              : 'bg-gradient-to-r from-indigo-600 to-purple-600'
          }`}>
            <Users className={`w-5 h-5 ${selectedUser === null ? 'text-white' : 'text-white'}`} />
          </div>
          <div className="flex-1 text-left">
            <div className="font-medium">Team Chat</div>
            <div className={`text-xs ${selectedUser === null ? 'text-indigo-100' : 'text-gray-500'}`}>
              Everyone can see
            </div>
          </div>
          {unreadCounts[0] && (
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full min-w-[20px] text-center">
              {unreadCounts[0]}
            </span>
          )}
        </button>
      </div>

      {/* Contact List */}
      <div className="flex-1 overflow-y-auto">
        {filteredUsers.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No contacts found</p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {filteredUsers.map((user) => {
              const RoleIcon = roleIcons[user.role as keyof typeof roleIcons];
              const roleColorClass = roleColors[user.role as keyof typeof roleColors];
              const isPinned = pinnedUsers.includes(user.id);
              const isSelected = selectedUser?.id === user.id;
              const unreadCount = unreadCounts[user.id] || 0;
              
              return (
                <div
                  key={user.id}
                  onClick={() => handleUserClick(user)}
                  className={`relative flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  {/* Pin Button */}
                  {isPinned && (
                    <div className="absolute -top-1 -right-1 z-10">
                      <div className="w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                        <Pin className="w-2.5 h-2.5 text-white" />
                      </div>
                    </div>
                  )}
                  
                  {/* Avatar with Role Icon */}
                  <div className="relative">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isSelected ? 'bg-white/20' : roleColorClass
                    }`}>
                      <RoleIcon className={`w-5 h-5 ${isSelected ? 'text-white' : ''}`} />
                    </div>
                    {user.is_active && (
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                    )}
                  </div>
                  
                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className={`font-medium truncate ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                        {user.name || 'Unnamed User'}
                      </div>
                      <button
                        onClick={(e) => handlePinToggle(e, user.id)}
                        className={`p-1 rounded hover:bg-gray-200 transition-colors ${
                          isSelected ? 'hover:bg-white/20' : ''
                        }`}
                      >
                        <Pin className={`w-3 h-3 ${
                          isPinned 
                            ? (isSelected ? 'text-yellow-300' : 'text-yellow-500')
                            : (isSelected ? 'text-white/60' : 'text-gray-400')
                        }`} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className={`text-xs truncate ${isSelected ? 'text-indigo-100' : 'text-gray-500'}`}>
                        {user.email} • {user.role}
                      </div>
                      {unreadCount > 0 && (
                        <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full min-w-[20px] text-center">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="p-4 border-t border-gray-100 bg-gray-50">
        <div className="text-xs text-gray-600 space-y-1">
          <div>Total Contacts: {filteredUsers.length}</div>
          <div>Online: {filteredUsers.filter(u => u.is_active).length}</div>
          <div>Pinned: {pinnedUsers.length}</div>
        </div>
      </div>
    </div>
  );
}
