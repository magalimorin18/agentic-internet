# Hedera Settlement Setup Guide

This guide explains how to configure real Hedera settlements in the agentic-internet application.

## Overview

The application uses Hedera Consensus Service (HCS) to record agent settlements on-chain. When agents reach an agreement or disagreement, a transaction is created on the Hedera network, providing an immutable record of the settlement.

## Environment Variables

Create a `.env` file in the root of your project with the following variables:

```bash
# Required: Hedera Account Credentials
HEDERA_ACCOUNT_ID=0.0.1234567
HEDERA_PRIVATE_KEY=302e020100300506032b657004220420...

# Optional: Existing HCS Topic ID (if not provided, a new topic will be created)
HEDERA_SETTLEMENT_TOPIC_ID=0.0.9876543
```

## Getting Hedera Credentials

### 1. Create a Hedera Testnet Account

1. Go to [Hedera Portal](https://portal.hedera.com/)
2. Create a new account or use an existing one
3. Copy your **Account ID** (format: `0.0.xxxxxxx`)

### 2. Get Your Private Key

You can export your private key from:

- **Hedera Portal**: Account settings → Export Private Key
- **HashPack Wallet**: Settings → Export Private Key
- **Command line**: If using Hedera CLI tools

The private key should be in DER format (hex string starting with `302e...`).

### 3. Fund Your Account (Testnet)

For testnet, you can get free testnet HBAR from:

- [Hedera Testnet Faucet](https://portal.hedera.com/)
- [Hedera Discord](https://discord.gg/hedera)

You'll need HBAR to pay for transaction fees (typically < $0.01 per transaction).

## How It Works

### Automatic Topic Creation

If you don't provide a `HEDERA_SETTLEMENT_TOPIC_ID`, the application will automatically create a new HCS topic on first use. The topic ID will be logged to the console and can be reused by setting it as an environment variable.

### Settlement Transaction

When agents reach a settlement, the application:

1. Creates a JSON payload with:

   - Claim ID
   - Agent IDs
   - Agreement status (agreed/disagreed/partial)
   - Timestamp
   - Settlement statement

2. Submits the payload to the HCS topic as a message

3. Returns the transaction hash/ID for verification

### Fallback Behavior

If Hedera credentials are not configured:

- The application will use a placeholder hash
- Settlement will still work, but won't be recorded on-chain
- A warning will be logged to the console

## Verification

Once a settlement is created, you can verify it on:

- **Testnet**: https://hashscan.io/testnet/transaction/{transactionHash}

The transaction hash is displayed in the UI and is clickable to open HashScan.

## Example Configuration

```bash
# .env.local
HEDERA_ACCOUNT_ID=0.0.7305752
HEDERA_PRIVATE_KEY=302e020100300506032b657004220420a1b2c3d4e5f6...
HEDERA_SETTLEMENT_TOPIC_ID=0.0.1234567
```

## Security Best Practices

1. **Never commit `.env.local` to version control** (already in `.gitignore`)
2. **Rotate private keys regularly**
3. **Use environment-specific credentials** (different for dev/staging/prod)
4. **Limit account permissions** - only grant necessary permissions

## Troubleshooting

### Error: "Hedera credentials not configured"

- Check that `HEDERA_ACCOUNT_ID` and `HEDERA_PRIVATE_KEY` are set in `.env.local`
- Restart your Next.js development server after adding environment variables

### Error: "Insufficient balance"

- Your account needs HBAR to pay for transaction fees
- Get testnet HBAR from the faucet

### Error: "Invalid private key format"

- Ensure the private key is in DER format (hex string)
- Remove any spaces or newlines from the private key

### Topic Creation Fails

- Ensure your account has sufficient HBAR
- Check that your account has permission to create topics
- Verify network connectivity

## Cost Estimation

- **Topic Creation**: ~$0.05 (one-time)
- **Message Submission**: ~$0.0001 per settlement
- **Total**: Very low cost, typically < $0.01 per settlement

## Next Steps

1. Set up your Hedera account and get credentials
2. Add environment variables to `.env.local`
3. Restart your development server
4. Test with a claim discussion
5. Verify the settlement on HashScan

For more information, see the [Hedera Documentation](https://docs.hedera.com/).
