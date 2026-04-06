// --- Domain-Specific Type Definitions ---
// These should mirror the Daml templates used in the DAO governance project.

/**
 * Represents the structure of a contract as returned by the JSON API.
 * @template T The type of the contract's payload.
 */
export interface Contract<T> {
  contractId: string;
  templateId: string;
  payload: T;
  signatories: string[];
  observers: string[];
  agreementText: string;
}

/**
 * Represents the details of an on-chain action to be executed if a proposal passes.
 */
export interface ExecutionAction {
  executor: string;
  // The payload will vary based on the action type (e.g., TreasurySpend, ParameterChange)
  // Using `any` for flexibility, but could be a discriminated union in a real app.
  payload: any;
}

/**
 * Represents the payload of the `Proposal:Proposal` template.
 */
export interface Proposal {
  dao: string;
  proposer: string;
  proposalId: string;
  title: string;
  description: string;
  votingDeadline: string; // ISO-8601 Time format
  executionAction: ExecutionAction;
  votesFor: string; // Decimal as a string
  votesAgainst: string; // Decimal as a string
  voters: string[]; // List of Party identifiers
  quorum: string; // Decimal as a string (e.g., "0.20" for 20%)
  threshold: string; // Decimal as a string (e.g., "0.50" for 50%)
}

/**
 * Represents the payload of the `DAO:DAO` or a similar central governance contract.
 */
export interface DAO {
  operator: string;
  members: string[];
  treasury: string; // Decimal as a string
  // ... other DAO parameters
}

// --- JSON API Command and Query Types ---

/**
 * Structure for querying the ledger.
 * Used with the `/v1/query` endpoint.
 */
interface Query {
  templateIds: string[];
  query?: any;
}

/**
 * Structure for exercising a choice on a contract.
 * Used with the `/v1/exercise` endpoint.
 */
interface ExerciseCommand {
  templateId: string;
  contractId: string;
  choice: string;
  argument: object;
}


// --- Constants ---
const LEDGER_URL = process.env.REACT_APP_LEDGER_URL || 'http://localhost:7575';
const PROPOSAL_TEMPLATE_ID = 'Proposal:Proposal';
const DAO_TEMPLATE_ID = 'DAO:DAO'; // Assuming this is the main DAO contract template


// --- Private Helper Functions ---

/**
 * A generic wrapper around `fetch` for making authenticated requests to the Canton JSON API.
 * @param endpoint The API endpoint to call (e.g., /v1/query).
 * @param jwt The JWT for authorization, representing the party's identity.
 * @param body The JSON body for the POST request.
 * @returns The JSON response from the API.
 * @throws An error if the network request or the API call fails.
 */
async function ledgerFetch(endpoint: string, jwt: string, body: object): Promise<any> {
  const url = `${LEDGER_URL}${endpoint}`;
  const headers = {
    'Authorization': `Bearer ${jwt}`,
    'Content-Type': 'application/json',
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Ledger API Error (${response.status}):`, errorText);
      throw new Error(`Ledger API request failed with status ${response.status}`);
    }

    const jsonResponse = await response.json();
    if (jsonResponse.status !== 200) {
      console.error(`Ledger Command Error (${jsonResponse.status}):`, jsonResponse.errors);
      throw new Error(`Ledger command failed: ${jsonResponse.errors?.join(', ') || 'Unknown error'}`);
    }
    
    return jsonResponse;

  } catch (error) {
    console.error(`Failed to fetch from ledger at ${url}:`, error);
    throw error;
  }
}

// --- Public Service Functions ---

/**
 * Fetches all active contracts for a given template ID that are visible to the party.
 * @param templateId The full template ID (e.g., "Module:Template").
 * @param jwt The party's JWT.
 * @returns A promise that resolves to an array of active contracts.
 */
export const getActiveContracts = async <T>(templateId: string, jwt: string): Promise<Contract<T>[]> => {
  const query: Query = { templateIds: [templateId] };
  const response = await ledgerFetch('/v1/query', jwt, query);
  return response.result || [];
};

/**
 * Fetches all active governance proposals visible to the party.
 * @param jwt The party's JWT.
 * @returns A promise that resolves to an array of Proposal contracts.
 */
export const getProposals = async (jwt: string): Promise<Contract<Proposal>[]> => {
  return getActiveContracts<Proposal>(PROPOSAL_TEMPLATE_ID, jwt);
};

/**
 * Creates a new treasury spend proposal by exercising a choice on the main DAO contract.
 * @param jwt The proposer's JWT.
 * @param daoContractId The ContractId of the central DAO contract.
 * @param proposalData The details of the proposal.
 * @returns The result of the exercise command, including created contracts.
 */
export const createTreasurySpendProposal = async (
  jwt: string,
  daoContractId: string,
  proposalData: {
    proposalId: string;
    title: string;
    description: string;
    destinationParty: string;
    amount: string; // Decimal as a string
    votingDays: number; // e.g., 7
  }
) => {
  const command: ExerciseCommand = {
    templateId: DAO_TEMPLATE_ID,
    contractId: daoContractId,
    choice: 'ProposeTreasurySpend',
    argument: proposalData,
  };

  const response = await ledgerFetch('/v1/exercise', jwt, command);
  return response.result;
};

/**
 * Casts a vote on a specific proposal. The voter's identity is derived from the JWT.
 * The ledger logic is expected to determine the voter's weight (e.g., from token holdings).
 * @param jwt The voter's JWT.
 * @param proposalContractId The ContractId of the Proposal to vote on.
 * @param supports `true` for a "For" vote, `false` for an "Against" vote.
 * @returns The result of the exercise command.
 */
export const castVote = async (
  jwt: string,
  proposalContractId: string,
  supports: boolean
) => {
  const command: ExerciseCommand = {
    templateId: PROPOSAL_TEMPLATE_ID,
    contractId: proposalContractId,
    choice: 'CastVote',
    argument: {
      supports,
    },
  };

  const response = await ledgerFetch('/v1/exercise', jwt, command);
  return response.result;
};

/**
 * Triggers the vote tallying and potential execution for a completed proposal.
 * This choice should be callable by any party after the voting deadline has passed.
 * @param jwt The JWT of the party triggering the tally.
 * @param proposalContractId The ContractId of the Proposal to tally.
 * @returns The result of the exercise command, which may include events for proposal execution or rejection.
 */
export const tallyAndExecute = async (jwt:string, proposalContractId: string) => {
  const command: ExerciseCommand = {
    templateId: PROPOSAL_TEMPLATE_ID,
    contractId: proposalContractId,
    choice: 'TallyVotes',
    argument: {}, // This choice typically requires no arguments
  };

  const response = await ledgerFetch('/v1/exercise', jwt, command);
  return response.result;
};