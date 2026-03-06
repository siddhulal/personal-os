import api from "@/lib/api";
import type { AnalyticsData } from "@/types";

export async function fetchAnalytics(): Promise<AnalyticsData> {
  const response = await api.get("/api/analytics");
  return response.data;
}
