import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

interface ProfileRow {
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
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

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("profiles")
      .select("username,avatar_url,bio,location")
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
      setProfile(
        data
          ? (data as ProfileRow)
          : {
              username: getDefaultUsername(user.email),
              avatar_url: null,
              bio: null,
              location: null,
            },
      );
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

      const payload = {
        id: user.id,
        email: user.email ?? null,
        ...data,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("profiles").upsert(payload, {
        onConflict: "id",
      });

      if (error) throw error;

      setProfile((current) => ({
        username: data.username ?? current?.username ?? getDefaultUsername(user.email),
        avatar_url: current?.avatar_url ?? null,
        bio: data.bio ?? current?.bio ?? null,
        location: data.location ?? current?.location ?? null,
      }));
    },
    [user],
  );

  const updateAvatar = useCallback(
    async (localUri: string) => {
      if (!user) throw new Error("User is not authenticated");

      const contentType = getContentType(localUri);
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

      if (uploadError) throw uploadError;

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
    [user],
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
