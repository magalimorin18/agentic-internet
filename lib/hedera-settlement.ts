import {
  Client,
  TopicMessageSubmitTransaction,
  TopicCreateTransaction,
  PrivateKey,
  AccountId,
  TopicId,
} from "@hashgraph/sdk";

interface HederaSettlementConfig {
  accountId: string;
  privateKey: string;
  topicId?: string;
}

export interface SettlementData {
  claimId: string;
  agents: string[];
  agreement: "agreed" | "disagreed" | "partial";
  timestamp: number;
  settlementStatement?: string;
}

export interface SettlementResult {
  success: boolean;
  transactionHash?: string;
  transactionId?: string;
  topicId?: string;
  error?: string;
}

async function getOrCreateTopic(
  client: Client,
  operatorId: AccountId,
  operatorKey: PrivateKey,
  existingTopicId?: string
): Promise<TopicId> {
  if (existingTopicId) {
    try {
      return TopicId.fromString(existingTopicId);
    } catch {
      console.warn(
        `Invalid topic ID provided: ${existingTopicId}. Creating new topic.`
      );
    }
  }

  console.log("Creating new HCS topic for settlements...");
  const topicCreateTx = await new TopicCreateTransaction()
    .setTopicMemo("Agent Settlement Records")
    .execute(client);

  const topicCreateRx = await topicCreateTx.getReceipt(client);
  const topicId = topicCreateRx.topicId;

  if (!topicId) {
    throw new Error("Failed to create HCS topic");
  }

  console.log(`Created new HCS topic: ${topicId.toString()}`);
  return topicId;
}

export async function createHederaSettlement(
  settlementData: SettlementData,
  config?: HederaSettlementConfig
): Promise<SettlementResult> {
  // Check if Hedera is configured
  const accountId = config?.accountId || process.env.HEDERA_ACCOUNT_ID;
  const privateKey = config?.privateKey || process.env.HEDERA_PRIVATE_KEY;
  const topicId = config?.topicId || process.env.HEDERA_SETTLEMENT_TOPIC_ID;

  if (!accountId || !privateKey) {
    return {
      success: false,
      error:
        "Hedera credentials not configured. Set HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY environment variables.",
    };
  }

  try {
    const client = Client.forTestnet();

    const operatorId = AccountId.fromString(accountId);
    const operatorKey = PrivateKey.fromString(privateKey);
    client.setOperator(operatorId, operatorKey);

    const settlementTopicId = await getOrCreateTopic(
      client,
      operatorId,
      operatorKey,
      topicId
    );

    const message = JSON.stringify({
      type: "agent_settlement",
      ...settlementData,
    });

    const transaction = await new TopicMessageSubmitTransaction()
      .setTopicId(settlementTopicId)
      .setMessage(message)
      .execute(client);

    await transaction.getReceipt(client);

    const transactionId = transaction.transactionId.toString();

    console.log(
      `Settlement recorded on Hedera. Transaction ID: ${transactionId}, Topic: ${settlementTopicId.toString()}`
    );

    return {
      success: true,
      transactionHash: transactionId,
      transactionId,
      topicId: settlementTopicId.toString(),
    };
  } catch (error) {
    console.error("Error creating Hedera settlement:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error creating Hedera settlement",
    };
  }
}
