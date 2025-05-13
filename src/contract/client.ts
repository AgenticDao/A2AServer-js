import { 
  Connection, 
  Keypair, 
  PublicKey,
} from '@solana/web3.js';

import { 
  Program, 
  AnchorProvider, 
  Wallet, 
  BN, 
  AnchorError,
  Idl
} from '@coral-xyz/anchor';
// @ts-ignore
import bs58 from 'bs58';
import 'dotenv/config';

// Import IDL
import { AgentNftMarketIDL } from './idl';

// Constants
const DEVNET_URL = 'https://api.devnet.solana.com';
const MAINNET_URL = 'https://api.mainnet-beta.solana.com';
const TESTNET_URL = 'https://api.testnet.solana.com';

/**
 * Interface for subscription information returned by the program
 */
export interface SubscriptionInfo {
  user: PublicKey;
  agentNftMint: PublicKey;
  metadataUrl: string;
  expiresAt: BN;
  isActive?: boolean;
}

/**
 * Interface for anchor error with simulation response
 */
interface AnchorErrorWithSimulation extends AnchorError {
  simulationResponse?: {
    logs: string[];
  };
}

/**
 * SolanaClient class for interacting with Agent NFT Market program
 * Provides methods for querying agent subscriptions and other related operations
 */
export class SolanaClient {
  private connection: Connection;
  private provider: AnchorProvider;
  private program: Program;
  private wallet?: Wallet;
  private walletPublicKey?: PublicKey;
  private readOnly: boolean = false;

  /**
   * Creates a new SolanaClient instance
   * 
   * @param programId The program ID of the Agent NFT Market program
   * @param rpcUrl Optional custom RPC URL (defaults to Devnet)
   * @param walletPrivateKey Optional wallet private key for signing transactions
   */
  constructor(programId: string, rpcUrl?: string, walletPrivateKey?: string) {
    // Initialize Solana connection
    this.connection = new Connection(rpcUrl || DEVNET_URL, 'confirmed');
    const PROGRAM_ID = new PublicKey(programId);
    
    // Setup wallet (dummy wallet for read-only, or real wallet if private key provided)
    let wallet: Wallet;
    
    if (walletPrivateKey) {
      const secretKey = bs58.decode(walletPrivateKey);
      const walletKeypair = Keypair.fromSecretKey(secretKey);
      wallet = new Wallet(walletKeypair);
      this.walletPublicKey = walletKeypair.publicKey;
      this.wallet = wallet;
      this.readOnly = false;
    } else {
      // Read-only mode with dummy wallet
      console.log("Initializing in read-only mode. Wallet operations will not be available.");
      const dummyKeypair = Keypair.generate();
      wallet = new Wallet(dummyKeypair);
      this.readOnly = true;
    }
    
    // Create provider for interacting with the Solana network
    this.provider = new AnchorProvider(
      this.connection, 
      wallet,
      { 
        commitment: 'confirmed',
        skipPreflight: this.readOnly // Skip verification for read-only operations
      }
    );
    
    // Initialize the program with the IDL
    this.program = new Program({
      ...AgentNftMarketIDL,
      address: PROGRAM_ID,
    }, this.provider);
  }

  /**
   * Get the current connection
   * @returns The Solana connection object
   */
  getConnection(): Connection {
    return this.connection;
  }

  /**
   * Get the program instance
   * @returns The Anchor Program instance
   */
  getProgram(): Program {
    return this.program;
  }

  /**
   * Get the provider instance
   * @returns The Anchor Provider instance
   */
  getProvider(): AnchorProvider {
    return this.provider;
  }

  /**
   * Get wallet public key if available
   * @returns The wallet's public key or undefined if in read-only mode
   */
  getWalletPublicKey(): PublicKey | undefined {
    return this.walletPublicKey;
  }

  /**
   * Check if client has a valid wallet for signing transactions
   * @returns True if client has a valid wallet for signing
   */
  hasWallet(): boolean {
    return !!this.wallet && !this.readOnly;
  }

  /**
   * Check if client is in read-only mode
   * @returns True if client is in read-only mode
   */
  isReadOnly(): boolean {
    return this.readOnly;
  }

