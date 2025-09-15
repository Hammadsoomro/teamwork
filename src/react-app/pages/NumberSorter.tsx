import { useState, useEffect } from 'react';
import { Calculator, Power, PowerOff, Hash, Users, Timer } from 'lucide-react';
import { useUsers } from '@/react-app/hooks/useUsers';
import { useScrapper } from '@/react-app/hooks/useScrapper';

export default function NumberSorter() {
  const [numbers, setNumbers] = useState('');
  const [sortedNumbers, setSortedNumbers] = useState<string[]>([]);
  const [autoDistributor, setAutoDistributor] = useState(false);
  const [linesPerUser, setLinesPerUser] = useState(1);
  const [sendToOnlineOnly, setSendToOnlineOnly] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState(1);
  
  
  const { users, fetchUsers } = useUsers();
  const { settings, updateSettings } = useScrapper();

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (settings) {
      setLinesPerUser(settings.lines_per_user);
      setTimerMinutes(Math.floor(settings.timer_interval / 60));
      setAutoDistributor(settings.is_active);
    }
  }, [settings]);

  // Auto remove duplicates and sort numbers
  useEffect(() => {
    const numberLines = numbers.split('\n')
      .map(line => line.trim())
      .filter(line => line !== '');
    
    // Remove duplicates and sort
    const uniqueSorted = [...new Set(numberLines)].sort((a, b) => {
      // Try to sort numerically first
      const numA = parseFloat(a);
      const numB = parseFloat(b);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      // Fall back to string sorting
      return a.localeCompare(b);
    });
    
    setSortedNumbers(uniqueSorted);
  }, [numbers]);

  const handleToggleAutoDistributor = async () => {
    const newStatus = !autoDistributor;
    setAutoDistributor(newStatus);
    
    try {
      await updateSettings({
        lines_per_user: linesPerUser,
        selected_users: [], // Send to all by default
        timer_interval: timerMinutes * 60,
        is_active: newStatus
      });
    } catch (error) {
      console.error('Failed to update distributor settings:', error);
    }
  };

  const handleSettingsUpdate = async () => {
    try {
      await updateSettings({
        lines_per_user: linesPerUser,
        selected_users: [], // Send to all by default
        timer_interval: timerMinutes * 60,
        is_active: autoDistributor
      });
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
  };

  const linesPerUserOptions = [1, 3, 5, 7, 11, 13, 15];
  const timerOptions = [1, 3, 5, 7, 10];
  
  const eligibleUsers = users.filter(user => user.role === 'user' || user.role === 'manager');
  const onlineUsers = eligibleUsers.filter(user => user.is_active);
  const targetUsers = sendToOnlineOnly ? onlineUsers : eligibleUsers;

  const duplicatesRemoved = numbers.split('\n').length - sortedNumbers.length;

  return (
    <div className="h-full bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto h-full">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <Calculator className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Number Sorter</h2>
                <p className="text-gray-600">Auto-sort, remove duplicates & distribute numbers</p>
              </div>
            </div>
            
            {/* Auto Distributor Toggle */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">Auto Distributor</span>
                <button
                  onClick={handleToggleAutoDistributor}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    autoDistributor
                      ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg'
                      : 'bg-green-600 hover:bg-green-700 text-white shadow-lg'
                  }`}
                >
                  {autoDistributor ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                  <span>{autoDistributor ? 'ON' : 'OFF'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Distribution Settings Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Hash className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Lines/User:</span>
                <select
                  value={linesPerUser}
                  onChange={(e) => setLinesPerUser(Number(e.target.value))}
                  onBlur={handleSettingsUpdate}
                  className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {linesPerUserOptions.map(num => (
                    <option key={num} value={num}>{num}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Target:</span>
                <select
                  value={sendToOnlineOnly ? 'online' : 'all'}
                  onChange={(e) => setSendToOnlineOnly(e.target.value === 'online')}
                  className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All ({eligibleUsers.length})</option>
                  <option value="online">Online ({onlineUsers.length})</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <Timer className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Interval:</span>
                <select
                  value={timerMinutes}
                  onChange={(e) => setTimerMinutes(Number(e.target.value))}
                  onBlur={handleSettingsUpdate}
                  className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {timerOptions.map(minutes => (
                    <option key={minutes} value={minutes}>{minutes}m</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className={`px-3 py-1 rounded-lg text-xs font-medium ${
                autoDistributor 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {autoDistributor ? 'Active' : 'Inactive'}
              </div>
              <span className="text-xs text-gray-500">
                Ready: {Math.min(sortedNumbers.length, linesPerUser * targetUsers.length)} numbers
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 h-[calc(100vh-16rem)]">
          {/* Number Sorter Area */}
          <div className="col-span-1">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 h-full flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <Calculator className="w-5 h-5 text-gray-600" />
                  <span className="font-medium text-gray-900">Number Input</span>
                </div>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span>Raw Lines: {numbers.split('\n').filter(line => line.trim()).length}</span>
                  <span>Unique: {sortedNumbers.length}</span>
                  <span>Duplicates: {duplicatesRemoved}</span>
                </div>
              </div>

              {/* Input and Output */}
              <div className="flex-1 flex">
                {/* Input Side */}
                <div className="flex-1 flex flex-col border-r border-gray-200">
                  <div className="p-3 bg-gray-50 border-b border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700">Raw Input</h4>
                  </div>
                  <textarea
                    value={numbers}
                    onChange={(e) => setNumbers(e.target.value)}
                    placeholder="Enter numbers here, one per line..."
                    className="flex-1 p-4 border-0 resize-none focus:outline-none font-mono text-sm"
                    style={{ 
                      fontFamily: 'Consolas, Monaco, "Courier New", monospace'
                    }}
                  />
                </div>

                {/* Output Side */}
                <div className="flex-1 flex flex-col">
                  <div className="p-3 bg-green-50 border-b border-gray-200">
                    <h4 className="text-sm font-medium text-green-700">Sorted & Deduplicated</h4>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {/* Line Numbers */}
                    <div className="flex">
                      <div className="w-12 bg-gray-50 border-r border-gray-200 p-2 text-right text-xs text-gray-500 font-mono">
                        {sortedNumbers.map((_, index) => (
                          <div key={index} className="h-6 leading-6">
                            {index + 1}
                          </div>
                        ))}
                      </div>
                      <div className="flex-1 p-4">
                        <div className="font-mono text-sm space-y-1">
                          {sortedNumbers.length === 0 ? (
                            <p className="text-gray-500 italic">Sorted numbers will appear here...</p>
                          ) : (
                            sortedNumbers.map((number, index) => (
                              <div key={index} className="py-0.5">
                                {number}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-100 bg-gray-50">
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>
                    Auto-distribution {autoDistributor ? 'enabled' : 'disabled'} • 
                    Next send: {autoDistributor ? `${timerMinutes} min` : 'Manual only'}
                  </span>
                  <span>
                    {sortedNumbers.length > 0 && `Ready to distribute ${Math.min(sortedNumbers.length, linesPerUser * targetUsers.length)} numbers`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
