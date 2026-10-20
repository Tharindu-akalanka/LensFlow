import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import {
  Camera,
  Calendar,
  DollarSign,
  Clock,
  LogOut,
  Moon,
  Sun,
  ChevronRight,
  TrendingUp,
  User,
  Bell,
  CheckCircle,
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, clearAuth } = useAuthStore();
  const [darkMode, setDarkMode] = useState(true);

  // Initialize theme
  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  // Mock data for initial MVP dashboard
  const stats = [
    {
      label: 'Total Revenue',
      value: '$12,450',
      change: '+15.2%',
      icon: DollarSign,
      color: 'text-emerald-500 bg-emerald-500/10',
    },
    {
      label: 'Active Bookings',
      value: '28',
      change: '+4.8%',
      icon: Calendar,
      color: 'text-primary-500 bg-primary-500/10',
    },
    {
      label: 'Pending Edits',
      value: '14 shoots',
      change: '-12%',
      icon: Clock,
      color: 'text-amber-500 bg-amber-500/10',
    },
    {
      label: 'Completed Shoots',
      value: '142',
      change: '+8.3%',
      icon: Camera,
      color: 'text-indigo-500 bg-indigo-500/10',
    },
  ];

  const upcomingShoots = [
    {
      id: 1,
      client: 'Sarah & Mark',
      type: 'Wedding',
      date: 'July 5, 2026',
      time: '10:00 AM',
      status: 'Confirmed',
    },
    {
      id: 2,
      client: 'Apex Media',
      type: 'Commercial',
      date: 'July 8, 2026',
      time: '2:00 PM',
      status: 'Pending Assignment',
    },
    {
      id: 3,
      client: 'Elena Rostova',
      type: 'Portrait',
      date: 'July 12, 2026',
      time: '11:00 AM',
      status: 'Confirmed',
    },
  ];

  const pendingTasks = [
    {
      id: 1,
      text: 'Edit Wedding Teaser Album (Sarah & Mark)',
      deadline: 'Today',
      priority: 'High',
    },
    {
      id: 2,
      text: 'Send contract draft to Apex Media',
      deadline: 'Tomorrow',
      priority: 'Medium',
    },
    {
      id: 3,
      text: 'Upload backup from Portrait Shoot (Elena)',
      deadline: 'July 4',
      priority: 'Low',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-dark-950 dark:text-slate-100 transition-colors duration-300">
      {/* Header bar */}
      <header className="glass sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 bg-primary-500 rounded-lg flex items-center justify-center text-white">
              <Camera className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-xl tracking-tight">
              Lens<span className="text-primary-500">Flow</span>
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-dark-800 rounded-lg transition-all duration-200"
              title="Toggle Dark Mode"
            >
              {darkMode ? (
                <Sun className="w-5 h-5 text-yellow-400" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>

            <div className="relative">
              <button className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-dark-800 rounded-lg transition-all duration-200">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2. h-2 bg-primary-500 rounded-full"></span>
              </button>
            </div>

            <div className="flex items-center space-x-3 border-l border-slate-200 dark:border-slate-800 pl-4">
              <div className="flex flex-col items-end">
                <span className="text-sm font-semibold">
                  {user?.name || 'Studio Owner'}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                  {user?.role?.toLowerCase().replace('_', ' ') || 'Owner'}
                </span>
              </div>
              <div className="w-9 h-9 bg-slate-300 dark:bg-dark-800 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                title="Sign Out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              Studio Dashboard
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              Welcome back to your workspace. Here is an overview of your studio
              activities.
            </p>
          </div>
          <button className="bg-primary-500 hover:bg-primary-600 text-white font-semibold px-4 py-2.5 rounded-xl transition-all duration-200 transform active:scale-95 shadow-md shadow-primary-500/10 hover:shadow-primary-500/20">
            Create Booking Request
          </button>
        </div>

        {/* Analytics Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <div
              key={i}
              className="glass p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 group border border-slate-200/50 dark:border-slate-800/50"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                    {stat.label}
                  </p>
                  <h3 className="text-3xl font-extrabold mt-1 tracking-tight">
                    {stat.value}
                  </h3>
                </div>
                <div
                  className={`p-3 rounded-xl transition-transform group-hover:scale-105 duration-300 ${stat.color}`}
                >
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
              <div className="flex items-center space-x-1.5 mt-4 text-xs font-semibold">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <span className="text-emerald-500">{stat.change}</span>
                <span className="text-slate-500 dark:text-slate-500 font-normal">
                  vs last month
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upcoming Shoots Table */}
          <div className="glass p-6 rounded-2xl shadow-sm border border-slate-200/50 dark:border-slate-800/50 lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold tracking-tight">
                Upcoming Shoots
              </h2>
              <button className="text-sm text-primary-500 hover:underline flex items-center">
                View Calendar <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="pb-3">Client</th>
                    <th className="pb-3">Type</th>
                    <th className="pb-3">Scheduled Date</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
                  {upcomingShoots.map((shoot) => (
                    <tr
                      key={shoot.id}
                      className="hover:bg-slate-100/30 dark:hover:bg-dark-900/30 transition-colors"
                    >
                      <td className="py-3.5 font-semibold">{shoot.client}</td>
                      <td className="py-3.5 text-slate-500 dark:text-slate-400">
                        {shoot.type}
                      </td>
                      <td className="py-3.5">
                        <span className="block font-medium">{shoot.date}</span>
                        <span className="text-xs text-slate-400">
                          {shoot.time}
                        </span>
                      </td>
                      <td className="py-3.5">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            shoot.status === 'Confirmed'
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : 'bg-amber-500/10 text-amber-500'
                          }`}
                        >
                          {shoot.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pending Tasks List */}
          <div className="glass p-6 rounded-2xl shadow-sm border border-slate-200/50 dark:border-slate-800/50 space-y-4">
            <h2 className="text-xl font-bold tracking-tight">My Tasks</h2>
            <div className="space-y-3">
              {pendingTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-4 bg-slate-100/50 dark:bg-dark-900/40 hover:bg-slate-100/80 dark:hover:bg-dark-900/80 border border-slate-200/30 dark:border-slate-800/30 rounded-xl transition-all duration-200 flex items-start space-x-3"
                >
                  <CheckCircle className="w-5 h-5 text-slate-400 hover:text-primary-500 transition-colors mt-0.5 cursor-pointer flex-shrink-0" />
                  <div className="flex-grow space-y-1">
                    <p className="text-sm font-medium leading-snug">
                      {task.text}
                    </p>
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="text-slate-400">
                        Due {task.deadline}
                      </span>
                      <span className="text-slate-300 dark:text-slate-700">
                        •
                      </span>
                      <span
                        className={`font-semibold ${
                          task.priority === 'High'
                            ? 'text-red-500'
                            : task.priority === 'Medium'
                              ? 'text-amber-500'
                              : 'text-slate-500'
                        }`}
                      >
                        {task.priority} Priority
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
