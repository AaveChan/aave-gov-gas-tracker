<div align="center"> 
  <h1> Aave Governance Gas Tracker </h1>
</div>

## Abstract

This project calculates the gas consumed by the Aave Delegate platform for DAO actions, providing an accounting system to facilitate refunds from the DAO.

## Setup

```bash
# Install packages
yarn

# Set environment variables
cp .example.env .env
```

## Run an account generation

```bash
yarn gas-tracker
```

This command will fetch the transaction fees of every transactions of delagate platform addresses.
A report will be generate at [out/reports/gas-report.md](out/reports/gas-report.md).

⚠️ All env vars are required to use this command

## Contributions

To add new delegates platforms, add them in [src/configs/config.ts](src/configs/config.ts).
