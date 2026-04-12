import React, { useState, useCallback } from 'react';
import { useParty, useLedger, useStreamQueries, Ledger } from '@c7/react';
import type { Proposal, VoteType } from '@canton-dao/governance-lib/lib/Governance';
import { voteOnProposal, executeProposal } from './governanceService';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  LinearProgress,
  CircularProgress,
  Alert,
  Snackbar,
} from '@mui/material';
import type { Party, ContractId } from '@daml/types';

// Helper to determine the status of a proposal
const getProposalStatus = (proposal: Proposal, currentTime: Date): { text: string; color: 'success' | 'error' | 'primary' | 'default' } => {
  const deadline = new Date(proposal.votingDeadline);

  if (proposal.executed) {
    return { text: 'Executed', color: 'default' };
  }

  if (currentTime > deadline) {
    const totalVotes = parseFloat(proposal.forVotes) + parseFloat(proposal.againstVotes);
    const totalVotingPower = parseFloat(proposal.totalVotingPower);
    const quorum = totalVotes / totalVotingPower;
    const requiredQuorum = parseFloat(proposal.quorum);
    const requiredThreshold = parseFloat(proposal.threshold);
    const forPercentage = totalVotes > 0 ? parseFloat(proposal.forVotes) / totalVotes : 0;

    if (quorum < requiredQuorum) {
      return { text: 'Failed (Quorum not met)', color: 'error' };
    }
    if (forPercentage >= requiredThreshold) {
      return { text: 'Succeeded (Ready to execute)', color: 'success' };
    }
    return { text: 'Failed (Threshold not met)', color: 'error' };
  }
  return { text: 'Active', color: 'primary' };
};

const formatDecimal = (d: string): string => {
    return parseFloat(d).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface ProposalCardProps {
  proposal: { contractId: ContractId<Proposal>; payload: Proposal };
  party: Party;
  ledger: Ledger;
  currentTime: Date;
  onAction: (message: string) => void;
}

const ProposalCard: React.FC<ProposalCardProps> = ({ proposal, party, ledger, currentTime, onAction }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { contractId, payload } = proposal;
  const status = getProposalStatus(payload, currentTime);
  const userHasVoted = payload.votes.some(([voter, _]) => voter === party);
  const isVotingOpen = status.text === 'Active';

  const forVotes = parseFloat(payload.forVotes);
  const againstVotes = parseFloat(payload.againstVotes);
  const totalVotes = forVotes + againstVotes;
  const forPercentage = totalVotes > 0 ? (forVotes / totalVotes) * 100 : 0;
  const againstPercentage = totalVotes > 0 ? (againstVotes / totalVotes) * 100 : 0;

  const handleVote = useCallback(async (choice: VoteType) => {
    setIsLoading(true);
    setError(null);
    try {
      await voteOnProposal(ledger, contractId, choice);
      onAction('Vote cast successfully!');
    } catch (err: any) {
      console.error('Voting failed:', err);
      setError(err.message || 'An unknown error occurred during voting.');
    } finally {
      setIsLoading(false);
    }
  }, [ledger, contractId, onAction]);

  const handleExecute = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await executeProposal(ledger, contractId);
      onAction('Proposal executed successfully!');
    } catch (err: any) {
        console.error('Execution failed:', err);
        setError(err.message || 'An unknown error occurred during execution.');
    } finally {
        setIsLoading(false);
    }
  }, [ledger, contractId, onAction]);

  return (
    <Card sx={{ mb: 3, boxShadow: 3 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="h6" component="div">
            {payload.description}
          </Typography>
          <Chip label={status.text} color={status.color} />
        </Box>
        <Typography sx={{ mb: 2 }} color="text.secondary" variant="body2">
          Proposed by: <Typography component="span" variant="body2" sx={{ fontFamily: 'monospace' }}>{payload.proposer}</Typography>
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="body2">Voting Deadline: {new Date(payload.votingDeadline).toLocaleString()}</Typography>
            <Typography variant="body2">Quorum: {(parseFloat(payload.quorum) * 100).toFixed(0)}% of total supply</Typography>
            <Typography variant="body2">Threshold: {(parseFloat(payload.threshold) * 100).toFixed(0)}% of votes</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2">Total Supply at Proposal: {formatDecimal(payload.totalVotingPower)}</Typography>
            <Typography variant="body2">For Votes: {formatDecimal(payload.forVotes)}</Typography>
            <Typography variant="body2">Against Votes: {formatDecimal(payload.againstVotes)}</Typography>
            <Typography variant="body2">Abstain Votes: {formatDecimal(payload.abstainVotes)}</Typography>
          </Grid>
        </Grid>

        <Box sx={{ mt: 2 }}>
          <Box display="flex" justifyContent="space-between">
            <Typography variant="caption" color="success.main">For ({forPercentage.toFixed(1)}%)</Typography>
            <Typography variant="caption" color="error.main">Against ({againstPercentage.toFixed(1)}%)</Typography>
          </Box>
          <Box display="flex" sx={{ height: 10, borderRadius: 5, overflow: 'hidden', bgcolor: 'grey.300' }}>
            <Box sx={{ width: `${forPercentage}%`, bgcolor: 'success.main' }} />
            <Box sx={{ width: `${againstPercentage}%`, bgcolor: 'error.main' }} />
          </Box>
        </Box>

        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

        <Box sx={{ mt: 3, display: 'flex', gap: 1, alignItems: 'center' }}>
          {isVotingOpen && !userHasVoted && (
            <>
              <Button variant="contained" color="success" onClick={() => handleVote('For')} disabled={isLoading}>Vote For</Button>
              <Button variant="contained" color="error" onClick={() => handleVote('Against')} disabled={isLoading}>Vote Against</Button>
              <Button variant="outlined" onClick={() => handleVote('Abstain')} disabled={isLoading}>Abstain</Button>
            </>
          )}
          {isLoading && <CircularProgress size={24} />}
          {userHasVoted && isVotingOpen && <Typography color="text.secondary">You have already voted.</Typography>}
          {status.text === 'Succeeded (Ready to execute)' && (
            <Button variant="contained" color="secondary" onClick={handleExecute} disabled={isLoading}>
              Execute Proposal
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export const ProposalList: React.FC = () => {
  const party = useParty();
  const ledger = useLedger();
  const { contracts: proposals, loading } = useStreamQueries(Proposal);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const handleAction = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarOpen(true);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
        <Typography sx={{ml: 2}}>Loading Proposals...</Typography>
      </Box>
    );
  }

  const sortedProposals = [...proposals].sort((a, b) =>
    new Date(b.payload.votingDeadline).getTime() - new Date(a.payload.votingDeadline).getTime()
  );

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h4" gutterBottom>
        Governance Proposals
      </Typography>
      {sortedProposals.length === 0 ? (
        <Card><CardContent><Typography>No active proposals found.</Typography></CardContent></Card>
      ) : (
        sortedProposals.map((proposal) => (
          <ProposalCard
            key={proposal.contractId}
            proposal={proposal}
            party={party}
            ledger={ledger}
            currentTime={new Date()}
            onAction={handleAction}
          />
        ))
      )}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
};

export default ProposalList;