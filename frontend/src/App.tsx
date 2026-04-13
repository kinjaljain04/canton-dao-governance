import React, { useState } from 'react';
import { DamlLedger } from '@c7/react';
import { ProposalList } from './ProposalList';
import { createParameterChangeProposal } from './governanceService';

// In a real application, you would obtain a token from an authentication service.
// For local development with `dpm sandbox`, you can generate a non-expiring token.
// The payload for a DAO_Member party would look like this:
// {
//   "https://daml.com/ledger-api": {
//     "ledgerId": "sandbox",
//     "applicationId": "canton-dao-governance",
//     "actAs": ["DAO_Member::122022843f5f3e58bda5a70717b07548488e00185a1148a0d18b62c4b1842751fbc4"]
//   }
// }
// You can use a site like jwt.io with a secret (e.g., 'secret') to generate one.
const DAO_MEMBER_PARTY = "DAO_Member::122022843f5f3e58bda5a70717b07548488e00185a1148a0d18b62c4b1842751fbc4";
const DAO_MEMBER_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwczovL2RhbWwuY29tL2xlZGdlci1hcGkiOnsibGVkZ2VySWQiOiJzYW5kYm94IiwiYXBwbGljYXRpb25JZCI6ImNhbnRvbi1kYW8tZ292ZXJuYW5jZSIsImFjdEFzIjpbIkRBT19NZW1iZXI6OjEyMjAyMjg0M2Y1ZjNlNTliZGE1YTcwNzE3YjA3NTQ4NDg4ZTAwMTg1YTExNDhhMGQxOGI2MmM0YjE4NDI3NTFmYmM0Il19fQ.R-e2vYdeO4YJ5a9Vd29pDk3S9v_2DqfN5S9EIM2E2qA";
const HTTP_BASE_URL = "http://localhost:7575";

type Credentials = {
  party: string;
  token: string;
};

const App: React.FC = () => {
  const [credentials, setCredentials] = useState<Credentials | null>(null);

  const login = () => {
    setCredentials({ party: DAO_MEMBER_PARTY, token: DAO_MEMBER_TOKEN });
  };

  const logout = () => {
    setCredentials(null);
  };

  if (!credentials) {
    return (
      <div style={styles.loginContainer}>
        <div style={styles.loginBox}>
          <h1 style={styles.appTitle}>Canton DAO</h1>
          <p>Decentralized Governance</p>
          <button onClick={login} style={styles.button}>
            Login as DAO Member
          </button>
        </div>
      </div>
    );
  }

  return (
    <DamlLedger party={credentials.party} token={credentials.token} httpBaseUrl={HTTP_BASE_URL}>
      <MainDashboard credentials={credentials} onLogout={logout} />
    </DamlLedger>
  );
};

interface MainDashboardProps {
  credentials: Credentials;
  onLogout: () => void;
}

const MainDashboard: React.FC<MainDashboardProps> = ({ credentials, onLogout }) => {
  const [newMinQuorum, setNewMinQuorum] = useState("0.20"); // 20%
  const [newMinVoteDifferential, setNewMinVoteDifferential] = useState("0.10"); // 10%
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateProposal = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await createParameterChangeProposal(credentials, {
        newMinQuorum,
        newMinVoteDifferential,
        // The service layer should fetch the latest config to get the correct version
      });
      alert('Parameter Change Proposal submitted successfully!');
      // Reset form if needed, though this simple form doesn't require it
    } catch (error) {
      console.error("Failed to create proposal:", error);
      alert(`Error: ${(error as Error).message}`);
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.appTitle}>Canton DAO Dashboard</h1>
        <div style={styles.userInfo}>
          <span style={styles.partyId}>Logged in as: {credentials.party.split('::')[0]}</span>
          <button onClick={onLogout} style={styles.logoutButton}>Logout</button>
        </div>
      </header>
      <main style={styles.main}>
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Create New Proposal</h2>
          <p style={styles.cardSubtitle}>Propose changes to the DAO's governance parameters.</p>
          <form onSubmit={handleCreateProposal}>
            <div style={styles.formGroup}>
              <label style={styles.label} htmlFor="minQuorum">New Minimum Quorum (e.g., 0.20 for 20%)</label>
              <input
                style={styles.input}
                id="minQuorum"
                type="number"
                step="0.01"
                min="0.01"
                max="1.00"
                value={newMinQuorum}
                onChange={(e) => setNewMinQuorum(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label} htmlFor="minVoteDiff">New Minimum Vote Differential (e.g., 0.10 for 10%)</label>
              <input
                style={styles.input}
                id="minVoteDiff"
                type="number"
                step="0.01"
                min="0.01"
                max="1.00"
                value={newMinVoteDifferential}
                onChange={(e) => setNewMinVoteDifferential(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <button type="submit" style={styles.button} disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Proposal'}
            </button>
          </form>
        </div>
        <div style={styles.card}>
            <h2 style={styles.cardTitle}>Active Proposals</h2>
            <ProposalList />
        </div>
      </main>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  // Login Screen
  loginContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    background: '#f0f2f5',
  },
  loginBox: {
    padding: '40px',
    background: 'white',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    textAlign: 'center',
  },
  // Main App
  container: {
    fontFamily: 'Arial, sans-serif',
    color: '#333',
    background: '#f0f2f5',
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 2rem',
    backgroundColor: 'white',
    borderBottom: '1px solid #ddd',
  },
  appTitle: {
    margin: 0,
    fontSize: '1.5rem',
    color: '#1a237e',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
  },
  partyId: {
    marginRight: '1rem',
    fontSize: '0.9rem',
    color: '#555',
  },
  logoutButton: {
    padding: '0.5rem 1rem',
    border: '1px solid #ccc',
    borderRadius: '4px',
    cursor: 'pointer',
    background: '#f8f8f8',
  },
  main: {
    padding: '2rem',
  },
  card: {
    background: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    padding: '2rem',
    marginBottom: '2rem',
  },
  cardTitle: {
    marginTop: 0,
    marginBottom: '0.5rem',
    fontSize: '1.25rem',
  },
  cardSubtitle: {
    marginTop: 0,
    marginBottom: '1.5rem',
    color: '#666',
  },
  formGroup: {
    marginBottom: '1rem',
  },
  label: {
    display: 'block',
    marginBottom: '0.5rem',
    fontWeight: 'bold',
    fontSize: '0.9rem',
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #ccc',
    borderRadius: '4px',
    boxSizing: 'border-box',
    fontSize: '1rem',
  },
  button: {
    padding: '0.75rem 1.5rem',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: '#3f51b5',
    color: 'white',
    fontSize: '1rem',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
};

export default App;