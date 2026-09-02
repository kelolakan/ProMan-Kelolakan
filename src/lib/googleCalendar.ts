import { invalidateAuthToken } from "./googleAuth";

/**
 * Google Calendar Integration Service
 */

async function googleApiFetch(url: string, accessToken: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${accessToken}`);
  headers.set("Content-Type", "application/json");

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const errText = await response.text();
    if (response.status === 401) {
      invalidateAuthToken("401 Unauthorized / Token Expired");
      const err = new Error(`Google Calendar API Error (401): Sesi autentikasi telah kedaluwarsa.`);
      (err as any).status = 401;
      (err as any).isAuthError = true;
      throw err;
    }
    const err = new Error(`Google Calendar API Error (${response.status}): ${errText}`);
    (err as any).status = response.status;
    throw err;
  }
  if (response.status === 204) {
    return null;
  }
  return response.json();
}

/**
 * Creates an event on the user's Primary Google Calendar for a task's due date
 */
export async function syncTaskToCalendar(
  accessToken: string,
  taskTitle: string,
  taskDescription: string,
  dueDate: string,
  projectName?: string,
  priority?: string
): Promise<{ eventId: string; htmlLink: string }> {
  try {
    const url = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

    const body = {
      summary: `📌 [ZonaTools] ${taskTitle}`,
      description: `Tugas Manajemen Proyek ZonaTools\n\n• Proyek: ${projectName || "ZonaTools Proyek"}\n• Prioritas: ${priority || "Normal"}\n• Tenggat Waktu: ${dueDate}\n\nDeskripsi:\n${taskDescription || "Tidak ada deskripsi rinci."}`,
      start: {
        date: dueDate, // Format: YYYY-MM-DD for all-day event
      },
      end: {
        date: dueDate,
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: "popup", minutes: 24 * 60 }, // 1 day before
          { method: "popup", minutes: 60 }, // 1 hour before
        ],
      },
    };

    const event = await googleApiFetch(url, accessToken, {
      method: "POST",
      body: JSON.stringify(body),
    });

    return {
      eventId: event.id,
      htmlLink: event.htmlLink,
    };
  } catch (error) {
    console.error("Error syncing task to calendar:", error);
    throw error;
  }
}

/**
 * Updates an existing calendar event for a task
 */
export async function updateTaskCalendarEvent(
  accessToken: string,
  eventId: string,
  taskTitle: string,
  taskDescription: string,
  dueDate: string,
  projectName?: string,
  priority?: string
): Promise<{ htmlLink: string }> {
  try {
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`;

    const body = {
      summary: `📌 [ZonaTools] ${taskTitle}`,
      description: `Tugas Manajemen Proyek ZonaTools\n\n• Proyek: ${projectName || "ZonaTools Proyek"}\n• Prioritas: ${priority || "Normal"}\n• Tenggat Waktu: ${dueDate}\n\nDeskripsi:\n${taskDescription || "Tidak ada deskripsi rinci."}`,
      start: {
        date: dueDate,
      },
      end: {
        date: dueDate,
      },
    };

    const event = await googleApiFetch(url, accessToken, {
      method: "PATCH",
      body: JSON.stringify(body),
    });

    return {
      htmlLink: event.htmlLink,
    };
  } catch (error) {
    console.error("Error updating calendar event:", error);
    throw error;
  }
}

/**
 * Deletes a calendar event when user untoggles or removes sync
 */
export async function deleteTaskCalendarEvent(
  accessToken: string,
  eventId: string
): Promise<boolean> {
  try {
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`;
    await googleApiFetch(url, accessToken, {
      method: "DELETE",
    });
    return true;
  } catch (error) {
    console.error("Error deleting calendar event:", error);
    throw error;
  }
}
