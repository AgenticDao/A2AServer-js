# Signature Verification

The A2A Server supports Solana wallet signature verification as a security mechanism to authenticate client requests. This document explains how to enable and use this feature to secure your agent API.

## Overview

Signature verification ensures that only authorized clients can interact with your agent by requiring them to sign their requests with a valid Solana wallet. This adds an extra layer of security beyond simple API keys or tokens.

## How It Works

1. **Client-side**: The client generates a message, signs it using their Solana wallet, and includes the signature, message, and public key in the request headers.

2. **Server-side**: The A2A Server verifies that the signature is valid for the given message and public key.

3. **Optional Subscription Check**: The server can also verify that the wallet has an active subscription to the agent's service using an on-chain check.

## Enabling Signature Verification

To enable signature verification, set the `enableVerification` option when creating your A2A Server:

```typescript
import { A2AServer } from "a2a-server";

const server = new A2AServer(myHandler, { 
  enableVerification: true 
});
```

## Required Environment Variables

When signature verification is enabled, the server uses these environment variables:

- `AGENT_NFT_ADDRESS`: The NFT mint address representing this agent (for subscription checks)
- `AGENT_MARKET_ADDRESS`: The Solana program address for the agent market
- `WALLET_PRIVATE_KEY`: The private key for the agent's wallet (for verifying subscriptions)
- `SOLANA_RPC_URL`: URL for the Solana RPC node

Example `.env` file:

```
AGENT_NFT_ADDRESS=AgY2V8C2aXgLo3VJqjGE6xjzwxXQiLNC1rjYBUmVAzkU
AGENT_MARKET_ADDRESS=AgenT1ne2qArKJyP8zcFJhbsvZ4eZ1iSemvJfvCVNsH
WALLET_PRIVATE_KEY=4xEcw8smqL9aFvy9z6PDMXvwWBrBRV3qnxBK7nVPNV9iuGh1...
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

## Required Request Headers

When signature verification is enabled, clients must include these headers with each request:

- `X-Solana-Signature`: Base64-encoded signature
- `X-Solana-Nonce`: The message that was signed (usually a nonce or timestamp)
- `X-Solana-PublicKey`: The public key of the wallet that signed the message

## Client-Side Implementation

Here's an example of how clients would sign requests:

```typescript
import { Connection, Keypair } from '@solana/web3.js';
import nacl from 'tweetnacl';

async function makeSignedRequest(endpoint, body, wallet) {
  // Create a unique nonce (can be a timestamp or random value)
  const nonce = Date.now().toString();
  
  // Convert nonce to bytes for signing
  const nonceBytes = new TextEncoder().encode(nonce);
  
  // Sign the nonce with the wallet
  const signature = nacl.sign.detached(
    nonceBytes,
    wallet.secretKey
  );
  
  // Convert signature to base64
  const signatureBase64 = Buffer.from(signature).toString('base64');
  
  // Make the request with verification headers
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Solana-Signature': signatureBase64,
      'X-Solana-Nonce': nonce,
      'X-Solana-PublicKey': wallet.publicKey.toString()
    },
    body: JSON.stringify(body)
  });
  
  return await response.json();
}
```

## Testing with Signatures

You can use tools like `@solana/web3.js` and cURL to test signature verification:

```bash
# Generate a signature (using Node.js)
node -e "
const { Keypair } = require('@solana/web3.js');
const nacl = require('tweetnacl');
const bs58 = require('bs58');

// Load or generate wallet
const wallet = Keypair.fromSecretKey(bs58.decode('YOUR_PRIVATE_KEY'));

// Create nonce
const nonce = Date.now().toString();
const message = new TextEncoder().encode(nonce);

// Sign message
const signature = nacl.sign.detached(message, wallet.secretKey);
const signatureBase64 = Buffer.from(signature).toString('base64');

console.log('Nonce:', nonce);
console.log('Public Key:', wallet.publicKey.toString());
console.log('Signature:', signatureBase64);
"

# Use the output in a cURL request
curl -X POST http://localhost:41241 \
  -H "Content-Type: application/json" \
  -H "X-Solana-Signature: SIGNATURE_HERE" \
  -H "X-Solana-Nonce: NONCE_HERE" \
  -H "X-Solana-PublicKey: PUBLIC_KEY_HERE" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tasks/send",
    "id": 1,
    "params": {
      "id": "task-123",
      "message": {
        "role": "user",
        "parts": [{"type": "text", "text": "Hello, agent!"}]
      }
    }
  }'
```

## Subscription Verification

When both signature verification and the agent NFT address are configured, the server will also check if the wallet has an active subscription to use the agent.

This requires:

1. The `AGENT_NFT_ADDRESS` to be set to the agent's NFT mint address
2. The `AGENT_MARKET_ADDRESS` to be set to the Solana program that manages subscriptions
3. A valid wallet and RPC URL for checking the subscription status

## Error Responses

If verification fails, the server will respond with a 403 Forbidden status and one of these error messages:

```json
// Missing headers
{
  "jsonrpc": "2.0",
  "id": null,
  "error": {
    "code": -32099,
    "message": "Missing signature verification headers",
    "data": {
      "details": "All X-Solana-* headers are required for authentication"
    }
  }
}

// Invalid signature
{
  "jsonrpc": "2.0",
  "id": null,
  "error": {
    "code": -32099,
    "message": "Invalid signature",
    "data": {
      "details": "The provided signature could not be verified"
    }
  }
}

// No active subscription
{
  "jsonrpc": "2.0",
  "id": null,
  "error": {
    "code": -32099,
    "message": "Subscription required",
    "data": {
      "details": "User does not have an active subscription for this agent"
    }
  }
}
```

## Security Considerations

1. **Nonce Management**: Clients should use a unique nonce for each request to prevent replay attacks.

2. **Key Security**: Keep the agent's private key secure and consider using environment variables or a secure key vault.

3. **Request Timeouts**: Consider adding a timestamp to the nonce and rejecting requests with old timestamps.

4. **Subscription Caching**: For performance, consider caching subscription status for short periods instead of checking the blockchain for every request.

## Best Practices

1. **Use HTTPS**: Always use HTTPS in production to protect the signature and other sensitive data in transit.

2. **Rate Limiting**: Implement rate limiting to prevent brute force attacks against the signature verification.

3. **Subscription Grace Period**: Consider allowing a small grace period after subscription expiration to improve user experience.

4. **Client Libraries**: Provide client libraries that handle signature generation for common platforms. 