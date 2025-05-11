import {
    Request,
    Response,
    NextFunction,
} from "express";
// Import Solana libraries for signature verification
import { PublicKey } from "@solana/web3.js";
import nacl from "tweetnacl";
// Import SolanaClient for subscription verification
import { SolanaClient } from "./contract/client";

/**
 * Middleware for verifying Solana wallet signatures.
 * Checks three headers for signature verification data and validates the signature.
 * 
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 * @param solanaClient Optional SolanaClient instance for subscription verification
 * @param agentNftMint Optional agent NFT mint address to verify subscription against
 */
export function verifySolanaSignature(
    req: Request,
    res: Response,
    next: NextFunction,
    solanaClient?: SolanaClient,
    agentNftMint?: string
) {
    // Extract verification headers
    const signature = req.header("X-A2A-Verify-Signature");
    const message = req.header("X-A2A-Verify-Message");
    const publicKeyStr = req.header("X-A2A-Verify-PublicKey");

    // Check if all required headers are present
    if (!signature || !message || !publicKeyStr) {
        res.status(403).json({
            jsonrpc: "2.0",
            id: null,
            error: {
                code: -32099,
                message: "Missing signature verification headers",
                data: {
                    details: "All X-A2A-Verify-* headers are required for authentication"
                }
            }
        });
        return;
    }

    try {
        // Convert the public key string to a Solana PublicKey object
        const publicKey = new PublicKey(publicKeyStr);

        // Convert signature and message to Uint8Array for verification
        const signatureBytes = Buffer.from(signature, 'base64');
        const messageBytes = Buffer.from(message);

        // Verify the signature using TweetNaCl
        const isValid = nacl.sign.detached.verify(
            messageBytes,
            signatureBytes,
            publicKey.toBytes()
        );

        if (!isValid) {
            res.status(403).json({
                jsonrpc: "2.0",
                id: null,
                error: {
                    code: -32099,
                    message: "Invalid signature",
                    data: {
                        details: "The provided signature could not be verified"
                    }
                }
            });
            return;
        }

        // If subscription verification is enabled
        if (solanaClient && agentNftMint) {
            // Run the subscription check asynchronously
            (async () => {
                try {
                    const agentNftMintPublicKey = new PublicKey(agentNftMint);
                    const hasActiveSubscription = await solanaClient.hasActiveSubscription(
                        publicKey,
                        agentNftMintPublicKey
                    );

                    if (!hasActiveSubscription) {
                        res.status(403).json({
                            jsonrpc: "2.0",
                            id: null,
                            error: {
                                code: -32099,
                                message: "Subscription required",
                                data: {
                                    details: "User does not have an active subscription for this agent"
                                }
                            }
                        });
                        return;
                    }

                    // Signature and subscription both valid, proceed to next middleware
                    next();
                } catch (error) {
                    console.error("Subscription verification error:", error);
                    res.status(403).json({
                        jsonrpc: "2.0",
                        id: null,
                        error: {
                            code: -32099,
                            message: "Subscription verification failed",
                            data: {
                                details: error instanceof Error ? error.message : String(error)
                            }
                        }
                    });
                }
            })();
        } else {
            // Signature is valid, proceed to next middleware
            next();
        }
    } catch (error) {
        console.error("Signature verification error:", error);
        res.status(403).json({
            jsonrpc: "2.0",
            id: null,
            error: {
                code: -32099,
                message: "Signature verification failed",
                data: {
                    details: error instanceof Error ? error.message : String(error)
                }
            }
        });
        return;
    }
}