/** Foydalanuvchi profil maydonlari — API va UI uchun umumiy tip */
export interface UserProfileFields {
  name: string;
  tcallId: string;
  language?: string;
  status?: string;
  online?: boolean;
  avatar?: string | null;
  bio?: string | null;
  age?: number | null;
  city?: string | null;
  country?: string | null;
  address?: string | null;
  workplace?: string | null;
  education?: string | null;
  graduatedFrom?: string | null;
  profession?: string | null;
  interests?: string | null;
  skills?: string | null;
  about?: string | null;
  blockedYou?: boolean;
  blockedByYou?: boolean;
  isFriend?: boolean;
  unblockRequestPending?: boolean;
  unblockRequestFromThem?: boolean;
}

export const PUBLIC_LOOKUP_SELECT = {
  id: true,
  name: true,
  language: true,
  tcallId: true,
  status: true,
  avatar: true,
  bio: true,
  city: true,
  country: true,
  profession: true,
} as const;

export const PROFILE_SELECT = {
  id: true,
  name: true,
  language: true,
  tcallId: true,
  status: true,
  avatar: true,
  bio: true,
  age: true,
  city: true,
  country: true,
  address: true,
  workplace: true,
  education: true,
  graduatedFrom: true,
  profession: true,
  interests: true,
  skills: true,
  about: true,
} as const;

export type ProfileDetailKey =
  | "age"
  | "city"
  | "country"
  | "address"
  | "workplace"
  | "education"
  | "graduatedFrom"
  | "profession"
  | "interests"
  | "skills"
  | "about"
  | "bio";

export const PROFILE_DETAIL_KEYS: ProfileDetailKey[] = [
  "age",
  "city",
  "country",
  "address",
  "workplace",
  "education",
  "graduatedFrom",
  "profession",
  "interests",
  "skills",
  "about",
  "bio",
];

export function formatProfileAge(age: number | null | undefined, ui: Record<string, string>): string | null {
  if (age == null || age < 1 || age > 120) return null;
  return `${age} ${ui.profileYearsOld}`;
}

/** API lookup javobini profil kartaga aylantirish */
export function mapLookupUser(u: Record<string, unknown>): UserProfileFields & {
  userId?: string;
  avatarUrl?: string | null;
} {
  return {
    userId: u.id as string | undefined,
    name: u.name as string,
    tcallId: u.tcallId as string,
    language: u.language as string | undefined,
    status: u.status as string | undefined,
    online: u.online as boolean | undefined,
    avatar: u.avatar as string | null | undefined,
    avatarUrl: u.avatarUrl as string | null | undefined,
    bio: u.bio as string | null | undefined,
    age: u.age as number | null | undefined,
    city: u.city as string | null | undefined,
    country: u.country as string | null | undefined,
    address: u.address as string | null | undefined,
    workplace: u.workplace as string | null | undefined,
    education: u.education as string | null | undefined,
    graduatedFrom: u.graduatedFrom as string | null | undefined,
    profession: u.profession as string | null | undefined,
    interests: u.interests as string | null | undefined,
    skills: u.skills as string | null | undefined,
    about: u.about as string | null | undefined,
    blockedYou: u.blockedYou as boolean | undefined,
    blockedByYou: u.blockedByYou as boolean | undefined,
    isFriend: u.isFriend as boolean | undefined,
    unblockRequestPending: u.unblockRequestPending as boolean | undefined,
    unblockRequestFromThem: u.unblockRequestFromThem as boolean | undefined,
  };
}

/** Do'st bo'lmagan foydalanuvchilar uchun maxfiy maydonlarni yashirish */
export function redactLookupProfile<T extends Record<string, unknown>>(
  user: T,
  isFriend: boolean
): T {
  if (isFriend) return user;
  const hidden = ["address", "workplace", "education", "graduatedFrom", "interests", "skills", "about", "age"] as const;
  const copy = { ...user };
  for (const key of hidden) {
    if (key in copy) (copy as Record<string, unknown>)[key] = null;
  }
  return copy;
}
