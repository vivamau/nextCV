import { Link, useLocation } from 'react-router-dom';
import { Users, BarChart2, FileText, Settings, Briefcase, Sun, Moon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export default function Layout({ children }) {
  const { pathname } = useLocation();
  const { dark, toggle } = useTheme();
  const nav = [
    { to: '/', label: 'Candidates', icon: Users },
    { to: '/vacancies', label: 'Vacancies', icon: Briefcase },
    { to: '/tors', label: 'TORs', icon: FileText },
    { to: '/stats', label: 'Stats', icon: BarChart2 },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3 flex items-center gap-6">
        <span className="font-bold text-lg text-blue-700 dark:text-blue-400">NextCV</span>
        <nav className="flex gap-4">
          {nav.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${
                pathname === to
                  ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Icon size={15} />
              {label}
            </Link>
          ))}
        </nav>
        <button
          onClick={toggle}
          className="ml-auto p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {dark ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
