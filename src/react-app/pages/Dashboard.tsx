import { useState, useEffect, useCallback } from 'react';
import { useUsers } from '@/react-app/hooks/useUsers';
import Sidebar from '@/react-app/components/Sidebar';
import UserCard from '@/react-app/components/UserCard';
import ChatPanel from '@/react-app/components/ChatPanel';
import Sales from '@/react-app/pages/Sales';
import NumberSorter from '@/react-app/pages/NumberSorter';
import { 
  Loader2, 
  Plus, 
  Trash2, 
  Shield, 
  ShieldOff, 
  MessageSquare,
  TrendingUp,
  Calculator,
  Crown
} from 'lucide-react';
import { useApi } from '@/react-app/hooks/useApi';

interface SalesData {
  user_id: number;
  today_sales: number;
  total_sales: number;
  silver_sales: number;
  gold_sales: number;
  platinum_sales: number;
  diamond_sales: number;
  ruby_sales: number;
  sapphire_sales: number;
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const { users, currentUser, loading, fetchUsers, createUser } = useUsers();
  const { request } = useApi();
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    name: '',
    role: 'user',
    password: ''
  });

  const fetchSalesData = useCallback(async () => {
    try {
      const response = await request('/api/sales');
      setSalesData(response.sales || []);
    } catch (error) {
      console.error('Failed to fetch sales data:', error);
    }
  }, [request]);

  const handleCreateUser = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createUser(newUser);
      setNewUser({ email: '', name: '', role: 'user', password: '' });
      setShowCreateUser(false);
    } catch (error) {
      console.error('Failed to create user:', error);
    }
  }, [createUser, newUser]);

  const handleRemoveUser = useCallback(async (userId: number) => {
    if (confirm('Are you sure you want to remove this user?')) {
      try {
        await request(`/api/users/${userId}`, { method: 'DELETE' });
        await fetchUsers();
      } catch (error) {
        console.error('Failed to remove user:', error);
      }
    }
  }, [request, fetchUsers]);

  const handleBlockUser = useCallback(async (userId: number, isActive: boolean) => {
    try {
      await request(`/api/users/${userId}`, {
        method: 'PUT',
        body: { is_active: !isActive }
      });
      await fetchUsers();
    } catch (error) {
      console.error('Failed to update user status:', error);
    }
  }, [request, fetchUsers]);

  useEffect(() => {
    if (currentUser) {
      fetchSalesData();
    }
  }, [currentUser, fetchSalesData]);

  // Auto-load users when admin panel is active
  useEffect(() => {
    if (activeTab === 'admin' && currentUser?.role === 'admin' && users.length === 0) {
      fetchUsers();
    }
  }, [activeTab, currentUser?.role, users.length, fetchUsers]);

  // Early returns after all hooks have been called
  if (loading && !currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin">
            <Loader2 className="w-8 h-8 text-blue-600" />
          </div>
          <p className="text-slate-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">Unable to load your user profile.</p>
        </div>
      </div>
    );
  }

  // Create a map of sales data by user_id for easier lookup
  const salesByUser = salesData.reduce((acc, sale) => {
    acc[sale.user_id] = sale;
    return acc;
  }, {} as Record<number, SalesData>);

  // Find top seller
  const topSeller = salesData.reduce((top, sale) => {
    return sale.total_sales > (top?.total_sales || 0) ? sale : top;
  }, null as SalesData | null);

  const renderDashboardContent = () => {
    if (activeTab === 'chat') {
      return (
        <div className="p-6">
          <ChatPanel currentUser={currentUser} />
        </div>
      );
    }

    if (activeTab === 'admin' && currentUser.role === 'admin') {
      return (
        <div className="p-6">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Admin Panel</h2>
                <p className="text-gray-600">Manage team members and permissions</p>
              </div>
              <button
                onClick={() => setShowCreateUser(true)}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-2 px-4 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add User</span>
              </button>
            </div>
          </div>

          {showCreateUser && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New User</h3>
              <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <input
                  type="email"
                  placeholder="Email address"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
                <input
                  type="text"
                  placeholder="Name (optional)"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="user">User</option>
                  <option value="scrapper">Scrapper</option>
                  <option value="manager">Manager</option>
                </select>
                <div className="flex space-x-2">
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex-1"
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateUser(false)}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {users.map(user => {
              const userSales = salesByUser[user.id];
              const isTopSeller = topSeller?.user_id === user.id && (topSeller?.total_sales || 0) > 0;
              
              return (
                <div key={user.id} className="relative">
                  <UserCard 
                    user={user} 
                    salesData={userSales}
                    isTopSeller={isTopSeller}
                  />
                  {user.id !== currentUser.id && (
                    <div className="absolute top-4 right-4 flex space-x-2">
                      <button
                        onClick={() => handleBlockUser(user.id, user.is_active)}
                        className={`p-2 rounded-lg transition-colors ${
                          user.is_active 
                            ? 'bg-yellow-100 hover:bg-yellow-200 text-yellow-700' 
                            : 'bg-green-100 hover:bg-green-200 text-green-700'
                        }`}
                        title={user.is_active ? 'Block User' : 'Unblock User'}
                      >
                        {user.is_active ? <ShieldOff className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleRemoveUser(user.id)}
                        className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
                        title="Remove User"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if (activeTab === 'sales') {
      return <Sales />;
    }

    if (activeTab === 'sorter' && (currentUser.role === 'scrapper' || currentUser.role === 'admin')) {
      return <NumberSorter />;
    }

    // Default dashboard view - show all team members
    return (
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Welcome back, {currentUser.name || 'User'}!</h2>
          <p className="text-gray-600">Here's your team overview and performance</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          {/* Quick Actions */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button
                  onClick={() => setActiveTab('chat')}
                  className="bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-200 rounded-xl p-4 text-left transition-all duration-200"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-blue-900">Team Chat</p>
                      <p className="text-sm text-blue-700">Connect with team</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('sales')}
                  className="bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 border border-green-200 rounded-xl p-4 text-left transition-all duration-200"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-green-900">Sales Tracker</p>
                      <p className="text-sm text-green-700">View performance</p>
                    </div>
                  </div>
                </button>

                {(currentUser.role === 'scrapper' || currentUser.role === 'admin') && (
                  <button
                    onClick={() => setActiveTab('sorter')}
                    className="bg-gradient-to-r from-orange-50 to-red-50 hover:from-orange-100 hover:to-red-100 border border-orange-200 rounded-xl p-4 text-left transition-all duration-200"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center">
                        <Calculator className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-orange-900">Number Sorter</p>
                        <p className="text-sm text-orange-700">Manage data</p>
                      </div>
                    </div>
                  </button>
                )}

                {currentUser.role === 'admin' && (
                  <button
                    onClick={() => setActiveTab('admin')}
                    className="bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 border border-purple-200 rounded-xl p-4 text-left transition-all duration-200"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                        <Shield className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-purple-900">Admin Panel</p>
                        <p className="text-sm text-purple-700">Manage users</p>
                      </div>
                    </div>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Team Members Cards */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Team Members</h3>
            {topSeller && (
              <div className="flex items-center space-x-2 text-sm text-yellow-600">
                <Crown className="w-4 h-4" />
                <span>
                  Top Seller: {users.find(u => u.id === topSeller.user_id)?.name || 'Unknown'} 
                  ({topSeller.total_sales} sales)
                </span>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {users.map(user => {
              const userSales = salesByUser[user.id];
              const isTopSeller = topSeller?.user_id === user.id && (topSeller?.total_sales || 0) > 0;
              
              return (
                <UserCard 
                  key={user.id}
                  user={user} 
                  salesData={userSales}
                  isTopSeller={isTopSeller}
                />
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex">
      <Sidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        userRole={currentUser.role}
      />
      <main className="flex-1 lg:ml-0">
        {renderDashboardContent()}
      </main>
    </div>
  );
}
