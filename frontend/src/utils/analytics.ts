// utils/analytics.ts

import api from "./api.ts";

let lastPage: string | null = null;

export async function trackEvent(payload: any) {
  try {
    if (payload.eventType === "page_view") {
      const currentPage = payload.metadata?.page;

      if (currentPage && currentPage === lastPage) {
        return;
      }

      lastPage = currentPage;
    }

    await api.post("/api/analytics/event", payload);
  } catch (err) {
    console.error(err);
  }
}