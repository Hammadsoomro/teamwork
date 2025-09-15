import { useState, useEffect } from 'react';
import { TrendingUp, Edit3, Save, X, Plus, Calendar, Users, Crown } from 'lucide-react';
import { useUsers } from '@/react-app/hooks/useUsers';
import { useApi } from '@/react-app/hooks/useApi';

interface SalesData {
  id: number;
  user_id: number;
  today_sales: number;
  total_sales: number;
  silver_sales: number;
  gold_sales: number;
  platinum_sales: number;
  diamond_sales: number;
  ruby_sales: number;
  sapphire_sales: number;
  month_year: string;
  updated_at: string;
  user_name?: string;
  user_email?: string;
  user_role?: string;
}

interface EditValues {
  today_sales: number;
  total_sales: number;
  silver_sales: number;
  gold_sales: number;
  platinum_sales: number;
  diamond_sales: number;
  ruby_sales: number;
  sapphire_sales: number;
}

const salesTypes = [
  { key: 'silver_sales', label: 'Silver', color: 'bg-gray-100 text-gray-800' },
  { key: 'gold_sales', label: 'Gold', color: 'bg-yellow-100 text-yellow-800' },
  { key: 'platinum_sales', label: 'Platinum', color: 'bg-slate-100 text-slate-800' },
  { key: 'diamond_sales', label: 'Diamond', color: 'bg-blue-100 text-blue-800' },
  { key: 'ruby_sales', label: 'Ruby', color: 'bg-red-100 text-red-800' },
  { key: 'sapphire_sales', label: 'Sapphire', color: 'bg-indigo-100 text-indigo-800' },
];

