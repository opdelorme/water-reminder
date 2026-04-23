import { LocalStorage } from "@raycast/api";
import { DEFAULT_RULES, MeetingAppRule } from "./detection";

const RULES_KEY = "meeting-rules:v1";

export async function loadRules(): Promise<MeetingAppRule[]> {
  const raw = await LocalStorage.getItem<string>(RULES_KEY);
  if (!raw) return DEFAULT_RULES;
  try {
    const parsed = JSON.parse(raw) as MeetingAppRule[];
    const byId = new Map(parsed.map((r) => [r.bundleId, r]));
    return DEFAULT_RULES.map((def) => byId.get(def.bundleId) ?? def).concat(
      parsed.filter((r) => !DEFAULT_RULES.some((d) => d.bundleId === r.bundleId)),
    );
  } catch {
    return DEFAULT_RULES;
  }
}

export async function saveRules(rules: MeetingAppRule[]): Promise<void> {
  await LocalStorage.setItem(RULES_KEY, JSON.stringify(rules));
}

export async function resetRules(): Promise<void> {
  await LocalStorage.removeItem(RULES_KEY);
}
