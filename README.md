# Canton DAO Governance

[![CI](https://github.com/your-org/canton-dao-governance/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/canton-dao-governance/actions/workflows/ci.yml)

A decentralized autonomous organization (DAO) governance framework built with Daml smart contracts for the Canton Network. This project provides a robust, on-ledger system for token holders to propose, vote on, and automatically execute governance decisions.

## Core Concepts

This DAO model enables community-driven control over on-chain assets and parameters. The key components are:

*   **Governance Token:** A fungible token (`GovernanceToken`) that represents voting power. The more tokens a party holds, the more weight their vote carries.
*   **Treasury:** A smart contract holding the DAO's assets (e.g., digital currency, other tokens). Funds can only be moved by a successful governance proposal.
*   **Proposals:** Token holders can submit proposals to enact changes. Supported proposal types include:
    *   **Treasury Spend:** Propose transferring assets from the DAO treasury to a specific party.
    *   **Configuration Change:** Propose updates to the DAO's own governance parameters, such as voting periods or quorum thresholds.
*   **Voting:** Once a proposal is created, a voting period begins. Token holders cast votes (`For`, `Against`, or `Abstain`). Votes are weighted by the amount of tokens held at the time of voting.
*   **Execution:** After the voting period ends, the proposal can be resolved. If the proposal meets the required quorum (minimum participation) and majority thresholds, its defined action is automatically executed on the ledger. This ensures that the will of the voters is carried out trustlessly.

## Daml Model Overview

The core logic is captured in a set of interconnected Daml templates:

*   `DAO.Token.GovernanceToken`: A standard fungible token contract used for voting power.
*   `DAO.Treasury.Treasury`: A simple contract that holds a fungible asset and is controlled by the DAO's `Governor` role.
*   `DAO.Governor.Config`: Stores the DAO's configurable parameters (e.g., `minQuorum`, `passThreshold`, `votingPeriodDays`).
*   `DAO.Governor.Proposal`: The central template representing a governance proposal. It tracks the proposed action, votes, deadlines, and state (e.g., `Voting`, `Succeeded`, `Failed`).
*   `DAO.Governor.Governed`: An interface that defines contracts which can be controlled by the DAO. The `Treasury` implements this interface.

## Project Structure

```
.
├── .github/workflows/ci.yml   # GitHub Actions CI pipeline
├── daml/
│   ├── DAO/
│   │   ├── Governor.daml      # Proposal, Config, Governed templates
│   │   ├── Token.daml         # GovernanceToken template
│   │   └── Treasury.daml      # Treasury template
│   └── Main.daml              # Daml Script for testing and setup
├── .gitignore
├── daml.yaml                  # Daml project configuration
└── README.md                  # This file
```

## Getting Started

### Prerequisites

*   Daml SDK v3.1.0 or later. [Installation Guide](https://docs.daml.com/getting-started/installation.html)
*   Java 11 or higher

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-org/canton-dao-governance.git
    cd canton-dao-governance
    ```

2.  **Build the Daml model:**
    This compiles the Daml code into a DAR (Daml Archive) file.
    ```bash
    daml build
    ```

3.  **Run the tests:**
    This executes the test scenarios defined in `daml/Main.daml` using the Daml Script runner.
    ```bash
    daml test
    ```

4.  **Start a local Canton ledger:**
    To interact with the contracts, start a local development ledger.
    ```bash
    daml start
    ```
    This will also launch a Navigator instance, a simple UI for viewing ledger data, typically at `http://localhost:7500`.

## Example Workflow: Treasury Spend

Here is a typical sequence of actions for proposing and executing a treasury spend:

1.  **Setup:** A `DAO Operator` sets up the initial `Config`, `Treasury`, and distributes `GovernanceToken` contracts to members Alice and Bob.
2.  **Proposal Creation:** Alice, a token holder, creates a `Proposal` to send 1000 units of the treasury asset to a third-party, Charlie. She locks a small amount of her tokens to create the proposal.
3.  **Voting:**
    *   The proposal enters the `Voting` state.
    *   Alice votes `For` the proposal with her remaining tokens.
    *   Bob, another token holder, also votes `For`.
4.  **Tallying & Execution:**
    *   The voting period (e.g., 7 days) passes.
    *   Anyone can exercise the `Resolve` choice on the proposal.
    *   The contract checks if the total votes (`For` + `Against`) meet the `minQuorum` and if the `For` votes exceed the `passThreshold`.
    *   Since the conditions are met, the proposal state changes to `Succeeded`.
    *   The `Resolve` choice automatically exercises the `Spend` choice on the `Treasury` contract, transferring 1000 units to Charlie. The action is executed atomically with the proposal's resolution.
5.  **Failure Case:** If the proposal had failed to meet quorum or the pass threshold, its state would have changed to `Failed`, and no treasury action would have occurred. Alice's locked tokens would be returned to her.

## Contributing

Contributions are welcome! Please feel free to open an issue or submit a pull request.

1.  Fork the repository.
2.  Create a new feature branch (`git checkout -b feature/my-new-feature`).
3.  Make your changes and commit them (`git commit -am 'Add some feature'`).
4.  Push to the branch (`git push origin feature/my-new-feature`).
5.  Create a new Pull Request.

## License

This project is licensed under the Apache 2.0 License. See the `LICENSE` file for details.