export default function Sales() {
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [editingUser, setEditingUser] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<EditValues>({
    today_sales: 0,
    total_sales: 0,
    silver_sales: 0,
    gold_sales: 0,
    platinum_sales: 0,
    diamond_sales: 0,
    ruby_sales: 0,
    sapphire_sales: 0,
  });
  const [loading, setLoading] = useState(true);
  
  const { users, currentUser, fetchUsers } = useUsers();
  const { request } = useApi();

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    fetchUsers();
    fetchSalesData();
  }, []);

  const fetchSalesData = async () => {
    try {
      setLoading(true);
      const response = await request('/api/sales');
      setSalesData(response.sales || []);
    } catch (error) {
      console.error('Failed to fetch sales data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (userId: number, userSales: SalesData | undefined) => {
    setEditingUser(userId);
    setEditValues({
      today_sales: userSales?.today_sales || 0,
      total_sales: userSales?.total_sales || 0,
      silver_sales: userSales?.silver_sales || 0,
      gold_sales: userSales?.gold_sales || 0,
      platinum_sales: userSales?.platinum_sales || 0,
      diamond_sales: userSales?.diamond_sales || 0,
      ruby_sales: userSales?.ruby_sales || 0,
      sapphire_sales: userSales?.sapphire_sales || 0,
    });
  };

  const handleSave = async (userId: number) => {
    try {
      // Auto-calculate total_sales from individual sales types
      const calculatedTotal = editValues.silver_sales + editValues.gold_sales + 
                             editValues.platinum_sales + editValues.diamond_sales + 
                             editValues.ruby_sales + editValues.sapphire_sales;

      await request('/api/sales', {
        method: 'PUT',
        body: {
          user_id: userId,
          today_sales: editValues.today_sales,
          total_sales: calculatedTotal,
          silver_sales: editValues.silver_sales,
          gold_sales: editValues.gold_sales,
          platinum_sales: editValues.platinum_sales,
          diamond_sales: editValues.diamond_sales,
          ruby_sales: editValues.ruby_sales,
          sapphire_sales: editValues.sapphire_sales,
        },
      });
      await fetchSalesData();
      setEditingUser(null);
    } catch (error) {
      console.error('Failed to update sales:', error);
    }
  };

  const handleCancel = () => {
    setEditingUser(null);
    setEditValues({
      today_sales: 0,
      total_sales: 0,
      silver_sales: 0,
      gold_sales: 0,
      platinum_sales: 0,
      diamond_sales: 0,
      ruby_sales: 0,
      sapphire_sales: 0,
    });
  };

  const handleResetMonth = async () => {
    if (confirm('Are you sure you want to reset all total sales for this month?')) {
      try {
        await request('/api/sales/reset', {
          method: 'POST',
        });
        await fetchSalesData();
      } catch (error) {
        console.error('Failed to reset monthly sales:', error);
      }
    }
  };

  // Create a map of sales data by user_id for easier lookup
  const salesByUser = salesData.reduce((acc, sale) => {
    acc[sale.user_id] = sale;
    return acc;
  }, {} as Record<number, SalesData>);

  // Get total sales for the team
  const totalTeamSales = salesData.reduce((sum, sale) => sum + sale.total_sales, 0);
  const totalTodaySales = salesData.reduce((sum, sale) => sum + sale.today_sales, 0);

  // Find top seller
  const topSeller = salesData.reduce((top, sale) => {
    return sale.total_sales > (top?.total_sales || 0) ? sale : top;
  }, null as SalesData | null);

  if (loading && !currentUser) {
    return (
      <div className="h-full bg-gradient-to-br from-slate-50 to-blue-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading sales data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-full mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Sales Tracker</h2>
                <p className="text-gray-600">Track team sales performance by category</p>
              </div>
            </div>
            
            {isAdmin && (
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>Current Month: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                </div>
                <button
                  onClick={handleResetMonth}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4 rotate-45" />
                  <span>Reset Month</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Today's Sales</p>
                <p className="text-3xl font-bold">{totalTodaySales}</p>
              </div>
              <div className="w-12 h-12 bg-blue-500 bg-opacity-30 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Monthly Total</p>
                <p className="text-3xl font-bold">{totalTeamSales}</p>
              </div>
              <div className="w-12 h-12 bg-green-500 bg-opacity-30 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Team Members</p>
                <p className="text-3xl font-bold">{users.length}</p>
              </div>
              <div className="w-12 h-12 bg-purple-500 bg-opacity-30 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-yellow-600 to-orange-600 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm font-medium">Top Seller</p>
                <p className="text-lg font-bold truncate">
                  {topSeller ? (users.find(u => u.id === topSeller.user_id)?.name || 'Unknown') : 'None'}
                </p>
                <p className="text-sm text-yellow-200">
                  {topSeller ? `${topSeller.total_sales} sales` : '0 sales'}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-500 bg-opacity-30 rounded-xl flex items-center justify-center">
                <Crown className="w-6 h-6" />
              </div>
            </div>
          </div>
        </div>

        {/* Sales Table */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Team Sales Performance</h3>
            <p className="text-sm text-gray-600 mt-1">
              {isAdmin ? 'Click edit to modify sales data • Total sales auto-calculated from categories' : 'View-only access'} • 
              Total sales reset monthly on the 1st
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Team Member
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Today's Sales
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Monthly Total
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sales Categories
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Updated
                  </th>
                  {isAdmin && (
                    <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => {
                  const userSales = salesByUser[user.id];
                  const isEditing = editingUser === user.id;
                  const isTopSeller = topSeller?.user_id === user.id && (topSeller?.total_sales || 0) > 0;
                  
                  return (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="relative">
                            <div className="w-8 h-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                              <span className="text-xs font-bold text-white">
                                {(user.name || user.email).charAt(0).toUpperCase()}
                              </span>
                            </div>
                            {isTopSeller && (
                              <div className="absolute -top-2 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
                                <Crown className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900 flex items-center">
                              {user.name || 'Unnamed User'}
                              {isTopSeller && (
                                <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-semibold">
                                  Top Seller
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          user.role === 'admin' ? 'bg-red-100 text-red-800' :
                          user.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                          user.role === 'scrapper' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editValues.today_sales}
                            onChange={(e) => setEditValues({
                              ...editValues,
                              today_sales: parseInt(e.target.value) || 0
                            })}
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                            min="0"
                          />
                        ) : (
                          <div className="text-sm font-medium text-gray-900">
                            {userSales?.today_sales || 0}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {userSales?.total_sales || 0}
                          {isEditing && (
                            <div className="text-xs text-gray-500 mt-1">
                              Auto-calculated from categories
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {isEditing ? (
                          <div className="grid grid-cols-3 gap-2 min-w-max">
                            {salesTypes.map((type) => (
                              <div key={type.key} className="flex flex-col">
                                <label className="text-xs text-gray-600 mb-1">{type.label}</label>
                                <input
                                  type="number"
                                  value={editValues[type.key as keyof EditValues]}
                                  onChange={(e) => setEditValues({
                                    ...editValues,
                                    [type.key]: parseInt(e.target.value) || 0
                                  })}
                                  className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                                  min="0"
                                />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1 min-w-max">
                            {salesTypes.map((type) => {
                              const value = Number(userSales?.[type.key as keyof SalesData]) || 0;
                              return value > 0 ? (
                                <span
                                  key={type.key}
                                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${type.color}`}
                                >
                                  {type.label}: {value}
                                </span>
                              ) : null;
                            })}
                            {!salesTypes.some(type => Number(userSales?.[type.key as keyof SalesData]) > 0) && (
                              <span className="text-xs text-gray-400">No sales yet</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {userSales?.updated_at 
                          ? new Date(userSales.updated_at).toLocaleDateString()
                          : 'Never'
                        }
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                          {isEditing ? (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleSave(user.id)}
                                className="text-green-600 hover:text-green-900 flex items-center"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={handleCancel}
                                className="text-red-600 hover:text-red-900 flex items-center"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleEdit(user.id, userSales)}
                              className="text-indigo-600 hover:text-indigo-900 flex items-center"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
