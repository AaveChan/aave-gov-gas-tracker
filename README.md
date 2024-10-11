<div align="center"> 
  <h1> Aave Caps Steward Generator </h1>
</div>

## Abstract

This project generates :

- the necessary calldata to update caps through Risk Steward
- the related simulation on Tenderly:
  - display the simulation results
  - provide web page link to tenderly simulation

## Setup

```bash
# Install packages
yarn

# Set environment variables
cp .example.env .env
```

## Commands

### Run a Caps update generation

```bash
yarn generate
```

### Get the timelocks of all assets of all markets

```bash
yarn get-timelocks
```

⚠️ Although the code is optimized, we highly recommend to setup the `ALCHEMY_API_KEY` env var to use this command

## Reports

Reports are generated at `out/reports`

## Data updates

- New markets needs to be added manually (in `V3_POOLS` and `POOLS_DATA` of `type.ts` file)
- New Assets are automaticaly added to lib, only the update of the Aave Address Book lib is needed (a dependabot has been added to this original repo in order to create automatic lib update PR)
