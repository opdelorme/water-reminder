import { Detail, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import {
  browserActiveUrls,
  detectMeeting,
  micActive,
  runningAppBundleIds,
  MeetingAppRule,
} from "./lib/detection";
import { loadRules } from "./lib/storage";

interface Prefs {
  helperPath: string;
}

interface Report {
  micOn: boolean;
  runningIds: string[];
  rules: MeetingAppRule[];
  matched: { rule: MeetingAppRule; urls: string[] }[];
  verdict: { inMeeting: boolean; reason: string };
}

export default function Debug() {
  const { helperPath } = getPreferenceValues<Prefs>();
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const rules = await loadRules();
        const running = await runningAppBundleIds();
        const runningIds = [...running].sort();
        const micOn = micActive(helperPath);

        const enabledActive = rules.filter((r) => r.enabled && running.has(r.bundleId));
        const matched = await Promise.all(
          enabledActive.map(async (rule) => ({
            rule,
            urls: rule.kind === "browser" ? await browserActiveUrls(rule.bundleId) : [],
          })),
        );
        const verdict = await detectMeeting(rules, helperPath);

        setReport({ micOn, runningIds, rules, matched, verdict });
      } catch (e) {
        setError(String(e));
      }
    })();
  }, [helperPath]);

  if (error) return <Detail markdown={`# Error\n\n\`\`\`\n${error}\n\`\`\``} />;
  if (!report) return <Detail isLoading markdown="Probing..." />;

  const { micOn, runningIds, rules, matched, verdict } = report;
  const enabled = rules.filter((r) => r.enabled);

  const md = [
    `# Meeting Detection Debug`,
    ``,
    `## Verdict`,
    `**${verdict.inMeeting ? "🔕 IN MEETING" : "✅ CLEAR"}**${verdict.reason ? ` — ${verdict.reason}` : ""}`,
    ``,
    `## Probes`,
    `- Mic active: **${micOn ? "YES" : "no"}**`,
    `- Helper path: \`${helperPath}\``,
    ``,
    `## Enabled rules matched to a running app`,
    matched.length === 0
      ? `_No enabled rule's bundle id is currently running._`
      : matched
          .map((m) => {
            const header = `**${m.rule.name}** (\`${m.rule.bundleId}\`, ${m.rule.kind})`;
            if (m.rule.kind === "browser") {
              const domains = m.rule.browserDomains ?? [];
              const urlBlock = m.urls.length
                ? m.urls
                    .slice(0, 30)
                    .map((u) => {
                      const hit = domains.some((d) => u.includes(d));
                      return `  - ${hit ? "🎯" : "  "} ${u}`;
                    })
                    .join("\n")
                : `  - _(no tabs returned — check Automation permission for ${m.rule.name})_`;
              return `${header}\nMeeting domains: ${domains.join(", ") || "_(none)_"}\n${urlBlock}`;
            }
            return `${header}\nSkip if mic is on → ${micOn ? "**would skip**" : "won't skip"}`;
          })
          .join("\n\n"),
    ``,
    `## All enabled rules`,
    enabled.map((r) => `- ${r.name} — \`${r.bundleId}\` (${r.kind})`).join("\n") || "_none_",
    ``,
    `## Running visible apps (${runningIds.length})`,
    runningIds.map((id) => `- \`${id}\``).join("\n"),
  ].join("\n");

  return <Detail markdown={md} />;
}
