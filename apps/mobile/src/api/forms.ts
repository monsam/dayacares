import axios from "axios";
import { Platform } from "react-native";
import type { ListReportFormsResponse, ReportFormKind } from "@daya/shared";
import { api } from "./client";

export async function listReportForms() {
  const { data } = await api.get<ListReportFormsResponse>("/forms");
  return data.forms;
}

async function errorFromBlob(err: unknown) {
  if (axios.isAxiosError(err) && err.response?.data instanceof Blob) {
    const text = await err.response.data.text();
    try {
      const parsed = JSON.parse(text) as { error?: string };
      return new Error(parsed.error || text);
    } catch {
      return new Error(text || "Could not download this form.");
    }
  }
  return err instanceof Error ? err : new Error("Could not download this form.");
}

export async function downloadReportForm(
  kind: ReportFormKind,
  options: { customerId?: string; logId?: string; blank?: boolean } = {},
) {
  const path = options.blank ? `/forms/${kind}/blank` : `/forms/${kind}`;
  try {
    const { data, headers } = await api.get<Blob>(path, {
      params: {
        customer_id: options.customerId,
        log_id: options.logId,
      },
      responseType: "blob",
    });
    const disposition = String(headers["content-disposition"] ?? "");
    const match = disposition.match(/filename="([^"]+)"/);
    const filename = match?.[1] ?? `${kind}.pdf`;
    if (Platform.OS !== "web") {
      throw new Error("PDF download is available in the web app.");
    }
    const url = URL.createObjectURL(data);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    throw await errorFromBlob(err);
  }
}
