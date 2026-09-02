import { invalidateAuthToken } from "./googleAuth";

/**
 * Google Gmail Send Service
 */

/**
 * Sends a notification email via Gmail API
 */
export async function sendEmailNotification(
  accessToken: string,
  toEmail: string,
  subject: string,
  htmlContent: string
): Promise<void> {
  try {
    const url = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";

    // 1. Build a standard MIME email block
    const emailLines = [
      `To: ${toEmail}`,
      `Subject: ${subject}`,
      "MIME-Version: 1.0",
      "Content-Type: text/html; charset=utf-8",
      "",
      htmlContent,
    ];

    const emailStr = emailLines.join("\r\n");

    // 2. Base64URL encode the MIME content safely
    // We encode using UTF-8 support first, then replace characters for Base64URL compliance
    const utf8Encoded = new TextEncoder().encode(emailStr);
    const base64 = btoa(String.fromCharCode(...utf8Encoded));
    const base64Url = base64
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    // 3. Post to Gmail API
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        raw: base64Url,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      if (response.status === 401) {
        invalidateAuthToken("401 Unauthorized / Token Expired");
        const err = new Error(`Gmail API Error (401): Sesi autentikasi telah kedaluwarsa.`);
        (err as any).status = 401;
        (err as any).isAuthError = true;
        throw err;
      }
      throw new Error(`Gmail API Send Error (${response.status}): ${errText}`);
    }
  } catch (error) {
    console.error("Error sending Gmail notification:", error);
    throw error;
  }
}
