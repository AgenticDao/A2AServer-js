/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 */
export const AgentNftMarketIDL = {
    "address": "",
    "metadata": {
        "name": "agent_nft_market",
        "version": "0.1.0",
        "spec": "0.1.0",
        "description": "Agent NFT Subscription Service"
    },
    "instructions": [
        {
            "name": "get_all_agent_nfts",
            "discriminator": [
                238,
                85,
                167,
                197,
                180,
                213,
                25,
                134
            ],
            "accounts": [
                {
                    "name": "authority",
                    "signer": true
                }
            ],
            "args": [],
            "returns": {
                "vec": {
                    "defined": {
                        "name": "AgentNftInfo"
                    }
                }
            }
        },
        {
            "name": "get_user_agent_subscription",
            "discriminator": [
                208,
                28,
                136,
                249,
                48,
                24,
                19,
                7
            ],
            "accounts": [
                {
                    "name": "user",
                    "signer": true
                },
                {
                    "name": "agent_nft_mint"
                },
                {
                    "name": "agent_nft",
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    97,
                                    103,
                                    101,
                                    110,
                                    116,
                                    45,
                                    110,
                                    102,
                                    116
                                ]
                            },
                            {
                                "kind": "account",
                                "path": "agent_nft_mint"
                            }
                        ]
                    }
                },
                {
                    "name": "subscription",
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    115,
                                    117,
                                    98,
                                    115,
                                    99,
                                    114,
                                    105,
                                    112,
                                    116,
                                    105,
                                    111,
                                    110
                                ]
                            },
                            {
                                "kind": "account",
                                "path": "user"
                            },
                            {
                                "kind": "account",
                                "path": "agent_nft_mint"
                            }
                        ]
                    }
                }
            ],
            "args": [],
            "returns": {
                "defined": {
                    "name": "SubscriptionInfo"
                }
            }
        },
        {
            "name": "get_user_subscriptions",
            "discriminator": [
                70,
                242,
                39,
                146,
                213,
                249,
                69,
                204
            ],
            "accounts": [
                {
                    "name": "user",
                    "signer": true
                }
            ],
            "args": [],
            "returns": {
                "vec": {
                    "defined": {
                        "name": "SubscriptionInfo"
                    }
                }
            }
        },
        {
            "name": "mint_agent_nft",
            "discriminator": [
                57,
                195,
                246,
                106,
                161,
                195,
                27,
                112
            ],
            "accounts": [
                {
                    "name": "owner",
                    "writable": true,
                    "signer": true
                },
                {
                    "name": "program_authority"
                },
                {
                    "name": "mint",
                    "writable": true,
                    "signer": true
                },
                {
                    "name": "agent_nft",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    97,
                                    103,
                                    101,
                                    110,
                                    116,
                                    45,
                                    110,
                                    102,
                                    116
                                ]
                            },
                            {
                                "kind": "account",
                                "path": "mint"
                            }
                        ]
                    }
                },
                {
                    "name": "token_account",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            {
                                "kind": "account",
                                "path": "owner"
                            },
                            {
                                "kind": "const",
                                "value": [
                                    6,
                                    221,
                                    246,
                                    225,
                                    215,
                                    101,
                                    161,
                                    147,
                                    217,
                                    203,
                                    225,
                                    70,
                                    206,
                                    235,
                                    121,
                                    172,
                                    28,
                                    180,
                                    133,
                                    237,
                                    95,
                                    91,
                                    55,
                                    145,
                                    58,
                                    140,
                                    245,
                                    133,
                                    126,
                                    255,
                                    0,
                                    169
                                ]
                            },
                            {
                                "kind": "account",
                                "path": "mint"
                            }
                        ],
                        "program": {
                            "kind": "const",
                            "value": [
                                140,
                                151,
                                37,
                                143,
                                78,
                                36,
                                137,
                                241,
                                187,
                                61,
                                16,
                                41,
                                20,
                                142,
                                13,
                                131,
                                11,
                                90,
                                19,
                                153,
                                218,
                                255,
                                16,
                                132,
                                4,
                                142,
                                123,
                                216,
                                219,
                                233,
                                248,
                                89
                            ]
                        }
                    }
                },
                {
                    "name": "token_program",
                    "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
                },
                {
                    "name": "associated_token_program",
                    "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
                },
                {
                    "name": "system_program",
                    "address": "11111111111111111111111111111111"
                },
                {
                    "name": "rent",
                    "address": "SysvarRent111111111111111111111111111111111"
                },
                {
                    "name": "clock",
                    "docs": [
                        "Required for accessing clock"
                    ],
                    "address": "SysvarC1ock11111111111111111111111111111111"
                }
            ],
            "args": [
                {
                    "name": "metadata_url",
                    "type": "string"
                }
            ]
        },
        {
            "name": "purchase_subscription",
            "discriminator": [
                219,
                151,
                184,
                220,
                138,
                36,
                203,
                237
            ],
            "accounts": [
                {
                    "name": "user",
                    "writable": true,
                    "signer": true
                },
                {
                    "name": "agent_nft",
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    97,
                                    103,
                                    101,
                                    110,
                                    116,
                                    45,
                                    110,
                                    102,
                                    116
                                ]
                            },
                            {
                                "kind": "account",
                                "path": "agent_nft_mint"
                            }
                        ]
                    }
                },
                {
                    "name": "agent_nft_mint"
                },
                {
                    "name": "subscription",
                    "writable": true,
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const",
                                "value": [
                                    115,
                                    117,
                                    98,
                                    115,
                                    99,
                                    114,
                                    105,
                                    112,
                                    116,
                                    105,
                                    111,
                                    110
                                ]
                            },
                            {
                                "kind": "account",
                                "path": "user"
                            },
                            {
                                "kind": "account",
                                "path": "agent_nft_mint"
                            }
                        ]
                    }
                },
                {
                    "name": "payment_destination",
                    "writable": true
                },
                {
                    "name": "system_program",
                    "address": "11111111111111111111111111111111"
                },
                {
                    "name": "clock",
                    "docs": [
                        "Required for accessing clock"
                    ],
                    "address": "SysvarC1ock11111111111111111111111111111111"
                }
            ],
            "args": [
                {
                    "name": "subscription_type",
                    "type": {
                        "defined": {
                            "name": "SubscriptionType"
                        }
                    }
                }
            ]
        }
    ],
    "accounts": [
        {
            "name": "AgentNft",
            "discriminator": [
                237,
                215,
                176,
                20,
                217,
                193,
                90,
                153
            ]
        },
        {
            "name": "Subscription",
            "discriminator": [
                64,
                7,
                26,
                135,
                102,
                132,
                98,
                33
            ]
        }
    ],
    "errors": [
        {
            "code": 6000,
            "name": "OnlyOwnerCanMint",
            "msg": "Only the owner can mint NFTs"
        },
        {
            "code": 6001,
            "name": "InvalidPaymentAmount",
            "msg": "Invalid payment amount"
        },
        {
            "code": 6002,
            "name": "InvalidSubscriptionType",
            "msg": "Invalid subscription type"
        },
        {
            "code": 6003,
            "name": "MetadataUrlTooLong",
            "msg": "Metadata URL too long"
        },
        {
            "code": 6004,
            "name": "PaymentFailed",
            "msg": "Payment failed"
        },
        {
            "code": 6005,
            "name": "NftNotFound",
            "msg": "NFT not found"
        },
        {
            "code": 6006,
            "name": "SubscriptionNotFound",
            "msg": "Subscription not found"
        },
        {
            "code": 6007,
            "name": "Unauthorized",
            "msg": "Unauthorized access"
        }
    ],
    "types": [
        {
            "name": "AgentNft",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "owner",
                        "type": "pubkey"
                    },
                    {
                        "name": "mint",
                        "type": "pubkey"
                    },
                    {
                        "name": "metadata_url",
                        "type": "string"
                    },
                    {
                        "name": "created_at",
                        "type": "i64"
                    },
                    {
                        "name": "bump",
                        "type": "u8"
                    }
                ]
            }
        },
        {
            "name": "AgentNftInfo",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "address",
                        "type": "pubkey"
                    },
                    {
                        "name": "mint",
                        "type": "pubkey"
                    },
                    {
                        "name": "owner",
                        "type": "pubkey"
                    },
                    {
                        "name": "metadata_url",
                        "type": "string"
                    },
                    {
                        "name": "created_at",
                        "type": "i64"
                    }
                ]
            }
        },
        {
            "name": "Subscription",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "user",
                        "type": "pubkey"
                    },
                    {
                        "name": "agent_nft_mint",
                        "type": "pubkey"
                    },
                    {
                        "name": "expires_at",
                        "type": "i64"
                    },
                    {
                        "name": "bump",
                        "type": "u8"
                    }
                ]
            }
        },
        {
            "name": "SubscriptionInfo",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "agent_nft_mint",
                        "type": "pubkey"
                    },
                    {
                        "name": "metadata_url",
                        "type": "string"
                    },
                    {
                        "name": "expires_at",
                        "type": "i64"
                    }
                ]
            }
        },
        {
            "name": "SubscriptionType",
            "type": {
                "kind": "enum",
                "variants": [
                    {
                        "name": "OneDay"
                    },
                    {
                        "name": "SevenDays"
                    },
                    {
                        "name": "ThirtyDays"
                    },
                    {
                        "name": "Year"
                    }
                ]
            }
        }
    ]
};