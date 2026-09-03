import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import type { DirectoryUser, UserRole } from "@daya/shared";
import { createUser, deleteUser, listUsers, updateUser } from "../../src/api/users";
import { ROLE_LABEL, useAuth } from "../../src/auth/AuthContext";
import { DEMO_PASSWORD } from "../../src/auth/demoAccounts";
import { apiErrorMessage } from "../../src/lib/scheduleDisplay";
import { useTheme } from "../../src/theme/ThemeContext";
import { fontFamily, type } from "../../src/theme/tokens";
import { Button } from "../../src/ui/Button";
import { Card } from "../../src/ui/Card";
import { Chip } from "../../src/ui/Chip";
import { PageShell } from "../../src/ui/Page";
import { TextField } from "../../src/ui/TextField";

const ROLE_ORDER: UserRole[] = ["ADMIN", "WORKER", "CUSTOMER", "FAMILY"];

interface UserDraft {
  full_name: string;
  phone_number: string;
  email: string;
  role: UserRole;
  address: string;
  password: string;
}

function emptyDraft(): UserDraft {
  return { full_name: "", phone_number: "", email: "", role: "WORKER", address: "", password: "" };
}

function draftFromUser(user: DirectoryUser): UserDraft {
  return {
    full_name: user.full_name,
    phone_number: user.phone_number,
    email: user.email,
    role: user.role,
    address: user.address ?? "",
    password: "",
  };
}

export default function UsersScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session, ready } = useAuth();
  const [createDraft, setCreateDraft] = useState<UserDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string>();
  const [editDraft, setEditDraft] = useState<UserDraft>(emptyDraft);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();

  const query = useQuery({
    queryKey: ["users"],
    queryFn: listUsers,
    enabled: session?.role === "ADMIN",
    retry: 1,
  });

  useEffect(() => {
    if (ready && session?.role !== "ADMIN") {
      router.replace(session ? "/home" : "/");
    }
  }, [ready, session, router]);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["users"] });
    await queryClient.invalidateQueries({ queryKey: ["customers"] });
    await queryClient.invalidateQueries({ queryKey: ["workers"] });
    await queryClient.invalidateQueries({ queryKey: ["routing"] });
    await queryClient.invalidateQueries({ queryKey: ["home"] });
  };

  const create = useMutation({
    mutationFn: () =>
      createUser({
        full_name: createDraft.full_name,
        phone_number: createDraft.phone_number,
        email: createDraft.email || undefined,
        role: createDraft.role,
        address: createDraft.address || undefined,
        password: createDraft.password.trim() || undefined,
      }),
    onSuccess: async (user) => {
      setError(undefined);
      setCreateDraft(emptyDraft());
      const loginHint = user.temporary_password
        ? ` They can log in as ${user.username} with ${user.temporary_password}.`
        : ` They can log in as ${user.username} with the password you set.`;
      setNotice(`Created ${user.full_name}.${loginHint}`);
      await refresh();
    },
    onError: (err) => setError(apiErrorMessage(err, "Could not create user.")),
  });

  const save = useMutation({
    mutationFn: () => {
      if (!editingId) throw new Error("No user selected.");
      return updateUser(editingId, {
        full_name: editDraft.full_name,
        phone_number: editDraft.phone_number,
        email: editDraft.email || undefined,
        role: editDraft.role,
        address: editDraft.address || undefined,
        password: editDraft.password.trim() || undefined,
      });
    },
    onSuccess: async () => {
      setError(undefined);
      setNotice("Saved.");
      setEditingId(undefined);
      await refresh();
    },
    onError: (err) => setError(apiErrorMessage(err, "Could not save user.")),
  });

  const remove = useMutation({
    mutationFn: (userId: string) => deleteUser(userId),
    onSuccess: async () => {
      setError(undefined);
      setNotice("User deleted.");
      setEditingId(undefined);
      await refresh();
    },
    onError: (err) => setError(apiErrorMessage(err, "Could not delete user.")),
  });

  const grouped = ROLE_ORDER.map((role) => ({
    role,
    users: (query.data ?? []).filter((user) => user.role === role),
  })).filter((group) => group.users.length);

  const confirmDelete = (user: DirectoryUser) => {
    Alert.alert(
      `Delete ${user.full_name}?`,
      "This also removes their assignments, schedules, and visit logs.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => remove.mutate(user.user_id) },
      ],
    );
  };

  return (
    <PageShell
      title="Users"
      lead={
        <Text style={[styles.lead, { color: colors.inkMuted }]}>
          Create staff or family accounts here. They can log in with the username shown and {DEMO_PASSWORD} unless you set a password. For a full Care Recipient, Register on Members still captures the paper form.
        </Text>
      }
    >

        <Card style={styles.card}>
          <Text style={[styles.heading, { color: colors.ink }]}>Create user</Text>
          <UserFields draft={createDraft} onChange={setCreateDraft} mode="create" />
          <Button
            label={create.isPending ? "Creating…" : "Create user"}
            disabled={create.isPending}
            onPress={() => {
              setNotice(undefined);
              setError(undefined);
              create.mutate();
            }}
          />
        </Card>

        {error ? <Text style={[styles.meta, { color: colors.danger }]}>{error}</Text> : null}
        {notice ? <Text style={[styles.meta, { color: colors.blue }]}>{notice}</Text> : null}
        {query.isLoading ? <Text style={[styles.meta, { color: colors.inkMuted }]}>Loading users…</Text> : null}
        {query.isError ? (
          <Text style={[styles.meta, { color: colors.danger }]}>Could not load users. Try again in a moment.</Text>
        ) : null}

        {grouped.map((group) => (
          <Card key={group.role} style={styles.card}>
            <Text style={[styles.heading, { color: colors.ink }]}>
              {ROLE_LABEL[group.role]} · {group.users.length}
            </Text>
            {group.users.map((user) => {
              const editing = editingId === user.user_id;
              return (
                <View key={user.user_id} style={styles.row}>
                  <Text style={[styles.name, { color: colors.ink }]}>{user.full_name}</Text>
                  <Text style={[styles.meta, { color: colors.blue }]}>
                    {ROLE_LABEL[user.role]}
                    {user.username ? ` · login ${user.username}` : ""}
                  </Text>
                  <Text style={[styles.meta, { color: colors.inkMuted }]}>{user.phone_number}</Text>
                  <Text style={[styles.meta, { color: colors.inkMuted }]}>{user.email}</Text>
                  {user.address ? (
                    <Text style={[styles.meta, { color: colors.inkMuted }]}>{user.address}</Text>
                  ) : null}
                  {editing ? (
                    <>
                      <UserFields draft={editDraft} onChange={setEditDraft} mode="edit" />
                      <Button
                        label={save.isPending ? "Saving…" : "Save changes"}
                        disabled={save.isPending}
                        onPress={() => {
                          setNotice(undefined);
                          setError(undefined);
                          save.mutate();
                        }}
                      />
                      <Button label="Cancel" variant="secondary" onPress={() => setEditingId(undefined)} />
                    </>
                  ) : (
                    <View style={styles.actions}>
                      <Button
                        label="Edit"
                        variant="secondary"
                        size="compact"
                        onPress={() => {
                          setEditingId(user.user_id);
                          setEditDraft(draftFromUser(user));
                          setError(undefined);
                          setNotice(undefined);
                        }}
                      />
                      <Button
                        label="Delete"
                        variant="secondary"
                        size="compact"
                        disabled={remove.isPending || user.username === session?.username}
                        onPress={() => confirmDelete(user)}
                      />
                    </View>
                  )}
                </View>
              );
            })}
          </Card>
        ))}
    </PageShell>
  );
}

