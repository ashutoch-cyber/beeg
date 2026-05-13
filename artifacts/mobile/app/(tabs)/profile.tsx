import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useState } from "react";
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BasicInfoScreen } from "@/components/profile/BasicInfoScreen";
import { CalorieInfoScreen } from "@/components/profile/CalorieInfoScreen";
import { PrimaryGoalScreen } from "@/components/profile/PrimaryGoalScreen";
import {
  PROFILE_GREEN,
  formatStoredDate,
  readJsonStorage,
  readStorage,
  writeStorage,
} from "@/components/profile/storage";
import { useNutrition } from "@/context/NutritionContext";
import { useColors } from "@/hooks/useColors";
import { isDesktopWidth } from "@/lib/responsive";

type ActiveScreen = "profile" | "basic" | "goal" | "calorie";

type SavedGoal = {
  goalType?: string;
};

type GeolocationPositionLike = {
  coords: {
    latitude: number;
    longitude: number;
  };
};

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = isDesktopWidth(width);
  const { goals } = useNutrition();
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>("profile");
  const [username, setUsername] = useState("");
  const [usernameInput, setUsernameInput] = useState("");
  const [bio, setBio] = useState("");
  const [bioInput, setBioInput] = useState("");
  const [location, setLocation] = useState("");
  const [firstVisit, setFirstVisit] = useState("");
  const [avatar, setAvatar] = useState("");
  const [toast, setToast] = useState("");
  const [locationError, setLocationError] = useState("");
  const [detectingLocation, setDetectingLocation] = useState(false);
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const loadProfile = () => {
    const storedUsername = readStorage("bee_username") ?? "";
    const storedBio = readStorage("bee_bio") ?? "";
    const storedLocation = readStorage("bee_location") ?? "";
    const storedAvatar = readStorage("bee_avatar") ?? "";
    let storedFirstVisit = readStorage("bee_first_visit");

    if (!storedFirstVisit) {
      storedFirstVisit = new Date().toISOString();
      writeStorage("bee_first_visit", storedFirstVisit);
    }

    setUsername(storedUsername);
    setUsernameInput(storedUsername);
    setBio(storedBio);
    setBioInput(storedBio);
    setLocation(storedLocation);
    setFirstVisit(storedFirstVisit);
    setAvatar(storedAvatar);
  };

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 1800);
    return () => clearTimeout(timer);
  }, [toast]);

  const showToast = (message = "Saved successfully!") => {
    setToast(message);
  };

  const handleSubScreenSaved = (message = "Saved successfully!") => {
    loadProfile();
    setActiveScreen("profile");
    showToast(message);
  };

  if (activeScreen === "basic") {
    return (
      <BasicInfoScreen
        onBack={() => setActiveScreen("profile")}
        onSaved={handleSubScreenSaved}
      />
    );
  }

  if (activeScreen === "goal") {
    return (
      <PrimaryGoalScreen
        onBack={() => setActiveScreen("profile")}
        onSaved={handleSubScreenSaved}
      />
    );
  }

  if (activeScreen === "calorie") {
    return <CalorieInfoScreen onBack={() => setActiveScreen("profile")} />;
  }

  const savedGoal = readJsonStorage<SavedGoal | null>("bee_goal", null);
  const initials = getInitials(username);

  const saveUsername = () => {
    const value = usernameInput.slice(0, 30);
    writeStorage("bee_username", value);
    setUsername(value);
    showToast();
  };

  const saveBio = () => {
    const value = bioInput.slice(0, 150);
    writeStorage("bee_bio", value);
    setBio(value);
    showToast();
  };

  const pickAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      if (!asset.base64) {
        showToast("Could not read selected image.");
        return;
      }

      const dataUri = `data:${asset.mimeType ?? "image/jpeg"};base64,${asset.base64}`;
      writeStorage("bee_avatar", dataUri);
      setAvatar(dataUri);
      showToast();
    } catch {
      showToast("Could not open image picker.");
    }
  };

  const detectLocation = () => {
    setLocationError("");
    const nav = (globalThis as typeof globalThis & {
      navigator?: {
        geolocation?: {
          getCurrentPosition: (
            success: (position: GeolocationPositionLike) => void,
            error: () => void
          ) => void;
        };
      };
    }).navigator;

    if (!nav?.geolocation) {
      setLocationError("Location is not available on this device.");
      return;
    }

    setDetectingLocation(true);
    nav.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`
          );
          if (!res.ok) throw new Error("Location lookup failed");
          const data = await res.json();
          const address = data?.address ?? {};
          const place = address.city || address.town || address.village || "";
          const country = address.country || "";
          const full = [place, country].filter(Boolean).join(", ");
          const value = full || "Location detected";
          writeStorage("bee_location", value);
          setLocation(value);
          setLocationError("");
        } catch {
          setLocationError("Could not detect location. Please try again.");
        } finally {
          setDetectingLocation(false);
        }
      },
      () => {
        setDetectingLocation(false);
        setLocationError("Location access denied");
      }
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPadding + 118 }}
      >
        <View style={[styles.profileHeader, { paddingTop: topPadding + 22 }]}>
          <TouchableOpacity style={styles.avatarWrap} onPress={pickAvatar} activeOpacity={0.85}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatarImage} resizeMode="cover" />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={[styles.avatarInitials, { fontFamily: "Inter_700Bold" }]}>{initials}</Text>
              </View>
            )}
            <View style={styles.cameraBadge}>
              <Feather name="camera" size={15} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          <Text style={[styles.headerName, { fontFamily: "Inter_700Bold" }]}>
            {username || "Bee User"}
          </Text>
          <Text style={[styles.headerMeta, { fontFamily: "Inter_400Regular" }]}>
            User since: {formatStoredDate(firstVisit) || "Today"}
          </Text>
          <Text style={[styles.headerMeta, { fontFamily: "Inter_400Regular" }]}>
            {location || "Location not set"}
          </Text>
        </View>

        <View style={[styles.body, isDesktop && styles.desktopBody]}>
          <Section title="Username">
            <View style={styles.inputRow}>
              <TextInput
                style={[
                  styles.singleInput,
                  { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
                ]}
                value={usernameInput}
                onChangeText={(value) => setUsernameInput(value.slice(0, 30))}
                placeholder="Enter your username"
                placeholderTextColor={colors.mutedForeground}
                maxLength={30}
              />
              <TouchableOpacity style={styles.inlineSaveBtn} onPress={saveUsername} activeOpacity={0.9}>
                <Text style={[styles.inlineSaveText, { fontFamily: "Inter_700Bold" }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </Section>

          <Section title="Bio">
            <TextInput
              style={[
                styles.bioInput,
                { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
              ]}
              value={bioInput}
              onChangeText={(value) => setBioInput(value.slice(0, 150))}
              placeholder="Write something about yourself..."
              placeholderTextColor={colors.mutedForeground}
              maxLength={150}
              multiline
              textAlignVertical="top"
            />
            <View style={styles.bioFooter}>
              <Text style={[styles.counter, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                {bioInput.length}/150
              </Text>
              <TouchableOpacity style={styles.bioSaveBtn} onPress={saveBio} activeOpacity={0.9}>
                <Text style={[styles.inlineSaveText, { fontFamily: "Inter_700Bold" }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </Section>

          <Section title="Location" subtitle="Visible only to you">
            <Text style={[styles.currentValue, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
              {location || "No location saved"}
            </Text>
            <TouchableOpacity style={styles.detectBtn} onPress={detectLocation} activeOpacity={0.9}>
              <Feather name="map-pin" size={17} color="#FFFFFF" />
              <Text style={[styles.detectText, { fontFamily: "Inter_700Bold" }]}>
                {detectingLocation ? "Detecting..." : "Detect My Location"}
              </Text>
            </TouchableOpacity>
            {locationError ? (
              <Text style={[styles.errorText, { fontFamily: "Inter_500Medium" }]}>{locationError}</Text>
            ) : null}
            {location ? (
              <Text style={[styles.detectedText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                {location}
              </Text>
            ) : null}
          </Section>

          <View style={styles.rowsWrap}>
            <ProfileRow
              icon="user"
              title="Basic Information"
              subtitle="Height, Weight, Age, Gender"
              onPress={() => setActiveScreen("basic")}
            />
            <ProfileRow
              icon="flag"
              title="Primary Goal"
              subtitle={savedGoal?.goalType || "Not set"}
              onPress={() => setActiveScreen("goal")}
            />
            <ProfileRow
              icon="zap"
              title="Calorie Information"
              subtitle={`${goals?.calories ?? 2500} kcal daily goal`}
              onPress={() => setActiveScreen("calorie")}
            />
          </View>
        </View>
      </ScrollView>

      {toast ? (
        <View style={styles.toast}>
          <Feather name="check" size={16} color="#FFFFFF" />
          <Text style={[styles.toastText, { fontFamily: "Inter_600SemiBold" }]}>{toast}</Text>
        </View>
      ) : null}
    </View>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <View style={styles.section}>
      <View>
        <Text style={[styles.sectionTitle, { color: colors.darkGreen, fontFamily: "Inter_700Bold" }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function ProfileRow({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <TouchableOpacity
      style={[styles.profileRow, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.86}
    >
      <View style={[styles.rowIcon, { backgroundColor: colors.paleGreen }]}>
        <Feather name={icon} size={19} color={PROFILE_GREEN} />
      </View>
      <View style={styles.rowCopy}>
        <Text style={[styles.rowTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          {title}
        </Text>
        <Text style={[styles.rowSubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          {subtitle}
        </Text>
      </View>
      <Feather name="chevron-right" size={22} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

function getInitials(username: string) {
  const trimmed = username.trim();
  if (!trimmed) return "B";
  const parts = trimmed.split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "B";
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  profileHeader: {
    width: "100%",
    backgroundColor: PROFILE_GREEN,
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 26,
  },
  avatarWrap: { width: 92, height: 92, alignItems: "center", justifyContent: "center" },
  avatarImage: { width: 80, height: 80, borderRadius: 40 },
  avatarFallback: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#081F15",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: { color: "#FFFFFF", fontSize: 28 },
  cameraBadge: {
    position: "absolute",
    right: 4,
    bottom: 6,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#081F15",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  headerName: { color: "#FFFFFF", fontSize: 22, marginTop: 6 },
  headerMeta: { color: "rgba(255,255,255,0.82)", fontSize: 13, marginTop: 4 },
  body: { padding: 16, gap: 20 },
  desktopBody: { width: "100%", maxWidth: 760, alignSelf: "center" },
  section: { gap: 10 },
  sectionTitle: { fontSize: 18 },
  sectionSubtitle: { fontSize: 13, marginTop: 2 },
  inputRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  singleInput: {
    flex: 1,
    minWidth: 0,
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  inlineSaveBtn: {
    minHeight: 50,
    borderRadius: 14,
    paddingHorizontal: 18,
    backgroundColor: PROFILE_GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  inlineSaveText: { color: "#FFFFFF", fontSize: 14 },
  bioInput: {
    minHeight: 112,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  bioFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  counter: { fontSize: 12 },
  bioSaveBtn: {
    minHeight: 42,
    borderRadius: 12,
    paddingHorizontal: 18,
    backgroundColor: PROFILE_GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  currentValue: { fontSize: 14 },
  detectBtn: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: PROFILE_GREEN,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  detectText: { color: "#FFFFFF", fontSize: 15 },
  errorText: { color: "#D32F2F", fontSize: 13 },
  detectedText: { fontSize: 13 },
  rowsWrap: { gap: 12 },
  profileRow: {
    minHeight: 78,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowIcon: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  rowCopy: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 15 },
  rowSubtitle: { fontSize: 12, marginTop: 3 },
  toast: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 98,
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: PROFILE_GREEN,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  toastText: { color: "#FFFFFF", fontSize: 14 },
});
