import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

interface ProfileRow {
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
}

interface LegacyProfileRow {
  email: string | null;
  display_name: string | null;
}

interface ProfileContextType {
  username: string | null;
  avatarUrl: string | null;
  bio: string | null;
  location: string | null;
  loading: boolean;
  updateProfile: (data: {
    username?: string;
    bio?: string;
    location?: string;
  }) => Promise<void>;
  updateAvatar: (localUri: string) => Promise<string>;
  refreshProfile: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | null>(null);

type ProfileSchemaMode = "unknown" | "modern" | "legacy";

function getDefaultUsername(email?: string | null) {
  return email?.split("@")[0] ?? null;
}

function getContentType(uri: string) {
  if (uri.startsWith("data:image/png")) return "image/png";
  if (uri.startsWith("data:image/webp")) return "image/webp";
  return "image/jpeg";
}

function getExtension(contentType: string) {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "jpg";
}

function isMissingProfileFieldError(error: { message?: string; details?: string; hint?: string }) {
  const text = `${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`.toLowerCase();
  return (
    text.includes("username") ||
    text.includes("avatar_url") ||
    text.includes("bio") ||
    text.includes("location") ||
    text.includes("schema cache")
  );
}

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [schemaMode, setSchemaMode] = useState<ProfileSchemaMode>("unknown");

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Failed to load profile", error);
      setProfile({
        username: getDefaultUsername(user.email),
        avatar_url: null,
        bio: null,
        location: null,
      });
    } else {
      const rawProfile = data as (LegacyProfileRow & Partial<ProfileRow>) | null;
      const hasModernFields = Boolean(
        rawProfile &&
          ("username" in rawProfile ||
            "avatar_url" in rawProfile ||
            "bio" in rawProfile ||
            "location" in rawProfile),
      );

      setSchemaMode(hasModernFields || !rawProfile ? "modern" : "legacy");
      setProfile({
        username:
          rawProfile?.username ??
          rawProfile?.display_name ??
          getDefaultUsername(rawProfile?.email ?? user.email),
        avatar_url: rawProfile?.avatar_url ?? null,
        bio: rawProfile?.bio ?? null,
        location: rawProfile?.location ?? null,
      });
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    refreshProfile().catch((error) => {
      console.error("Failed to load profile", error);
      setLoading(false);
    });
  }, [refreshProfile]);

  const updateProfile = useCallback(
    async (data: { username?: string; bio?: string; location?: string }) => {
      if (!user) return;

      if (schemaMode === "legacy") {
        if (data.bio !== undefined || data.location !== undefined) {
          throw new Error("Profile details require the latest database migration.");
        }

        const { error } = await supabase.from("profiles").upsert(
          {
            id: user.id,
            email: user.email ?? null,
            display_name: data.username ?? getDefaultUsername(user.email),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" },
        );

        if (error) throw error;

        setProfile((current) => ({
          username: data.username ?? current?.username ?? getDefaultUsername(user.email),
          avatar_url: current?.avatar_url ?? null,
          bio: current?.bio ?? null,
          location: current?.location ?? null,
        }));
        return;
      }

      const payload = {
        id: user.id,
        email: user.email ?? null,
        ...data,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("profiles").upsert(payload, {
        onConflict: "id",
      });

      if (error) {
        if (isMissingProfileFieldError(error) && data.username !== undefined) {
          setSchemaMode("legacy");
          const { error: legacyError } = await supabase.from("profiles").upsert(
            {
              id: user.id,
              email: user.email ?? null,
              display_name: data.username,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id" },
          );

          if (legacyError) throw legacyError;

          setProfile((current) => ({
            username: data.username ?? current?.username ?? getDefaultUsername(user.email),
            avatar_url: current?.avatar_url ?? null,
            bio: current?.bio ?? null,
            location: current?.location ?? null,
          }));
          return;
        }

        throw error;
      }

      setProfile((current) => ({
        username: data.username ?? current?.username ?? getDefaultUsername(user.email),
        avatar_url: current?.avatar_url ?? null,
        bio: data.bio ?? current?.bio ?? null,
        location: data.location ?? current?.location ?? null,
      }));
    },
    [schemaMode, user],
  );

  const updateAvatar = useCallback(
    async (localUri: string) => {
      if (!user) throw new Error("User is not authenticated");

      const contentType = getContentType(localUri);
      if (schemaMode === "legacy") {
        throw new Error("Avatar uploads require the latest database migration.");
      }

      const extension = getExtension(contentType);
      const path = `${user.id}/${Date.now()}.${extension}`;
      const response = await fetch(localUri);
      const body = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, body, {
          contentType,
          upsert: true,
        });

      if (uploadError) {
        throw new Error("Avatar upload failed. Make sure the avatars storage bucket exists.");
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = data.publicUrl;

      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          id: user.id,
          email: user.email ?? null,
          avatar_url: publicUrl,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );

      if (profileError) throw profileError;

      setProfile((current) => ({
        username: current?.username ?? getDefaultUsername(user.email),
        avatar_url: publicUrl,
        bio: current?.bio ?? null,
        location: current?.location ?? null,
      }));

      return publicUrl;
    },
    [schemaMode, user],
  );

  return (
    <ProfileContext.Provider
      value={{
        username: profile?.username ?? null,
        avatarUrl: profile?.avatar_url ?? null,
        bio: profile?.bio ?? null,
        location: profile?.location ?? null,
        loading,
        updateProfile,
        updateAvatar,
        refreshProfile,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within ProfileProvider");
  return ctx;
}
