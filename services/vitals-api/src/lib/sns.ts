import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";
import type { AlertSeverity, DeviceToken, PushPlatform } from "@daya/shared";
import { config } from "../config";

const sns = new SNSClient({ region: config.region });

export interface PushDispatchInput {
  userId: string;
  tokens: DeviceToken[];
  title: string;
  body: string;
  severity: AlertSeverity;
  data: Record<string, string>;
}

function platformApplicationArn(platform: PushPlatform): string | undefined {
  if (platform === "ANDROID") return config.sns.androidPlatformArn || undefined;
  if (platform === "IOS") return config.sns.iosPlatformArn || undefined;
  return undefined;
}

function buildPushEnvelope(title: string, body: string, data: Record<string, string>): string {
  return JSON.stringify({
    default: body,
    GCM: JSON.stringify({
      notification: { title, body },
      data,
    }),
    APNS: JSON.stringify({
      aps: {
        alert: { title, body },
        sound: "default",
        "content-available": 1,
      },
      ...data,
    }),
  });
}

export async function dispatchPushNotifications(input: PushDispatchInput): Promise<number> {
  const envelope = buildPushEnvelope(input.title, input.body, input.data);
  let delivered = 0;

  await Promise.all(
    input.tokens.map(async (token) => {
      try {
        const targetArn = token.token.startsWith("arn:aws:sns:")
          ? token.token
          : platformApplicationArn(token.platform)
            ? `${platformApplicationArn(token.platform)}/${token.token}`
            : undefined;

        if (!targetArn) {
          console.warn("Skipping push token with no SNS target", {
            userId: input.userId,
            platform: token.platform,
          });
          return;
        }

        await sns.send(
          new PublishCommand({
            TargetArn: targetArn,
            Message: envelope,
            MessageStructure: "json",
          }),
        );
        delivered += 1;
      } catch (error) {
        console.error("SNS device publish failed", {
          userId: input.userId,
          platform: token.platform,
          error,
        });
      }
    }),
  );

  return delivered;
}

export async function dispatchOpsAndWhatsApp(input: {
  body: string;
  severity: AlertSeverity;
  customerId: string;
  phones: string[];
}): Promise<Array<"WHATSAPP" | "SMS">> {
  const channels: Array<"WHATSAPP" | "SMS"> = [];

  if (config.sns.opsTopicArn) {
    await sns.send(
      new PublishCommand({
        TopicArn: config.sns.opsTopicArn,
        Subject: `Daya ${input.severity} visit alert`,
        Message: input.body,
        MessageAttributes: {
          customer_id: { DataType: "String", StringValue: input.customerId },
          severity: { DataType: "String", StringValue: input.severity },
        },
      }),
    );
  }

  if (input.severity === "CRITICAL" && config.sns.whatsappTopicArn && input.phones.length) {
    await sns.send(
      new PublishCommand({
        TopicArn: config.sns.whatsappTopicArn,
        Message: JSON.stringify({
          channel: "WHATSAPP",
          template: "visit_critical_alert",
          body: input.body,
          phones: input.phones,
          customer_id: input.customerId,
        }),
      }),
    );
    channels.push("WHATSAPP");
  }

  return channels;
}
