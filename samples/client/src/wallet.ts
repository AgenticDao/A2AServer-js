/**
 * Solana Wallet Utility
 * Provides signing functionality using a private key from environment variables
 */
import { config } from "dotenv";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import nacl from "tweetnacl";

// Load environment variables
config();

/**
 * SolanaWallet class for signing messages
 */
export class SolanaWallet {
  private keypair: Keypair;

  constructor() {
    const privateKeyBase58 = process.env.WALLET_PRIVATE_KEY;
    if (!privateKeyBase58) {
      throw new Error("WALLET_PRIVATE_KEY is not set in .env file");
    }
    const secretKey = bs58.decode(privateKeyBase58);
    this.keypair = Keypair.fromSecretKey(secretKey);
  }

  /**
   * Sign the current timestamp as a message
   * @returns { nonce: string, publicKey: string, signature: string }
   */
  sign(): {
    nonce: string;
    publicKey: string;
    signature: string;
  } {
    const nonce = Date.now().toString();
    const nonceBuffer = Buffer.from(nonce, "utf-8");
    const signatureBuffer = nacl.sign.detached(nonceBuffer, this.keypair.secretKey);
    const signature = Buffer.from(signatureBuffer).toString("base64");
    return {
      publicKey: this.keypair.publicKey.toBase58(),
      nonce,
      signature,
    };
  }
}
