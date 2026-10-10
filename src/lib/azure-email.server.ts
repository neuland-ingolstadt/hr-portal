import { EmailClient, type EmailMessage } from "@azure/communication-email";
import { SpanStatusCode } from "@opentelemetry/api";
import { render } from "@react-email/render";
import type { ReactElement } from "react";
import { serverConfig } from "#/lib/config";
import { withOutboundSpan } from "#/lib/tracing.server";

export function isAzureEmailConfigured(): boolean {
	return Boolean(
		serverConfig.azure.emailConnectionString && serverConfig.azure.fromEmail,
	);
}

/**
 * Send a transactional email via Azure Communication Services.
 * Returns false when Azure is not configured or the send fails.
 */
export async function sendEmail(
	recipient: { address: string; displayName: string },
	subject: string,
	body: ReactElement,
): Promise<boolean> {
	const connectionString = serverConfig.azure.emailConnectionString;
	const senderAddress = serverConfig.azure.fromEmail;

	if (!connectionString || !senderAddress) {
		console.warn("[azure-email] not configured - skipping send");
		return false;
	}

	const emailClient = new EmailClient(connectionString);
	const [html, plainText] = await Promise.all([
		render(body),
		render(body, { plainText: true }),
	]);

	// No Reply-To - transactional mail; replies are not wanted.
	const message: EmailMessage = {
		senderAddress,
		content: { subject, html, plainText },
		recipients: {
			to: [
				{
					address: recipient.address,
					displayName: recipient.displayName,
				},
			],
		},
		replyTo: [],
	};

	// Span is "SEND azure-email" (fixed service label only - recipient
	// address / subject may contain identifiers and are never recorded).
	return withOutboundSpan("azure-email", "SEND", async ({ span }) => {
		try {
			const poller = await emailClient.beginSend(message);
			const result = await poller.pollUntilDone();
			if (result.status.toLowerCase() === "succeeded") {
				return true;
			}
			// Error detail omitted - may reference the recipient.
			span?.setStatus({ code: SpanStatusCode.ERROR });
			console.error("[azure-email] send failed", result.error);
			return false;
		} catch (error) {
			span?.setStatus({ code: SpanStatusCode.ERROR });
			console.error("[azure-email] send error", error);
			return false;
		}
	});
}