  /**
   * Find AgentNft PDA
   * @param programId Program ID
   * @param agentNftMint Agent NFT mint address
   * @returns PDA public key
   */
  private findAgentNftPDA(programId: PublicKey, agentNftMint: PublicKey): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("agent-nft"), agentNftMint.toBuffer()],
      programId
    );
    return pda;
  };


  /**
   * Find Subscription PDA
   * @param programId Program ID
   * @param userPublicKey User's public key
   * @param agentNftMint Agent NFT mint address
   * @returns PDA public key
   */
  private findSubscriptionPDA(
    programId: PublicKey, 
    userPublicKey: PublicKey, 
    agentNftMint: PublicKey
  ): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("subscription"),
        userPublicKey.toBuffer(),
        agentNftMint.toBuffer(),
      ],
      programId
    );
    return pda;
  };

  /**
   * Get subscription information for a specific user and agent NFT
   * @param userPublicKey The public key of the user
   * @param agentNftMint The public key of the agent NFT mint
   * @returns Subscription information or null if no subscription found
   */
  async getUserAgentSubscription (
    userPublicKey: PublicKey, 
    agentNftMint: PublicKey
  ): Promise<SubscriptionInfo | null> {
    try {
      // Find the AgentNft PDA
      const agentNftPDA = this.findAgentNftPDA(this.program.programId, agentNftMint);
      
      // Find the Subscription PDA
      const subscriptionPDA = this.findSubscriptionPDA(
        this.program.programId, 
        userPublicKey, 
        agentNftMint
      );
      
      // First check if the accounts exist before calling the view method
      const agentNftAccount = await this.connection.getAccountInfo(agentNftPDA);
      const subscriptionAccount = await this.connection.getAccountInfo(subscriptionPDA);
      
      // If either account doesn't exist, return null
      if (!agentNftAccount || !subscriptionAccount) {
        return null;
      }

      let subscriptionInfo;
      
      if (!this.readOnly) {
        // For wallet mode, use the view method
        subscriptionInfo = await this.program.methods
          .getUserAgentSubscription()
          .accounts({
            user: userPublicKey,
            agentNftMint: agentNftMint,
            agentNft: agentNftPDA,
            subscription: subscriptionPDA,
          })
          .view();
      } else {
        // For read-only mode, decode the account directly
        try {
          const decodedAccount = this.program.coder.accounts.decode(
            'SubscriptionInfo', // Account name from IDL
            subscriptionAccount.data
          );

          console.log("decodedAccount", decodedAccount);
          
          subscriptionInfo = {
            user: decodedAccount.user,
            agentNftMint: decodedAccount.agentNftMint,
            metadataUrl: decodedAccount.metadataUrl,
            expiresAt: decodedAccount.expiresAt
          };
        } catch (decodeError) {
          console.error("Error decoding subscription account:", decodeError);
          return null;
        }
      }
      
      // Check if subscription is active
      const isActive = subscriptionInfo.expiresAt.toNumber() > (Date.now() / 1000);
      
      return {
        ...subscriptionInfo,
        isActive
      };
    } catch (error: unknown) {
      if (
        error instanceof AnchorError && 
        ((error as AnchorErrorWithSimulation).simulationResponse?.logs || [])
          .join(",")
          .includes("AccountNotInitialized")
      ) {
        // Account not initialized, return null
        return null;
      }
      
      // Otherwise, check if it's any other account-related error
      if (
        error instanceof Error && 
        (error.message.includes("AccountNotFound") || 
         error.message.includes("account not found"))
      ) {
        return null;
      }
      
      console.error("Error getting user agent subscription:", error);
      throw error;
    }
  }

  /**
   * Check if a user has an active subscription for a specific agent NFT
   * @param userPublicKey The public key of the user
   * @param agentNftMint The public key of the agent NFT mint
   * @returns True if user has an active subscription
   */
  async hasActiveSubscription(
    userPublicKey: PublicKey,
    agentNftMint: PublicKey
  ): Promise<boolean> {
    try {
      const subscription = await this.getUserAgentSubscription(userPublicKey, agentNftMint);
      return !!subscription?.isActive;
    } catch (error) {
      console.error("Error checking subscription status:", error);
      return false;
    }
  }

  /**
   * Get the expiration timestamp for a user's subscription
   * @param userPublicKey The public key of the user
   * @param agentNftMint The public key of the agent NFT mint
   * @returns Expiration timestamp in seconds or null if no subscription
   */
  async getSubscriptionExpiration(
    userPublicKey: PublicKey,
    agentNftMint: PublicKey
  ): Promise<number | null> {
    try {
      const subscription = await this.getUserAgentSubscription(userPublicKey, agentNftMint);
      return subscription ? subscription.expiresAt.toNumber() : null;
    } catch (error) {
      console.error("Error getting subscription expiration:", error);
      return null;
    }
  }
}

// Export a factory function to create a new SolanaClient
export function createSolanaClient(programId: string, rpcUrl?: string, walletPrivateKey?: string): SolanaClient {
  return new SolanaClient(programId, rpcUrl, walletPrivateKey);
}