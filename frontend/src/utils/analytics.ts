// utils/analytics.ts

import api from "./api.ts";

export async function trackEvent(
  payload :any
) {
  try {
    await api.post(
      "/api/analytics/event",
      payload
    );
  } catch (err) {
    console.error(err);
  }
}