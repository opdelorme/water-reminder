import AppKit
import QuartzCore

final class AppDelegate: NSObject, NSApplicationDelegate {
    var windows: [NSWindow] = []

    func applicationDidFinishLaunching(_ notification: Notification) {
        for screen in NSScreen.screens {
            let overlay = makeOverlay(for: screen)
            windows.append(overlay)
            overlay.orderFrontRegardless()
        }
        let panel = makeButtonPanel()
        windows.append(panel)
        panel.orderFrontRegardless()
        NSApp.activate(ignoringOtherApps: true)
    }

    private func makeOverlay(for screen: NSScreen) -> NSWindow {
        let frame = screen.frame
        let window = NSWindow(
            contentRect: frame,
            styleMask: .borderless,
            backing: .buffered,
            defer: false,
            screen: screen
        )
        window.isOpaque = false
        window.backgroundColor = .clear
        window.hasShadow = false
        window.level = .screenSaver
        window.ignoresMouseEvents = true
        window.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .stationary, .ignoresCycle]

        let content = NSView(frame: NSRect(origin: .zero, size: frame.size))
        content.wantsLayer = true
        let root = CALayer()
        content.layer = root

        let border = CAShapeLayer()
        let inset: CGFloat = 8
        let rect = CGRect(x: inset, y: inset, width: frame.width - inset * 2, height: frame.height - inset * 2)
        border.path = CGPath(rect: rect, transform: nil)
        border.strokeColor = NSColor(calibratedRed: 0.20, green: 0.55, blue: 1.0, alpha: 1.0).cgColor
        border.fillColor = NSColor.clear.cgColor
        border.lineWidth = 14
        border.lineJoin = .round
        border.shadowColor = NSColor(calibratedRed: 0.20, green: 0.55, blue: 1.0, alpha: 1.0).cgColor
        border.shadowOffset = .zero
        border.shadowRadius = 18
        border.shadowOpacity = 0.9
        root.addSublayer(border)

        let pulse = CABasicAnimation(keyPath: "opacity")
        pulse.fromValue = 0.25
        pulse.toValue = 1.0
        pulse.duration = 1.1
        pulse.autoreverses = true
        pulse.repeatCount = .infinity
        pulse.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)
        border.add(pulse, forKey: "pulse")

        window.contentView = content
        return window
    }

    private func makeButtonPanel() -> NSWindow {
        let size = NSSize(width: 260, height: 96)
        let panel = NSPanel(
            contentRect: NSRect(origin: .zero, size: size),
            styleMask: [.borderless, .nonactivatingPanel, .fullSizeContentView],
            backing: .buffered,
            defer: false
        )
        panel.isOpaque = false
        panel.backgroundColor = .clear
        panel.level = .screenSaver
        panel.hasShadow = true
        panel.isMovableByWindowBackground = true
        panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]

        let effect = NSVisualEffectView(frame: NSRect(origin: .zero, size: size))
        effect.material = .hudWindow
        effect.blendingMode = .behindWindow
        effect.state = .active
        effect.wantsLayer = true
        effect.layer?.cornerRadius = 18
        effect.layer?.masksToBounds = true

        let label = NSTextField(labelWithString: "💧 Time to hydrate")
        label.font = .systemFont(ofSize: 14, weight: .semibold)
        label.alignment = .center
        label.frame = NSRect(x: 0, y: 58, width: size.width, height: 22)
        effect.addSubview(label)

        let button = NSButton(title: "Sip taken ✓", target: self, action: #selector(dismiss))
        button.bezelStyle = .rounded
        button.controlSize = .large
        button.keyEquivalent = "\r"
        button.frame = NSRect(x: 30, y: 16, width: size.width - 60, height: 32)
        effect.addSubview(button)

        panel.contentView = effect

        let mouse = NSEvent.mouseLocation
        let target = NSScreen.screens.first { NSMouseInRect(mouse, $0.frame, false) } ?? NSScreen.main
        if let screen = target {
            let sf = screen.frame
            panel.setFrameOrigin(NSPoint(
                x: sf.midX - size.width / 2,
                y: sf.midY - size.height / 2
            ))
        }
        return panel
    }

    @objc func dismiss() {
        NSApp.terminate(nil)
    }
}

let app = NSApplication.shared
app.setActivationPolicy(.accessory)
let delegate = AppDelegate()
app.delegate = delegate
app.run()
