import { useRouter } from "expo-router";
import { Children, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { fontFamily } from "../theme/tokens";
import { AppHeader } from "./AppHeader";

export const PAGE_MAX = 1100;
export const FORM_MAX = 720;
export const PAGE_GUTTER = 24;

export function useWidePage(min = 880) {
  const { width } = useWindowDimensions();
  return width >= min;
}

export function PageChrome({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: colors.paper }]}>
      <AppHeader />
      {children}
    </View>
  );
}

export function PageHeading({
  title,
  lead,
  backTo,
  backLabel = "Back",
}: {
  title: string;
  lead?: ReactNode;
  backTo?: string;
  backLabel?: string;
}) {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <View style={styles.heading}>
      {backTo ? (
        <Pressable onPress={() => router.push(backTo)} accessibilityRole="button" style={styles.backRow}>
          <Text style={[styles.backLink, { color: colors.blue }]}>{backLabel}</Text>
        </Pressable>
      ) : null}
      <Text style={[styles.pageTitle, { color: colors.ink }]}>{title}</Text>
      {lead ? <View style={styles.lead}>{lead}</View> : null}
    </View>
  );
}

export function PageShell({
  title,
  backTo,
  backLabel = "Back",
  lead,
  children,
  maxWidth = PAGE_MAX,
}: {
  title: string;
  backTo?: string;
  backLabel?: string;
  lead?: ReactNode;
  children: ReactNode;
  maxWidth?: number;
}) {
  return (
    <PageChrome>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.inner, { maxWidth }]}>
          <PageHeading title={title} lead={lead} backTo={backTo} backLabel={backLabel} />
          {children}
        </View>
      </ScrollView>
    </PageChrome>
  );
}

export function CardGrid({ children }: { children: ReactNode }) {
  const wide = useWidePage();
  const { width } = useWindowDimensions();
  const content = Math.min(width, PAGE_MAX) - PAGE_GUTTER * 2;
  const column = wide ? (content - 16) / 2 : content;

  return (
    <View style={styles.grid}>
      {Children.toArray(children).map((child, index) => (
        <View key={index} style={{ width: column }}>
          {child}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingBottom: 48, alignItems: "center" },
  inner: {
    width: "100%",
    maxWidth: PAGE_MAX,
    paddingHorizontal: PAGE_GUTTER,
    paddingTop: 28,
    gap: 20,
  },
  heading: { gap: 8, maxWidth: 720, marginBottom: 4 },
  backRow: { alignSelf: "flex-start", paddingVertical: 2 },
  backLink: { fontFamily, fontSize: 16, fontWeight: "600" },
  pageTitle: { fontFamily, fontSize: 32, fontWeight: "700", letterSpacing: -0.4 },
  lead: { maxWidth: 720 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
});
