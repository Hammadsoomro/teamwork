import { Users, Calendar, Crown, TrendingUp } from 'lucide-react';
import { AppUser } from '@/shared/types';

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

interface UserCardProps {
  user: AppUser;
  salesData?: SalesData;
  isTopSeller?: boolean;
}

const roleColors = {
  admin: 'from-red-500 to-pink-500',
  manager: 'from-blue-500 to-indigo-500', 
  scrapper: 'from-green-500 to-emerald-500',
  user: 'from-gray-500 to-slate-500',
};

const roleLabels = {
  admin: 'Admin',
  manager: 'Manager',
  scrapper: 'Scrapper',
  user: 'User',
};

export default function UserCard({ user, salesData, isTopSeller }: UserCardProps) {
  const roleColor = roleColors[user.role as keyof typeof roleColors] || roleColors.user;
  const roleLabel = roleLabels[user.role as keyof typeof roleLabels] || 'User';

  return (
    <div className={`bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border ${
      isTopSeller ? 'border-yellow-300 bg-gradient-to-br from-yellow-50 to-orange-50' : 'border-gray-100'
    }`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className={`w-12 h-12 bg-gradient-to-r ${roleColor} rounded-xl flex items-center justify-center shadow-lg`}>
              <Users className="w-6 h-6 text-white" />
            </div>
            {isTopSeller && (
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center shadow-lg">
                <Crown className="w-3 h-3 text-white" />
              </div>
            )}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-lg flex items-center">
              {user.name || 'Unnamed User'}
              {isTopSeller && (
                <span className="ml-2 text-xs bg-yellow-500 text-white px-2 py-1 rounded-full font-bold">
                  TOP SELLER
                </span>
              )}
            </h3>
            <p className="text-sm text-gray-600">{user.email}</p>
          </div>
        </div>
        <span className={`px-3 py-1 bg-gradient-to-r ${roleColor} text-white text-xs font-semibold rounded-full shadow-sm`}>
          {roleLabel}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">Today</span>
          </div>
          <p className="text-2xl font-bold text-blue-900">{salesData?.today_sales || 0}</p>
          <p className="text-xs text-blue-700">sales today</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">Monthly</span>
          </div>
          <p className="text-2xl font-bold text-green-900">{salesData?.total_sales || 0}</p>
          <p className="text-xs text-green-700">total sales</p>
        </div>
      </div>

      {/* Sales Categories */}
      {salesData && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Sales Breakdown</h4>
          <div className="grid grid-cols-3 gap-2 text-xs">
            {[
              { key: 'silver_sales', label: 'Silver', color: 'bg-gray-100 text-gray-800' },
              { key: 'gold_sales', label: 'Gold', color: 'bg-yellow-100 text-yellow-800' },
              { key: 'platinum_sales', label: 'Platinum', color: 'bg-slate-100 text-slate-800' },
              { key: 'diamond_sales', label: 'Diamond', color: 'bg-blue-100 text-blue-800' },
              { key: 'ruby_sales', label: 'Ruby', color: 'bg-red-100 text-red-800' },
              { key: 'sapphire_sales', label: 'Sapphire', color: 'bg-indigo-100 text-indigo-800' },
            ].map((type) => {
              const value = salesData[type.key as keyof SalesData] || 0;
              return value > 0 ? (
                <span
                  key={type.key}
                  className={`inline-flex items-center justify-center px-2 py-1 rounded-full font-medium ${type.color}`}
                >
                  {type.label}: {value}
                </span>
              ) : null;
            })}
          </div>
        </div>
      )}

      {user.last_activity_at && (
        <div className="pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            Last active: {new Date(user.last_activity_at).toLocaleDateString()}
          </p>
        </div>
      )}

      {!user.is_active && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Inactive
          </span>
        </div>
      )}
    </div>
  );
}
