import AppKit

let apps = NSWorkspace.shared.runningApplications
for app in apps {
    guard app.activationPolicy == .regular else { continue }
    if let bid = app.bundleIdentifier {
        print(bid)
    }
}
