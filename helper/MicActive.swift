import CoreAudio
import Foundation

func micIsRunningSomewhere() -> Bool {
    var deviceID = AudioDeviceID(0)
    var size = UInt32(MemoryLayout<AudioDeviceID>.size)

    var defaultInputAddr = AudioObjectPropertyAddress(
        mSelector: kAudioHardwarePropertyDefaultInputDevice,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: kAudioObjectPropertyElementMain
    )
    let systemObject = AudioObjectID(kAudioObjectSystemObject)
    guard AudioObjectGetPropertyData(systemObject, &defaultInputAddr, 0, nil, &size, &deviceID) == noErr,
          deviceID != 0 else {
        return false
    }

    var running: UInt32 = 0
    var runningSize = UInt32(MemoryLayout<UInt32>.size)
    var runningAddr = AudioObjectPropertyAddress(
        mSelector: kAudioDevicePropertyDeviceIsRunningSomewhere,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: kAudioObjectPropertyElementMain
    )
    guard AudioObjectGetPropertyData(deviceID, &runningAddr, 0, nil, &runningSize, &running) == noErr else {
        return false
    }
    return running != 0
}

exit(micIsRunningSomewhere() ? 0 : 1)
