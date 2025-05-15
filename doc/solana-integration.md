# Solana Integration

The A2A Server includes integration with the Solana blockchain ecosystem for subscription management and verification. This document describes how the Solana client component works and how to use it for verifying subscriptions.

## Overview

The Solana integration allows the A2A Server to:

1. Verify that a wallet has an active subscription to use the agent
2. Check subscription expiration dates
3. Interface with the Agent NFT Market program on Solana

## SolanaClient Class

The `SolanaClient` class provides an interface for interacting with the Agent NFT Market program on Solana:

```typescript
export class SolanaClient {
  constructor(programId: string, rpcUrl?: string, walletPrivateKey?: string) {
    // Initialize connection, program, and wallet...
  }
  
  // Public methods
  getConnection(): Connection;
  getProgram(): Program;
  getProvider(): AnchorProvider;
  getWalletPublicKey(): PublicKey | undefined;
  hasWallet(): boolean;
  isReadOnly(): boolean;
  async getUserAgentSubscription(userPublicKey: PublicKey, agentNftMint: PublicKey): Promise<SubscriptionInfo | null>;
  async hasActiveSubscription(userPublicKey: PublicKey, agentNftMint: PublicKey): Promise<boolean>;
  async getSubscriptionExpiration(userPublicKey: PublicKey, agentNftMint: PublicKey): Promise<number | null>;
  
  // Private methods
  private findAgentNftPDA(programId: PublicKey, agentNftMint: PublicKey): PublicKey;
  private findSubscriptionPDA(programId: PublicKey, userPublicKey: PublicKey, agentNftMint: PublicKey): PublicKey;
}
```

## Creating a SolanaClient

You can create a Solana client using the `createSolanaClient` helper function:

```typescript
import { createSolanaClient } from "@agenticdao/crypto-a2a-server";

// Create a client with default RPC (devnet)
const client = createSolanaClient("AgenT1ne2qArKJyP8zcFJhbsvZ4eZ1iSemvJfvCVNsH");

// Create a client with custom RPC and wallet
const client = createSolanaClient(
  "AgenT1ne2qArKJyP8zcFJhbsvZ4eZ1iSemvJfvCVNsH",
  "https://api.mainnet-beta.solana.com",
  "4xEcw8smqL9aFvy9z6PDMXvwWBrBRV3qnxBK7nVPNV9iuGh1..."
);
```

## Read-Only vs Full Mode

The `SolanaClient` can operate in two modes:

1. **Read-Only Mode**: When no wallet private key is provided, the client can only read data from the blockchain. It cannot send transactions or perform write operations.

2. **Full Mode**: When a wallet private key is provided, the client can both read data and send transactions to the blockchain.

## Checking Subscriptions

To check if a user has an active subscription:

```typescript
import { PublicKey } from "@solana/web3.js";
import { createSolanaClient } from "@agenticdao/crypto-a2a-server";

async function checkSubscription(userWallet: string, agentNft: string) {
  const client = createSolanaClient(
    process.env.AGENT_MARKET_ADDRESS!,
    process.env.SOLANA_RPC_URL,
    process.env.WALLET_PRIVATE_KEY
  );
  
  const userPublicKey = new PublicKey(userWallet);
  const agentNftMint = new PublicKey(agentNft);
  
  // Simple boolean check for active subscription
  const isActive = await client.hasActiveSubscription(userPublicKey, agentNftMint);
  
  if (isActive) {
    console.log("User has an active subscription");
    
    // Get the expiration timestamp
    const expiresAt = await client.getSubscriptionExpiration(userPublicKey, agentNftMint);
    if (expiresAt) {
      const expirationDate = new Date(expiresAt * 1000);
      console.log(`Subscription expires on: ${expirationDate.toLocaleString()}`);
    }
  } else {
    console.log("User does not have an active subscription");
  }
  
  // Get full subscription information
  const subscription = await client.getUserAgentSubscription(userPublicKey, agentNftMint);
  if (subscription) {
    console.log("Subscription details:", subscription);
  }
}
```

## Subscription Info Structure

The `SubscriptionInfo` interface represents subscription data from the blockchain:

```typescript
interface SubscriptionInfo {
  user: PublicKey;
  agentNftMint: PublicKey;
  metadataUrl: string;
  expiresAt: BN;
  isActive?: boolean;
}
```

## Integration with Signature Verification

The Solana client is automatically used by the A2A Server when signature verification is enabled and `AGENT_NFT_ADDRESS` is set:

```typescript
import { A2AServer } from "@agenticdao/crypto-a2a-server";

// With signature verification and subscription checks
const server = new A2AServer(myHandler, { 
  enableVerification: true
});

// Environment variables:
// AGENT_NFT_ADDRESS=AgY2V8C2aXgLo3VJqjGE6xjzwxXQiLNC1rjYBUmVAzkU
// AGENT_MARKET_ADDRESS=AgenT1ne2qArKJyP8zcFJhbsvZ4eZ1iSemvJfvCVNsH
// WALLET_PRIVATE_KEY=4xEcw8smqL9aFvy9z6PDMXvwWBrBRV3qnxBK7nVPNV9iuGh1...
// SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

## Agent NFT Market Program

The Solana integration is designed to work with the Agent NFT Market program on Solana, which manages:

- Agent NFT minting and metadata
- User subscriptions to agents
- Subscription renewals and expirations

## PDA (Program Derived Address) Structure

The Solana client uses PDAs to locate data on the blockchain:

1. **Agent NFT PDA**: `[Buffer.from("agent-nft"), agentNftMint.toBuffer()]`
2. **Subscription PDA**: `[Buffer.from("subscription"), userPublicKey.toBuffer(), agentNftMint.toBuffer()]`

## Error Handling

The Solana client handles common errors that might occur when interacting with the blockchain:

```typescript
try {
  const isActive = await client.hasActiveSubscription(userPublicKey, agentNftMint);
  // Use result...
} catch (error) {
  if (error instanceof AnchorError) {
    // Handle Anchor program errors
    console.error("Program error:", error.error);
  } else {
    // Handle network or other errors
    console.error("Error checking subscription:", error);
  }
}
```

## RPC Configuration

The Solana client defaults to the Devnet RPC URL, but you can specify other networks:

- **Devnet**: `https://api.devnet.solana.com`
- **Testnet**: `https://api.testnet.solana.com`
- **Mainnet Beta**: `https://api.mainnet-beta.solana.com`

## Advanced Usage

### Manual Verification Middleware

You can manually use the verification middleware in custom Express applications:

```typescript
import express from "express";
import { verifySolanaSignature, createSolanaClient } from "@agenticdao/crypto-a2a-server";
import { PublicKey } from "@solana/web3.js";

const app = express();
const solanaClient = createSolanaClient(
  process.env.AGENT_MARKET_ADDRESS!,
  process.env.SOLANA_RPC_URL,
  process.env.WALLET_PRIVATE_KEY
);
const agentNftMint = process.env.AGENT_NFT_ADDRESS!;

// Add verification middleware to a specific route
app.post("/api/protected", 
  (req, res, next) => verifySolanaSignature(
    req, res, next, 
    solanaClient, 
    agentNftMint
  ),
  (req, res) => {
    // This only runs if verification passes
    res.json({ success: true, message: "Authenticated request" });
  }
);

app.listen(3000);
```

## Performance Considerations

- **Blockchain Calls**: Each subscription verification involves a blockchain query, which can add latency
- **Caching**: Consider implementing a cache for subscription status to reduce RPC calls
- **Connection Pooling**: The Solana client reuses connections where possible to improve performance 