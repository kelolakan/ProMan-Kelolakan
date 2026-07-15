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
    throw new Error(`Google Calendar API Error (${response.status}): ${errText}`);
  }
  return response.json();
}

/**
 * Creates an all-day event on the user's Primary Google Calendar for a task's due date
 */
export async function syncTaskToCalendar(
  accessToken: string,
  taskTitle: string,
  taskDescription: string,
  dueDate: string
): Promise<{ htmlLink: string }> {
  try {
    const url = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

    // Format start/end for an all-day event
    const body = {
      summary: `📌 [ZonaTools] ${taskTitle}`,
      description: `Tugas Manajemen Proyek:\n\n${taskDescription || "Tidak ada deskripsi."}\n\nJatuh Tempo: ${dueDate}`,
      start: {
        date: dueDate, // Format: YYYY-MM-DD
      },
      end: {
        date: dueDate, // All-day ends on the same date for Google Calendar
      },
      reminders: {
        useDefault: true,
      },
    };

    const event = await googleApiFetch(url, accessToken, {
      method: "POST",
      body: JSON.stringify(body),
    });

    return {
      htmlLink: event.htmlLink,
    };
  } catch (error) {
    console.error("Error syncing task to calendar:", error);
    throw error;
  }
}