function UserFields({
  draft,
  onChange,
  mode,
}: {
  draft: UserDraft;
  onChange: (next: UserDraft) => void;
  mode: "create" | "edit";
}) {
  const { colors } = useTheme();
  const set = (patch: Partial<UserDraft>) => onChange({ ...draft, ...patch });
  return (
    <View style={styles.fields}>
      <TextField label="Full name" value={draft.full_name} onChangeText={(full_name) => set({ full_name })} />
      <TextField
        label="Mobile"
        value={draft.phone_number}
        onChangeText={(phone_number) => set({ phone_number })}
        keyboardType="phone-pad"
      />
      <TextField
        label="Email"
        value={draft.email}
        onChangeText={(email) => set({ email })}
        keyboardType="email-address"
      />
      <Text style={[styles.section, { color: colors.ink }]}>Role</Text>
      <View style={styles.chips}>
        {ROLE_ORDER.map((role) => (
          <Chip
            key={role}
            label={ROLE_LABEL[role]}
            selected={draft.role === role}
            onPress={() => set({ role })}
          />
        ))}
      </View>
      {draft.role === "CUSTOMER" ? (
        <TextField
          label="Address (Durgapur)"
          value={draft.address}
          onChangeText={(address) => set({ address })}
        />
      ) : null}
      <TextField
        label={mode === "create" ? "Password (optional)" : "New password (optional)"}
        value={draft.password}
        onChangeText={(password) => set({ password })}
        secureTextEntry
        helper={mode === "create" ? `Leave blank to use ${DEMO_PASSWORD}` : "Leave blank to keep the current password"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  lead: { fontFamily, fontSize: type.body, lineHeight: 26 },
  card: { gap: 10 },
  heading: { fontFamily, fontSize: 22, fontWeight: "800" },
  section: { fontFamily, fontSize: 16, fontWeight: "800" },
  row: { gap: 6, paddingTop: 10 },
  name: { fontFamily, fontSize: 20, fontWeight: "800" },
  meta: { fontFamily, fontSize: 16, lineHeight: 22 },
  fields: { gap: 10 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
