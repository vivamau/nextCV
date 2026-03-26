import { Link, useLocation } from 'react-router-dom';
import { Users, BarChart2, FileText, Settings, Briefcase } from 'lucide-react';

export default function Layout({ children }) {
  const { pathname } = useLocation();
  const nav = [
    { to: '/', label: 'Candidates', icon: Users },
    { to: '/vacancies', label: 'Vacancies', icon: Briefcase },
    { to: '/tors', label: 'TORs', icon: FileText },
    { to: '/stats', label: 'Stats', icon: BarChart2 },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-6">
        <span className="font-bold text-lg text-blue-700">NextCV</span>
        <nav className="flex gap-4">
          {nav.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${
                pathname === to
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:text-blue-700 hover:bg-gray-100'
              }`}
            >
              <Icon size={15} />
              {label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
