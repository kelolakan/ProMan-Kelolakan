/**
 * Google Drive Storage Sync Service
 */

const ATTACHMENTS_FOLDER_NAME = "ZonaTools Project Attachments";

async function googleApiFetch(url: string, accessToken: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${accessToken}`);
  if (!headers.has("Content-Type") && options.method !== "POST" && options.method !== "PATCH") {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google Drive API Error (${response.status}): ${errText}`);
  }
  return response.json();
}

/**
 * Find or create the root folder for our attachments
 */
export async function getOrCreateAttachmentsFolder(accessToken: string): Promise<string> {
  try {
    const query = encodeURIComponent(`name = '${ATTACHMENTS_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
    const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`;
    const result = await googleApiFetch(url, accessToken);

    if (result.files && result.files.length > 0) {
      return result.files[0].id;
    }

    // Create the folder
    const createUrl = "https://www.googleapis.com/drive/v3/files";
    const body = {
      name: ATTACHMENTS_FOLDER_NAME,
      mimeType: "application/vnd.google-apps.folder",
    };

    const newFolder = await googleApiFetch(createUrl, accessToken, {
      method: "POST",
      body: JSON.stringify(body),
    });

    return newFolder.id;
  } catch (error) {
    console.error("Error finding/creating Drive folder:", error);
    throw error;
  }
}

/**
 * Uploads a file to the attachments folder on Google Drive
 * Uses standard multipart upload format
 */
export async function uploadFileToDrive(
  accessToken: string,
  file: File,
  folderId: string
): Promise<{ id: string; webViewLink: string }> {
  try {
    // 1. Convert file to base64
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Strip data:mime/type;base64,
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });

    // 2. Build multipart body
    const boundary = "zonatools_upload_boundary";
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelim = `\r\n--${boundary}--`;

    const metadata = {
      name: file.name,
      mimeType: file.type || "application/octet-stream",
      parents: [folderId],
    };

    const multipartBody =
      delimiter +
      "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
      JSON.stringify(metadata) +
      delimiter +
      `Content-Type: ${metadata.mimeType}\r\n` +
      "Content-Transfer-Encoding: base64\r\n\r\n" +
      base64Data +
      closeDelim;

    // 3. Post to upload endpoint
    const url = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink";
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Google Drive Upload Error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    return {
      id: data.id,
      webViewLink: data.webViewLink || `https://drive.google.com/file/d/${data.id}/view`,
    };
  } catch (error) {
    console.error("Error in uploadFileToDrive:", error);
    throw error;
  }
}

/**
 * Deletes a file from Google Drive.
 * Note: Must confirm with user in UI before calling this!
 */
export async function deleteFileFromDrive(accessToken: string, fileId: string): Promise<void> {
  try {
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}`;
    await fetch(url, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  } catch (error) {
    console.error("Error deleting Drive file:", error);
    throw error;
  }
}
