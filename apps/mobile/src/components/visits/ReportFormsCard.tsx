import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { ReportFormKind } from "@daya/shared";
import { downloadReportForm } from "../../api/forms";
import { apiErrorMessage } from "../../lib/scheduleDisplay";
import { useTheme } from "../../theme/ThemeContext";
import { fontFamily, space, type } from "../../theme/tokens";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";

const FORMS: Array<{ id: ReportFormKind; title: string; needsCustomer: boolean }> = [
  { id: "registration", title: "Registration Form", needsCustomer: true },
  { id: "home-assessment", title: "Home Assessment Form", needsCustomer: true },
  { id: "home-visit", title: "Schedule Home Visit Form", needsCustomer: true },
  { id: "shift-log", title: "Shift Log Sheet", needsCustomer: false },
];

export function ReportFormsCard({
  customerId,
  logId,
}: {
  customerId?: string;
  logId?: string;
}) {
  const { colors } = useTheme();
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState<string>();

  const download = async (kind: ReportFormKind, blank?: boolean) => {
    setError(undefined);
    setBusy(`${kind}:${blank ? "blank" : "filled"}`);
    try {
      await downloadReportForm(kind, { customerId, logId, blank });
    } catch (err) {
      setError(apiErrorMessage(err, "Could not download this form."));
    } finally {
      setBusy(undefined);
    }
  };

  return (
    <Card style={styles.card}>
      <Text style={[styles.heading, { color: colors.ink }]}>Paper forms</Text>
      <Text style={[styles.lead, { color: colors.inkMuted }]}>
        Select a Care Focus above, then download a prefilled packet or the blank original.
      </Text>
      {FORMS.map((form) => {
        const blocked = form.needsCustomer && !customerId && !logId;
        return (
          <View key={form.id} style={styles.row}>
            <Text style={[styles.name, { color: colors.ink }]}>{form.title}</Text>
            <View style={styles.actions}>
              <Button
                label={busy === `${form.id}:filled` ? "Preparing…" : "Download prefilled"}
                size="compact"
                disabled={Boolean(busy) || blocked}
                onPress={() => {
                  void download(form.id);
                }}
              />
              <Button
                label="Blank original"
                variant="secondary"
                size="compact"
                disabled={Boolean(busy)}
                onPress={() => {
                  void download(form.id, true);
                }}
              />
            </View>
            {blocked ? (
              <Text style={[styles.hint, { color: colors.inkMuted }]}>
                Select a Care Focus above to prefill this form.
              </Text>
            ) : null}
          </View>
        );
      })}
      {error ? <Text style={[styles.hint, { color: colors.danger }]}>{error}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  heading: { fontFamily, fontSize: 22, fontWeight: "800" },
  lead: { fontFamily, fontSize: type.body, lineHeight: 24 },
  row: { gap: 8, paddingTop: 4 },
  name: { fontFamily, fontSize: 17, fontWeight: "700" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  hint: { fontFamily, fontSize: 15, lineHeight: 22 },
});
