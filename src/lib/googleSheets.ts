import { invalidateAuthToken } from "./googleAuth";

/**
 * Google Sheets Database Sync Service
 */

const DATABASE_NAME = "ZonaTools Project Management Database";

export const REQUIRED_TABS_HEADERS: Record<string, string[]> = {
  projects: [
    "id",
    "name",
    "description",
    "division",
    "start_date",
    "end_date",
    "status",
    "contract_value",
    "target_margin_pct",
    "target_margin_amount",
  ],
  tasks: [
    "id",
    "project_id",
    "title",
    "description",
    "status",
    "due_date",
    "assignee_name",
    "assignee_email",
    "est_hours",
    "logged_hours",
    "priority",
    "calendar_synced",
    "calendar_event_id",
    "calendar_event_link",
  ],
  chats: [
    "id",
    "project_id",
    "sender_name",
    "sender_email",
    "message",
    "timestamp",
  ],
  time_tracking: [
    "id",
    "task_id",
    "user_email",
    "duration_mins",
    "description",
    "timestamp",
  ],
  files: [
    "id",
    "project_id",
    "file_name",
    "mime_type",
    "size",
    "uploaded_by",
    "uploaded_at",
  ],
  finances: [
    "id",
    "project_id",
    "type",
    "category",
    "amount",
    "date",
    "description",
    "reference",
    "created_by",
    "created_at",
  ],
};

// Helper to handle fetch with JSON response
async function googleApiFetch(url: string, accessToken: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${accessToken}`);
  headers.set("Content-Type", "application/json");

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const errText = await response.text();
    if (response.status === 401) {
      invalidateAuthToken("401 Unauthorized / Token Expired");
      const err = new Error(`Google API Error (401): Sesi autentikasi telah kedaluwarsa.`);
      (err as any).status = 401;
      (err as any).isAuthError = true;
      throw err;
    }
    const err = new Error(`Google API Error (${response.status}): ${errText}`);
    (err as any).status = response.status;
    throw err;
  }
  return response.json();
}

/**
 * Ensures all required tabs exist in the target spreadsheet.
 * If any tab (like 'finances') is missing from an existing sheet, it creates it automatically.
 */
export async function ensureSpreadsheetTabs(accessToken: string, spreadsheetId: string): Promise<void> {
  try {
    const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`;
    const meta = await googleApiFetch(metaUrl, accessToken);
    const existingTitles: string[] = (meta.sheets || []).map((s: any) => s.properties?.title || "");

    const missingTabs = Object.keys(REQUIRED_TABS_HEADERS).filter(
      (tab) => !existingTitles.includes(tab)
    );

    if (missingTabs.length > 0) {
      // 1. Add missing sheets via batchUpdate
      const batchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
      const requests = missingTabs.map((tabTitle) => ({
        addSheet: {
          properties: {
            title: tabTitle,
          },
        },
      }));

      await googleApiFetch(batchUrl, accessToken, {
        method: "POST",
        body: JSON.stringify({ requests }),
      });

      // 2. Initialize headers for each newly created tab
      for (const tab of missingTabs) {
        const headers = REQUIRED_TABS_HEADERS[tab];
        if (headers) {
          const headerUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${tab}'!A1:Z1?valueInputOption=USER_ENTERED`;
          await googleApiFetch(headerUrl, accessToken, {
            method: "PUT",
            body: JSON.stringify({
              values: [headers],
            }),
          });
        }
      }
    }
  } catch (error) {
    console.warn("Notice checking/creating missing sheet tabs:", error);
  }
}

/**
 * Searches for the database spreadsheet on Google Drive.
 * If not found, creates one with the correct tabs and headers.
 * If found, ensures all required tabs (including 'finances') exist.
 */
export async function findOrCreateSpreadsheet(accessToken: string): Promise<string> {
  try {
    // 1. Search for existing file on Drive
    const query = encodeURIComponent(`name = '${DATABASE_NAME}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`);
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`;
    const searchResult = await googleApiFetch(searchUrl, accessToken);

    if (searchResult.files && searchResult.files.length > 0) {
      const existingId = searchResult.files[0].id;
      localStorage.setItem("zonatools_spreadsheet_id", existingId);
      // Ensure any newly added tabs like 'finances' exist in the existing spreadsheet
      await ensureSpreadsheetTabs(accessToken, existingId);
      return existingId;
    }

    // 2. Not found, create a new one
    const createUrl = "https://sheets.googleapis.com/v4/spreadsheets";
    const body = {
      properties: {
        title: DATABASE_NAME,
      },
      sheets: Object.keys(REQUIRED_TABS_HEADERS).map((title) => ({
        properties: { title },
      })),
    };

    const newSheet = await googleApiFetch(createUrl, accessToken, {
      method: "POST",
      body: JSON.stringify(body),
    });

    const spreadsheetId = newSheet.spreadsheetId;
    localStorage.setItem("zonatools_spreadsheet_id", spreadsheetId);

    // 3. Initialize headers for each tab
    await initializeSheetHeaders(accessToken, spreadsheetId);

    return spreadsheetId;
  } catch (error: any) {
    if (error?.status === 401 || error?.isAuthError || error?.message?.includes("401")) {
      console.info("Google OAuth token expired or invalid, notifying auth state listener.");
    } else {
      console.warn("Notice in findOrCreateSpreadsheet:", error);
    }
    throw error;
  }
}

/**
 * Write header rows to the spreadsheet
 */
async function initializeSheetHeaders(accessToken: string, spreadsheetId: string) {
  for (const [sheetName, headers] of Object.entries(REQUIRED_TABS_HEADERS)) {
    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${sheetName}'!A1:Z1?valueInputOption=USER_ENTERED`;
      await googleApiFetch(url, accessToken, {
        method: "PUT",
        body: JSON.stringify({
          values: [headers],
        }),
      });
    } catch (err) {
      console.warn(`Error setting header for ${sheetName}:`, err);
    }
  }
}

