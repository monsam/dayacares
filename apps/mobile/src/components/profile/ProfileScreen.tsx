import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { getProfile, updateProfile } from "../../api/profile";
import { ROLE_LABEL, useAuth } from "../../auth/AuthContext";
import { apiErrorMessage } from "../../lib/scheduleDisplay";
import { useTheme } from "../../theme/ThemeContext";
import { fontFamily, type } from "../../theme/tokens";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { FORM_MAX, PageShell } from "../../ui/Page";
import { TextField } from "../../ui/TextField";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function ProfileScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session, ready, updateSession } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();

  useEffect(() => {
    if (ready && !session) {
      router.replace("/");
    }
  }, [ready, session, router]);

  const profile = useQuery({
    queryKey: ["profile"],
    queryFn: getProfile,
    enabled: Boolean(session),
    retry: 1,
  });

  useEffect(() => {
    if (!profile.data) return;
    setFullName(profile.data.full_name);
    setPhone(profile.data.phone_number);
    setEmail(profile.data.email);
    setAddress(profile.data.address ?? "");
    setPassword("");
  }, [profile.data]);

  const save = useMutation({
    mutationFn: () =>
      updateProfile({
        full_name: fullName,
        phone_number: phone,
        email,
        password: password.trim() || undefined,
        address: session?.role === "CUSTOMER" ? address : undefined,
      }),
    onSuccess: async (user) => {
      setError(undefined);
      setPassword("");
      setNotice("Profile saved.");
      await updateSession({ name: user.full_name });
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      await queryClient.invalidateQueries({ queryKey: ["home"] });
    },
    onError: (err) => setError(apiErrorMessage(err, "Could not save your profile.")),
  });

  if (!session) return null;

  return (
    <PageShell
      title="Profile"
      backTo="/home"
      backLabel="Home"
      maxWidth={FORM_MAX}
      lead={
        <Text style={[styles.lead, { color: colors.inkMuted }]}>
          Your account details. Change your name, contact, or password here.
        </Text>
      }
    >
      <Card style={styles.card}>
        <View style={styles.hero}>
          <View style={[styles.avatar, { backgroundColor: colors.blue }]}>
            <Text style={styles.avatarText}>{initials(profile.data?.full_name ?? session.name)}</Text>
          </View>
          <View style={styles.heroCopy}>
            <Text style={[styles.name, { color: colors.ink }]}>{profile.data?.full_name ?? session.name}</Text>
            <Text style={[styles.meta, { color: colors.blue }]}>{ROLE_LABEL[session.role]}</Text>
            <Text style={[styles.meta, { color: colors.inkMuted }]}>
              Username {profile.data?.username ?? session.username}
            </Text>
          </View>
        </View>
      </Card>

      {profile.isLoading ? <Text style={[styles.meta, { color: colors.inkMuted }]}>Loading profile…</Text> : null}
      {profile.isError ? (
        <Text style={[styles.meta, { color: colors.danger }]}>Could not load your profile. Try again in a moment.</Text>
      ) : null}

      <Card style={styles.card}>
        <Text style={[styles.heading, { color: colors.ink }]}>Edit profile</Text>
        <TextField label="Full name" value={fullName} onChangeText={setFullName} />
        <TextField label="Mobile" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <TextField label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
        {session.role === "CUSTOMER" ? (
          <TextField label="Address" value={address} onChangeText={setAddress} />
        ) : null}
        <TextField
          label="New password (optional)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          helper="Leave blank to keep the current password. Minimum 6 characters."
        />
        {error ? <Text style={[styles.meta, { color: colors.danger }]}>{error}</Text> : null}
        {notice ? <Text style={[styles.meta, { color: colors.blue }]}>{notice}</Text> : null}
        <Button
          label={save.isPending ? "Saving…" : "Save profile"}
          disabled={save.isPending || !fullName.trim() || !phone.trim()}
          onPress={() => {
            setNotice(undefined);
            setError(undefined);
            save.mutate();
          }}
        />
      </Card>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  lead: { fontFamily, fontSize: type.body, lineHeight: 26 },
  card: { gap: 12 },
  hero: { flexDirection: "row", alignItems: "center", gap: 16 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#FFFFFF", fontFamily, fontWeight: "700", fontSize: 22 },
  heroCopy: { flex: 1, gap: 4 },
  name: { fontFamily, fontSize: 24, fontWeight: "700" },
  heading: { fontFamily, fontSize: 22, fontWeight: "800" },
  meta: { fontFamily, fontSize: 16, lineHeight: 22 },
});
