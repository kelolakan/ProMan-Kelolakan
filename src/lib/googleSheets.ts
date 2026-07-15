/**
 * Google Sheets Database Sync Service
 */

const DATABASE_NAME = "ZonaTools Project Management Database";

// Helper to handle fetch with JSON response
async function googleApiFetch(url: string, accessToken: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${accessToken}`);
  headers.set("Content-Type", "application/json");

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google API Error (${response.status}): ${errText}`);
  }
  return response.json();
}

/**
 * Searches for the database spreadsheet on Google Drive.
 * If not found, creates one with the correct tabs and headers.
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
      return existingId;
    }

    // 2. Not found, create a new one
    const createUrl = "https://sheets.googleapis.com/v4/spreadsheets";
    const body = {
      properties: {
        title: DATABASE_NAME,
      },
      sheets: [
        { properties: { title: "projects" } },
        { properties: { title: "tasks" } },
        { properties: { title: "chats" } },
        { properties: { title: "time_tracking" } },
        { properties: { title: "files" } },
      ],
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
  } catch (error) {
    console.error("Error in findOrCreateSpreadsheet:", error);
    throw error;
  }
}

/**
 * Write header rows to the spreadsheet
 */
async function initializeSheetHeaders(accessToken: string, spreadsheetId: string) {
  const headersMap = {
    "projects": ["id", "name", "description", "division", "start_date", "end_date", "status"],
    "tasks": ["id", "project_id", "title", "description", "status", "due_date", "assignee_name", "assignee_email", "est_hours", "logged_hours", "priority"],
    "chats": ["id", "project_id", "sender_name", "sender_email", "message", "timestamp"],
    "time_tracking": ["id", "task_id", "user_email", "duration_mins", "description", "timestamp"],
    "files": ["id", "project_id", "file_name", "mime_type", "size", "uploaded_by", "uploaded_at"],
  };

  for (const [sheetName, headers] of Object.entries(headersMap)) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1:Z1?valueInputOption=USER_ENTERED`;
    await googleApiFetch(url, accessToken, {
      method: "PUT",
      body: JSON.stringify({
        values: [headers],
      }),
    });
  }
}

/**
 * Get all rows from a specific sheet tab
 */
export async function getSheetRows(accessToken: string, spreadsheetId: string, sheetName: string): Promise<any[]> {
  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1:Z500`;
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
        if (val !== undefined && val !== null && !isNaN(Number(val)) && val.trim() !== "" && (header.includes("hours") || header.includes("mins") || header.includes("size") || header.includes("points"))) {
          obj[header] = Number(val);
        } else {
          obj[header] = val || "";
        }
      });
      return obj;
    });
  } catch (error) {
    console.error(`Error reading rows from tab ${sheetName}:`, error);
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
    const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1:Z1000:clear`;
    await googleApiFetch(clearUrl, accessToken, { method: "POST" });

    // Write new data
    const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1?valueInputOption=USER_ENTERED`;
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

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1:append?valueInputOption=USER_ENTERED`;
    await googleApiFetch(url, accessToken, {
      method: "POST",
      body: JSON.stringify({
        values: [row],
      }),
    });
  } catch (error) {
    console.error(`Error appending row to tab ${sheetName}:`, error);
    throw error;
  }
}