/**
 * Get all rows from a specific sheet tab
 */
export async function getSheetRows(accessToken: string, spreadsheetId: string, sheetName: string): Promise<any[]> {
  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${sheetName}'!A1:Z500`;
    const result = await googleApiFetch(url, accessToken);
    const rows = result.values || [];
    if (rows.length === 0) return [];

    const headers = rows[0];
    const dataRows = rows.slice(1);

    // Map rows to objects
    return dataRows.map((row: any[]) => {
      const obj: any = {};
      headers.forEach((header: string, index: number) => {
        const val = row[index];
        // Cast numerical strings back to numbers if needed
        if (
          val !== undefined &&
          val !== null &&
          !isNaN(Number(val)) &&
          String(val).trim() !== "" &&
          (header.includes("hours") ||
            header.includes("mins") ||
            header.includes("size") ||
            header.includes("points") ||
            header.includes("amount") ||
            header.includes("value") ||
            header.includes("margin") ||
            header.includes("contract"))
        ) {
          obj[header] = Number(val);
        } else if (val === "true" || val === "false") {
          obj[header] = val === "true";
        } else {
          obj[header] = val || "";
        }
      });
      return obj;
    });
  } catch (error: any) {
    // If tab doesn't exist or range cannot be parsed, try creating the tab gracefully
    if (error?.message?.includes("Unable to parse range") || error?.message?.includes("400")) {
      console.info(`Tab '${sheetName}' not found in spreadsheet. Auto-creating tab...`);
      try {
        await ensureSpreadsheetTabs(accessToken, spreadsheetId);
      } catch {
        // ignore
      }
    } else {
      console.warn(`Reading rows from tab '${sheetName}':`, error?.message || error);
    }
    return [];
  }
}

/**
 * Overwrite the entire contents of a sheet tab with fresh data (keeping the headers)
 */
export async function overwriteSheetRows(accessToken: string, spreadsheetId: string, sheetName: string, headers: string[], dataObjects: any[]) {
  try {
    // Convert array of objects to array of arrays
    const values = [headers];
    dataObjects.forEach((item) => {
      const row = headers.map((header) => {
        const val = item[header];
        return val !== undefined && val !== null ? String(val) : "";
      });
      values.push(row);
    });

    // Clear existing data first
    const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${sheetName}'!A1:Z1000:clear`;
    try {
      await googleApiFetch(clearUrl, accessToken, { method: "POST" });
    } catch {
      // Tab might be missing, ensure tabs exist
      await ensureSpreadsheetTabs(accessToken, spreadsheetId);
    }

    // Write new data
    const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${sheetName}'!A1?valueInputOption=USER_ENTERED`;
    await googleApiFetch(updateUrl, accessToken, {
      method: "PUT",
      body: JSON.stringify({ values }),
    });
  } catch (error) {
    console.error(`Error overwriting rows for tab ${sheetName}:`, error);
    throw error;
  }
}

/**
 * Append a single row to a sheet tab
 */
export async function appendSheetRow(accessToken: string, spreadsheetId: string, sheetName: string, headers: string[], dataObject: any) {
  try {
    const row = headers.map((header) => {
      const val = dataObject[header];
      return val !== undefined && val !== null ? String(val) : "";
    });

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${sheetName}'!A1:append?valueInputOption=USER_ENTERED`;
    try {
      await googleApiFetch(url, accessToken, {
        method: "POST",
        body: JSON.stringify({
          values: [row],
        }),
      });
    } catch (err: any) {
      if (err?.message?.includes("Unable to parse range") || err?.message?.includes("400")) {
        await ensureSpreadsheetTabs(accessToken, spreadsheetId);
        await googleApiFetch(url, accessToken, {
          method: "POST",
          body: JSON.stringify({
            values: [row],
          }),
        });
      } else {
        throw err;
      }
    }
  } catch (error) {
    console.error(`Error appending row to tab ${sheetName}:`, error);
    throw error;
  }
}
