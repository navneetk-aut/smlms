import { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, TextInput,
  Modal, KeyboardAvoidingView, Platform, ScrollView, Alert,
} from "react-native";
import { Image } from "expo-image";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@react-native-vector-icons/feather";
import { colors, spacing, radius, fonts } from "@/src/theme";
import { api, type Book } from "@/src/api";

export default function ManageBooksScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Book | null>(null);
  const [form, setForm] = useState({
    title: "", author: "", category: "", isbn: "",
    description: "", cover_url: "", location: "Main Shelf", total_copies: "3",
  });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setBooks(await api.listBooks({ q: q || undefined }));
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const openNew = () => {
    setEditing(null);
    setForm({ title: "", author: "", category: "Fiction", isbn: "", description: "", cover_url: "", location: "Main Shelf", total_copies: "3" });
    setModalOpen(true);
  };

  const openEdit = (b: Book) => {
    setEditing(b);
    setForm({
      title: b.title, author: b.author, category: b.category,
      isbn: b.isbn || "", description: b.description, cover_url: b.cover_url,
      location: b.location, total_copies: String(b.total_copies),
    });
    setModalOpen(true);
  };

  const onSave = async () => {
    if (!form.title.trim() || !form.author.trim() || !form.category.trim()) {
      Alert.alert("Missing fields", "Title, author, and category are required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        author: form.author.trim(),
        category: form.category.trim(),
        isbn: form.isbn.trim() || null,
        description: form.description.trim(),
        cover_url: form.cover_url.trim(),
        location: form.location.trim() || "Main Shelf",
        total_copies: Math.max(1, parseInt(form.total_copies || "1", 10)),
      };
      if (editing) await api.updateBook(editing.id, payload);
      else await api.createBook(payload);
      setModalOpen(false);
      load();
    } catch (e: any) {
      Alert.alert("Could not save", e.message);
    } finally {
      setSaving(false);
    }
  };

  const onDelete = (b: Book) => {
    Alert.alert("Delete book", `Remove '${b.title}' from the catalog?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api.deleteBook(b.id);
            load();
          } catch (e: any) {
            Alert.alert("Could not delete", e.message);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.root} testID="manage-books-screen">
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="arrow-left" size={20} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Manage Books</Text>
        <View style={{ width: 42 }} />
      </View>

      <View style={styles.searchWrap}>
        <View style={styles.searchRow}>
          <Icon name="search" size={18} color={colors.muted} />
          <TextInput
            value={q}
            onChangeText={(v) => { setQ(v); setTimeout(load, 250); }}
            placeholder="Search books..."
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.brand} /></View>
      ) : (
        <FlatList
          data={books}
          keyExtractor={(b) => b.id}
          contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: insets.bottom + 100, gap: spacing.md }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Image source={item.cover_url} style={styles.cover} contentFit="cover" />
              <View style={{ flex: 1 }}>
                <Text style={styles.bookTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.bookAuthor}>{item.author}</Text>
                <Text style={styles.bookMeta}>
                  {item.category} • {item.available_copies}/{item.total_copies} available
                </Text>
                <View style={styles.cardActions}>
                  <Pressable testID={`edit-${item.id}`} onPress={() => openEdit(item)} style={styles.editBtn}>
                    <Icon name="edit-2" size={14} color={colors.onBrandSecondary} />
                    <Text style={styles.editText}>Edit</Text>
                  </Pressable>
                  <Pressable testID={`delete-${item.id}`} onPress={() => onDelete(item)} style={styles.deleteBtn}>
                    <Icon name="trash-2" size={14} color={colors.error} />
                  </Pressable>
                </View>
              </View>
            </View>
          )}
        />
      )}

      <Pressable testID="add-book-fab" onPress={openNew} style={[styles.fab, { bottom: insets.bottom + spacing.xl }]}>
        <Icon name="plus" size={24} color={colors.onBrandPrimary} />
      </Pressable>

      <Modal visible={modalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalBg}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={[styles.modalCard, { paddingBottom: insets.bottom + spacing.xl }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editing ? "Edit book" : "Add book"}</Text>
              <Pressable onPress={() => setModalOpen(false)}>
                <Icon name="x" size={22} color={colors.onSurface} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {[
                { k: "title", label: "Title" },
                { k: "author", label: "Author" },
                { k: "category", label: "Category" },
                { k: "isbn", label: "ISBN" },
                { k: "location", label: "Location" },
                { k: "cover_url", label: "Cover URL" },
                { k: "total_copies", label: "Total copies", kb: "numeric" },
                { k: "description", label: "Description", multi: true },
              ].map((f) => (
                <View key={f.k}>
                  <Text style={styles.label}>{f.label}</Text>
                  <TextInput
                    value={(form as any)[f.k]}
                    onChangeText={(v) => setForm({ ...form, [f.k]: v })}
                    multiline={f.multi}
                    keyboardType={f.kb as any}
                    style={[styles.input, f.multi && { minHeight: 80, textAlignVertical: "top" }]}
                    placeholderTextColor={colors.muted}
                  />
                </View>
              ))}
              <Pressable testID="save-book" onPress={onSave} disabled={saving} style={styles.saveBtn}>
                {saving ? (
                  <ActivityIndicator color={colors.onBrandPrimary} />
                ) : (
                  <Text style={styles.saveText}>{editing ? "Save changes" : "Add book"}</Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: {
    paddingHorizontal: spacing.xl, paddingBottom: spacing.md,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  backBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: colors.border,
  },
  title: { fontFamily: fonts.display, fontSize: 20, color: colors.onSurface },
  searchWrap: { paddingHorizontal: spacing.xl, marginBottom: spacing.md },
  searchRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md, paddingHorizontal: spacing.lg,
    height: 44, borderWidth: 1, borderColor: colors.border,
  },
  searchInput: { flex: 1, fontFamily: fonts.text, color: colors.onSurface },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: {
    flexDirection: "row", gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
  },
  cover: { width: 60, height: 90, borderRadius: radius.sm, backgroundColor: colors.surfaceTertiary },
  bookTitle: { fontFamily: "DMSans-Bold", color: colors.onSurface, fontSize: 14 },
  bookAuthor: { fontFamily: fonts.text, color: colors.muted, fontSize: 12, marginTop: 2 },
  bookMeta: { fontFamily: fonts.text, color: colors.muted, fontSize: 11, marginTop: spacing.xs },
  cardActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  editBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: colors.brandSecondary,
    paddingHorizontal: spacing.md, paddingVertical: 6,
    borderRadius: radius.pill,
  },
  editText: { fontFamily: "DMSans-Bold", color: colors.onBrandSecondary, fontSize: 12 },
  deleteBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.surfaceTertiary,
    alignItems: "center", justifyContent: "center",
  },
  fab: {
    position: "absolute", right: spacing.xl,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.brandPrimary,
    alignItems: "center", justifyContent: "center",
    elevation: 6, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 8,
  },
  modalBg: { flex: 1, backgroundColor: "rgba(28,27,26,0.5)", justifyContent: "flex-end" },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg,
    padding: spacing.xl, maxHeight: "90%",
  },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg },
  modalTitle: { fontFamily: fonts.display, fontSize: 22, color: colors.onSurface },
  label: {
    fontFamily: fonts.text, fontSize: 11, color: colors.muted,
    marginTop: spacing.md, marginBottom: spacing.xs,
    letterSpacing: 1, textTransform: "uppercase",
  },
  input: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.lg, paddingVertical: 12,
    fontFamily: fonts.text, color: colors.onSurface,
  },
  saveBtn: {
    backgroundColor: colors.brandPrimary, borderRadius: radius.pill,
    paddingVertical: 14, alignItems: "center", marginTop: spacing.xl,
  },
  saveText: { color: colors.onBrandPrimary, fontFamily: "DMSans-Bold", fontSize: 16 },
});
