import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  BookOpen, 
  Users, 
  FileText, 
  Calendar, 
  Settings, 
  BarChart3,
  Home,
  BookMarked,
  UserCheck,
  Clock
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { UserRole } from '@/types';
import { cn } from '@/utils/cn';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredRole?: UserRole;
}

const navigation: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: Home,
  },
  {
    name: 'Books',
    href: '/books',
    icon: BookOpen,
  },
  {
    name: 'My Loans',
    href: '/loans',
    icon: BookMarked,
  },
  {
    name: 'Reservations',
    href: '/reservations',
    icon: Calendar,
  },
  {
    name: 'All Loans',
    href: '/admin/loans',
    icon: FileText,
    requiredRole: UserRole.LIBRARIAN,
  },
  {
    name: 'Users',
    href: '/admin/users',
    icon: Users,
    requiredRole: UserRole.LIBRARIAN,
  },
  {
    name: 'Reports',
    href: '/admin/reports',
    icon: BarChart3,
    requiredRole: UserRole.LIBRARIAN,
  },
  {
    name: 'System',
    href: '/admin/system',
    icon: Settings,
    requiredRole: UserRole.ADMIN,
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useAuthStore();

  const filteredNavigation = navigation.filter(item => {
    if (!item.requiredRole) return true;
    if (!user) return false;

    const roleHierarchy = {
      [UserRole.MEMBER]: 1,
      [UserRole.LIBRARIAN]: 2,
      [UserRole.ADMIN]: 3,
    };

    return roleHierarchy[user.role] >= roleHierarchy[item.requiredRole];
  });

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform bg-card shadow-lg transition-transform duration-300 ease-in-out lg:static lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center justify-between border-b px-6">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-8 w-8 text-primary" />
              <h1 className="text-xl font-bold">BookWise</h1>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden"
            >
              <span className="sr-only">Close sidebar</span>
              ×
            </button>
          </div>

          {/* User info */}
          <div className="border-b p-6">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">{user?.firstName} {user?.lastName}</p>
                <p className="text-sm text-muted-foreground">{user?.role}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-6">
            <ul className="sidebar-nav">
              {filteredNavigation.map((item) => (
                <li key={item.name}>
                  <NavLink
                    to={item.href}
                    className={({ isActive }) =>
                      cn(
                        "sidebar-nav-item",
                        isActive && "active"
                      )
                    }
                    onClick={onClose}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          {/* Footer */}
          <div className="border-t p-6">
            <NavLink
              to="/settings"
              className="sidebar-nav-item"
              onClick={onClose}
            >
              <Settings className="h-5 w-5" />
              Settings
            </NavLink>
          </div>
        </div>
      </div>
    </>
  );
};