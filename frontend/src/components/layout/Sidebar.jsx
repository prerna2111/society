import { NavLink } from 'react-router-dom';
import { HouseDoor, Megaphone, CashStack, ClipboardData, People, ClipboardCheck, JournalText, PeopleFill, ChatDots, Person } from 'react-bootstrap-icons';
import './layout.css';
import { useAuth } from '../../context/AuthContext';

const baseNavItems = [
  { to: '/dashboard', label: 'Dashboard', icon: HouseDoor },
  { to: '/notices', label: 'Notices', icon: Megaphone },
  { to: '/maintenance', label: 'Maintenance', icon: CashStack },
  { to: '/complaints', label: 'Complaints', icon: ClipboardData },
  { to: '/polls', label: 'Polls', icon: ClipboardCheck },
  { to: '/visitors', label: 'Visitors', icon: People },
  { to: '/payments', label: 'Payments', icon: JournalText },
  { to: '/security-gates', label: 'Security Gates', icon: PeopleFill },
  { to: '/community', label: 'Community', icon: ChatDots },
];

export function Sidebar() {
  const { hasRole, user } = useAuth();
  let navItems = [];

  if (hasRole('security')) {
    // Security only sees Visitors page and Profile (no dashboard)
    navItems = [
      { to: '/visitors', label: 'Visitors', icon: People },
      { to: '/profile', label: 'Profile', icon: Person }
    ];
  } else {
    // For other roles, filter based on permissions
    navItems = [...baseNavItems];
    
    // Hide maintenance and payments for tenants
    if (hasRole('tenant')) {
      navItems = navItems.filter(item => !['/maintenance', '/payments'].includes(item.to));
    }
    
    // Hide community for security
    if (hasRole('security')) {
      navItems = navItems.filter(item => item.to !== '/community');
    }
    
    // Add members page for admin, committee, and residents (owner/tenant)
    if (hasRole(['admin', 'committee'])) {
      navItems.push({ to: '/admin/users', label: 'Members', icon: PeopleFill });
    } else if (hasRole(['owner', 'tenant'])) {
      navItems.push({ to: '/members', label: 'Members', icon: PeopleFill });
    }
    
    // Add profile page for all users
    navItems.push({ to: '/profile', label: 'Profile', icon: Person });
  }

  return (
    <aside className="sc-sidebar d-flex flex-column bg-dark text-white">
      <div className="px-4 py-3 border-bottom border-secondary">
        <h4 className="m-0 fw-bold">Society Connect</h4>
        <small className="text-secondary">Manage your community</small>
      </div>
      <nav className="flex-grow-1">
        <ul className="nav flex-column mt-3">
          {navItems.map(({ to, label, icon: Icon }) => (
            <li className="nav-item" key={to}>
              <NavLink
                to={to}
                className={({ isActive }) => `nav-link text-white px-4 py-2 ${isActive ? 'active' : ''}`}
              >
                <Icon className="me-2" size={18} />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="px-4 py-3 border-top border-secondary small text-secondary">
        © {new Date().getFullYear()} Society Connect
      </div>
    </aside>
  );
}
