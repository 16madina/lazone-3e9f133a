import Capacitor
import CapApp_SPM

@objc(MainViewController)
class MainViewController: CAPBridgeViewController {
  override open func capacitorDidLoad() {
    super.capacitorDidLoad()

    // Ensure our local StoreKit plugin is registered with the Capacitor bridge.
    bridge?.registerPluginInstance(StoreKitPlugin())
  }
}
