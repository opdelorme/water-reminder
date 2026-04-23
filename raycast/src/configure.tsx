import {
  Action,
  ActionPanel,
  Form,
  Icon,
  List,
  Toast,
  showToast,
  useNavigation,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { MeetingAppRule } from "./lib/detection";
import { loadRules, resetRules, saveRules } from "./lib/storage";

export default function Configure() {
  const [rules, setRules] = useState<MeetingAppRule[] | null>(null);
  const { push } = useNavigation();

  useEffect(() => {
    loadRules().then(setRules);
  }, []);

  async function toggle(bundleId: string) {
    if (!rules) return;
    const next = rules.map((r) => (r.bundleId === bundleId ? { ...r, enabled: !r.enabled } : r));
    setRules(next);
    await saveRules(next);
  }

  async function remove(bundleId: string) {
    if (!rules) return;
    const confirmed = await confirmAlert({
      title: "Remove rule?",
      message: "This rule will be deleted. Defaults can be restored from the reset action.",
      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    const next = rules.filter((r) => r.bundleId !== bundleId);
    setRules(next);
    await saveRules(next);
  }

  async function reset() {
    const confirmed = await confirmAlert({
      title: "Reset to defaults?",
      message: "All customizations will be lost.",
      primaryAction: { title: "Reset", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await resetRules();
    setRules(await loadRules());
    await showToast({ style: Toast.Style.Success, title: "Reset to defaults" });
  }

  return (
    <List isLoading={rules === null} searchBarPlaceholder="Filter apps...">
      <List.Section title="Apps & Browsers">
        {(rules ?? []).map((r) => (
          <List.Item
            key={r.bundleId}
            icon={r.enabled ? Icon.CheckCircle : Icon.Circle}
            title={r.name}
            subtitle={r.bundleId}
            accessories={[
              { tag: r.kind === "browser" ? "browser" : "app" },
              ...(r.kind === "browser" && r.browserDomains?.length
                ? [{ tag: `${r.browserDomains.length} domain${r.browserDomains.length === 1 ? "" : "s"}` }]
                : []),
            ]}
            actions={
              <ActionPanel>
                <Action
                  title={r.enabled ? "Disable" : "Enable"}
                  icon={r.enabled ? Icon.Circle : Icon.CheckCircle}
                  onAction={() => toggle(r.bundleId)}
                />
                {r.kind === "browser" && (
                  <Action
                    title="Edit Meeting Domains"
                    icon={Icon.Globe}
                    onAction={() =>
                      push(
                        <EditDomains
                          rule={r}
                          onSave={async (next) => {
                            if (!rules) return;
                            const updated = rules.map((x) => (x.bundleId === r.bundleId ? next : x));
                            setRules(updated);
                            await saveRules(updated);
                          }}
                        />,
                      )
                    }
                  />
                )}
                <Action
                  title="Add Custom App"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  onAction={() =>
                    push(
                      <AddApp
                        onSave={async (next) => {
                          if (!rules) return;
                          const updated = [...rules, next];
                          setRules(updated);
                          await saveRules(updated);
                        }}
                      />,
                    )
                  }
                />
                <Action
                  title="Remove Rule"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={() => remove(r.bundleId)}
                />
                <Action
                  title="Reset to Defaults"
                  icon={Icon.ArrowCounterClockwise}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                  onAction={reset}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function EditDomains({ rule, onSave }: { rule: MeetingAppRule; onSave: (r: MeetingAppRule) => Promise<void> }) {
  const { pop } = useNavigation();
  const [value, setValue] = useState((rule.browserDomains ?? []).join("\n"));

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            onSubmit={async () => {
              const domains = value
                .split("\n")
                .map((l) => l.trim())
                .filter(Boolean);
              await onSave({ ...rule, browserDomains: domains });
              await showToast({ style: Toast.Style.Success, title: "Saved" });
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title={rule.name}
        text="Tab URL is flagged as a meeting when it contains any of these substrings (one per line). Example: meet.google.com"
      />
      <Form.TextArea id="domains" title="Meeting URL substrings" value={value} onChange={setValue} />
    </Form>
  );
}

function AddApp({ onSave }: { onSave: (r: MeetingAppRule) => Promise<void> }) {
  const { pop } = useNavigation();
  const [name, setName] = useState("");
  const [bundleId, setBundleId] = useState("");
  const [kind, setKind] = useState<"app" | "browser">("app");

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add"
            onSubmit={async () => {
              if (!name || !bundleId) {
                await showToast({ style: Toast.Style.Failure, title: "Name and bundle id required" });
                return;
              }
              await onSave({
                name,
                bundleId,
                kind,
                enabled: true,
                browserDomains: kind === "browser" ? ["meet.google.com", "zoom.us/j/"] : undefined,
              });
              await showToast({ style: Toast.Style.Success, title: `Added ${name}` });
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Display Name" value={name} onChange={setName} placeholder="Krisp" />
      <Form.TextField
        id="bundleId"
        title="Bundle Identifier"
        value={bundleId}
        onChange={setBundleId}
        placeholder="com.krisp.audio"
        info={`Run: osascript -e 'id of app "Krisp"' to find it`}
      />
      <Form.Dropdown id="kind" title="Kind" value={kind} onChange={(v) => setKind(v as "app" | "browser")}>
        <Form.Dropdown.Item value="app" title="Standalone app" />
        <Form.Dropdown.Item value="browser" title="Browser (tab URL matching)" />
      </Form.Dropdown>
    </Form>
  );
}
