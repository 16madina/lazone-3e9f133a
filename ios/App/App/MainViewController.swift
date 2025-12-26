import UIKit
import Capacitor
import CapApp_SPM

/// Custom view controller that registers the StoreKit plugin with Capacitor
class MainViewController: CAPBridgeViewController {
    
    override open func capacitorDidLoad() {
        super.capacitorDidLoad()
        
        // Register the StoreKit plugin
        print("[MainViewController] Registering StoreKitPlugin...")
        bridge?.registerPluginInstance(StoreKitPlugin())
        print("[MainViewController] StoreKitPlugin registered successfully")
    }
}
