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
        if let primary = NSScreen.screens.first {
            let label = makeLabelPanel(for: primary)
            windows.append(label)
            label.orderFrontRegardless()
        }
        NSApp.activate(ignoringOtherApps: true)

        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            NSApp.terminate(nil)
        }
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

    private func makeLabelPanel(for screen: NSScreen) -> NSWindow {
        let size = NSSize(width: 280, height: 72)
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
        panel.ignoresMouseEvents = true
        panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]

        let effect = NSVisualEffectView(frame: NSRect(origin: .zero, size: size))
        effect.material = .hudWindow
        effect.blendingMode = .behindWindow
        effect.state = .active
        effect.wantsLayer = true
        effect.layer?.cornerRadius = 20
        effect.layer?.masksToBounds = true

        let label = NSTextField(labelWithString: "💧 Take a sip")
        label.font = .systemFont(ofSize: 22, weight: .semibold)
        label.alignment = .center
        label.frame = NSRect(x: 0, y: (size.height - 30) / 2, width: size.width, height: 30)
        effect.addSubview(label)

        panel.contentView = effect

        let sf = screen.frame
        panel.setFrameOrigin(NSPoint(
            x: sf.midX - size.width / 2,
            y: sf.midY - size.height / 2
        ))
        return panel
    }
}

let app = NSApplication.shared
app.setActivationPolicy(.accessory)
let delegate = AppDelegate()
app.delegate = delegate
app.run()
