import { useEffect, useState } from 'react';
import { Card, Table, Spinner } from 'react-bootstrap';
import apiClient from '../services/ApiClient';
import { globalEventBus } from '../utils/EventBus';
import { useAuth } from '../context/AuthContext';

// Gate configuration
const GATES_DATA = [
  { gateNumber: 'Gate 1', landline: '+91-11-1234-5678' },
  { gateNumber: 'Gate 2', landline: '+91-11-1234-5679' },
  { gateNumber: 'Gate 3', landline: '+91-11-1234-5680' },
];

export default function SecurityGates() {
  const { hasRole } = useAuth();
  const [gates, setGates] = useState(GATES_DATA);
  const [loading, setLoading] = useState(true);
  const isAdmin = hasRole('admin');

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (isAdmin) {
          const { data } = await apiClient.request('/users?role=security&isApproved=true&isActive=true');
          
          // Map security users to their assigned gates based on gateNumber field
          const updatedGates = GATES_DATA.map((gate) => {
            const securityUser = data.users.find(u => u.gateNumber === gate.gateNumber || u.flatNumber === gate.gateNumber);
            return {
              ...gate,
              securityPerson: securityUser ? `${securityUser.firstName} ${securityUser.lastName}` : null,
            };
          });
          setGates(updatedGates);
        }
        setLoading(false);
      } catch (error) {
        globalEventBus.emit('notify', { type: 'danger', message: error.message });
        setLoading(false);
      }
    };
    fetchData();
  }, [isAdmin]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <Spinner animation="border" />
      </div>
    );
  }

  return (
    <div className="d-flex flex-column gap-4">
      <div>
        <h3 className="mb-0">Security Gates</h3>
        <p className="text-muted mb-0">Contact information for security gates</p>
      </div>
      <Card className="shadow-sm">
        <Card.Body>
          <Table responsive hover>
            <thead>
              <tr>
                <th>Gate Number</th>
                <th>Landline Number</th>
                {isAdmin && <th>Security Person</th>}
              </tr>
            </thead>
            <tbody>
              {gates.map((gate, index) => (
                <tr key={index}>
                  <td>{gate.gateNumber}</td>
                  <td>{gate.landline}</td>
                  {isAdmin && <td>{gate.securityPerson || '-'}</td>}
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </div>
  );
}

