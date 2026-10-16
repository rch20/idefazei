export const MINISTRY_ICON_OPTIONS = [
  { key: "sparkles", label: "Outros", lucideName: "Sparkles" },
  { key: "music", label: "Louvor", lucideName: "Music2" },
  { key: "mic", label: "Áudio e comunicação", lucideName: "Mic2" },
  { key: "speaker", label: "Som", lucideName: "Speaker" },
  { key: "message-circle", label: "Comunicação", lucideName: "MessageCircle" },
  { key: "hands-praying", label: "Intercessão", lucideName: "HandHeart" },
  { key: "heart-handshake", label: "Ação social", lucideName: "HeartHandshake" },
  { key: "heart", label: "Casais", lucideName: "Heart" },
  { key: "baby", label: "Infantil", lucideName: "Baby" },
  { key: "book-open", label: "Ensino", lucideName: "BookOpen" },
  { key: "megaphone", label: "Evangelismo", lucideName: "Megaphone" },
  { key: "utensils", label: "Cozinha", lucideName: "Utensils" },
  { key: "users-round", label: "Recepção e comunidade", lucideName: "UsersRound" },
  { key: "map-pin", label: "Visitas", lucideName: "MapPin" },
  { key: "globe", label: "Missões", lucideName: "Globe2" },
] as const;

export const MINISTRY_ICON_KEYS = MINISTRY_ICON_OPTIONS.map((option) => option.key) as [string, ...string[]];
export type MinistryIconKey = (typeof MINISTRY_ICON_OPTIONS)[number]["key"];
export const DEFAULT_MINISTRY_ICON_KEY: MinistryIconKey = "sparkles";

export function isMinistryIconKey(value: string | null | undefined): value is MinistryIconKey {
  return MINISTRY_ICON_OPTIONS.some((option) => option.key === value);
}
