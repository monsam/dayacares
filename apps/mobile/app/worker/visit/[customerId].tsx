import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { getCustomer } from "../../../src/api/customers";
import { useAuth } from "../../../src/auth/AuthContext";
import { GuidedVitalsForm } from "../../../src/components/vitals/GuidedVitalsForm";
import { useTheme } from "../../../src/theme/ThemeContext";
import { fontFamily } from "../../../src/theme/tokens";

export default function VisitScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { session } = useAuth();
  const { customerId } = useLocalSearchParams<{ customerId: string }>();
  const id = customerId ?? "";
  const query = useQuery({
    queryKey: ["customer", id],
    queryFn: () => getCustomer(id),
    enabled: Boolean(id),
    retry: 1,
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <View
        style={{
          minHeight: 56,
          backgroundColor: colors.navy,
          paddingHorizontal: 20,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Pressable onPress={() => router.push("/home")} accessibilityRole="button">
          <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "600", fontFamily, width: 56 }}>
            Home
          </Text>
        </Pressable>
        <Text style={{ color: "#FFFFFF", fontSize: 20, fontWeight: "800", fontFamily }}>Home visit</Text>
        <View style={{ width: 56 }} />
      </View>
      {query.isLoading ? (
        <Text style={{ padding: 24, color: colors.inkMuted }}>Loading Care Focus from MySQL…</Text>
      ) : null}
      {query.isError || !id ? (
        <Text style={{ padding: 24, color: colors.inkMuted }}>
          This Care Focus is not in MySQL, or the API is offline.
        </Text>
      ) : null}
      {query.data ? (
        <GuidedVitalsForm
          customerId={query.data.customer_id}
          customerName={query.data.name}
          address={query.data.address}
          workerName={session?.name ?? "Care Giver"}
        />
      ) : null}
    </View>
  );
}
