import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout.jsx';
import { PublicLayout } from './components/layout/PublicLayout.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Notices from './pages/Notices.jsx';
import Maintenance from './pages/Maintenance.jsx';
import Complaints from './pages/Complaints.jsx';
import Polls from './pages/Polls.jsx';
import Visitors from './pages/Visitors.jsx';
import Payments from './pages/Payments.jsx';
import Users from './pages/Users.jsx';
import SecurityGates from './pages/SecurityGates.jsx';
import Community from './pages/Community.jsx';
import Profile from './pages/Profile.jsx';

function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
      </Route>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/notices" element={<Notices />} />
        <Route path="/maintenance" element={<Maintenance />} />
        <Route path="/complaints" element={<Complaints />} />
        <Route path="/polls" element={<Polls />} />
        <Route path="/visitors" element={<Visitors />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/admin/users" element={<Users />} />
        <Route path="/security-gates" element={<SecurityGates />} />
        <Route path="/members" element={<Users />} />
        <Route path="/community" element={<Community />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
