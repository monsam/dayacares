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
  const { width } = useWindowDimensions();
  const compact = width < 480;

  return (
    <View style={styles.heading}>
      {backTo ? (
        <Pressable onPress={() => router.push(backTo)} accessibilityRole="button" style={styles.backRow}>
          <Text style={[styles.backLink, { color: colors.blue }]}>{backLabel}</Text>
        </Pressable>
      ) : null}
      <Text style={[styles.pageTitle, compact && styles.pageTitleCompact, { color: colors.ink }]}>{title}</Text>
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
  const innerWidth = Math.min(width, PAGE_MAX) - PAGE_GUTTER * 2;
  const columnWide = (innerWidth - 16) / 2;

  return (
    <View style={styles.grid}>
      {Children.toArray(children).map((child, index) => (
        <View
          key={index}
          style={[styles.gridCell, wide ? { width: columnWide } : styles.gridCellNarrow]}
        >
          {child}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, width: "100%", maxWidth: "100%", overflow: "hidden" },
  scroll: { paddingBottom: 48, alignItems: "stretch", width: "100%", maxWidth: "100%" },
  inner: {
    width: "100%",
    maxWidth: PAGE_MAX,
    minWidth: 0,
    alignSelf: "center",
    paddingHorizontal: PAGE_GUTTER,
    paddingTop: 28,
    gap: 16,
  },
  heading: { gap: 8, maxWidth: 720, marginBottom: 4 },
  backRow: { alignSelf: "flex-start", paddingVertical: 2 },
  backLink: { fontFamily, fontSize: 16, fontWeight: "600" },
  pageTitle: { fontFamily, fontSize: 32, fontWeight: "700", letterSpacing: -0.4 },
  pageTitleCompact: { fontSize: 26, lineHeight: 32 },
  lead: { maxWidth: 720 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
  },
  gridCell: {
    minWidth: 0,
    alignSelf: "stretch",
  },
  gridCellNarrow: {
    width: "100%",
    maxWidth: "100%",
    flexBasis: "100%",
  },
});
