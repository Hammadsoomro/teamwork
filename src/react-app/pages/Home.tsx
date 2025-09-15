import { useEffect } from 'react';
import { useAuth } from '@getmocha/users-service/react';
import { Navigate } from 'react-router';
import { Users, ArrowRight, MessageSquare, Database, Shield } from 'lucide-react';

export default function HomePage() {
  const { user, isPending } = useAuth();

  // Add Google Fonts
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  if (isPending) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="animate-spin">
          <Users className="w-10 h-10 text-indigo-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      {/* Header */}
      <header className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">TeamFlow</h1>
          </div>
          <a
            href="/login"
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-2 px-6 rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
          >
            Sign In
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-6 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Team Collaboration
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent block">
              Made Simple
            </span>
          </h2>
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
            Streamline your team communication, manage data distribution, and coordinate workflows with role-based access control.
          </p>

          <a
            href="/login"
            className="inline-flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200 text-lg"
          >
            <span>Get Started</span>
            <ArrowRight className="w-5 h-5" />
          </a>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mt-20">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 border border-white/20 shadow-xl hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300">
            <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center mb-6">
              <MessageSquare className="w-7 h-7 text-indigo-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Team Chat</h3>
            <p className="text-gray-600">
              Built-in chat system for seamless communication between all team members, from admins to users.
            </p>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 border border-white/20 shadow-xl hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300">
            <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center mb-6">
              <Database className="w-7 h-7 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Smart Data Distribution</h3>
            <p className="text-gray-600">
              Automated data scraping, sorting, and distribution with customizable timing and user targeting.
            </p>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 border border-white/20 shadow-xl hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300">
            <div className="w-14 h-14 bg-cyan-100 rounded-2xl flex items-center justify-center mb-6">
              <Shield className="w-7 h-7 text-cyan-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Role-Based Access</h3>
            <p className="text-gray-600">
              Granular permissions with admin, manager, scrapper, and user roles to maintain security and organization.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-20">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-12 text-white">
            <h3 className="text-3xl font-bold mb-4">Ready to streamline your team?</h3>
            <p className="text-indigo-100 mb-8 text-lg max-w-2xl mx-auto">
              Join thousands of teams already using TeamFlow to collaborate more effectively and manage their data workflows.
            </p>
            <a
              href="/login"
              className="inline-flex items-center space-x-2 bg-white text-indigo-600 font-semibold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200 text-lg"
            >
              <span>Start Free Today</span>
              <ArrowRight className="w-5 h-5" />
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
