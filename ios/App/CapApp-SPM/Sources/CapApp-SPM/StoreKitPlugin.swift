import Foundation
import Capacitor
import StoreKit

@objc(StoreKitPlugin)
public class StoreKitPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "StoreKitPlugin"
    public let jsName = "StoreKit"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "initialize", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getProducts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchaseProduct", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restorePurchases", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getReceiptData", returnType: CAPPluginReturnPromise)
    ]
    
    private var products: [String: Product] = [:]
    private var updateListenerTask: Task<Void, Error>?
    
    public override func load() {
        // Start listening for transaction updates
        updateListenerTask = listenForTransactions()
    }
    
    deinit {
        updateListenerTask?.cancel()
    }
    
    private func listenForTransactions() -> Task<Void, Error> {
        return Task.detached {
            for await result in Transaction.updates {
                do {
                    let transaction = try self.checkVerified(result)
                    await transaction.finish()
                    
                    // Notify JavaScript about the transaction update
                    self.notifyListeners("transactionUpdate", data: [
                        "productId": transaction.productID,
                        "transactionId": String(transaction.id),
                        "originalTransactionId": String(transaction.originalID)
                    ])
                } catch {
                    print("Transaction failed verification: \(error)")
                }
            }
        }
    }
    
    @objc func initialize(_ call: CAPPluginCall) {
        call.resolve(["success": true])
    }
    
    @objc func getProducts(_ call: CAPPluginCall) {
        guard let productIds = call.getArray("productIds", String.self) else {
            call.reject("Product IDs are required")
            return
        }
        
        Task {
            do {
                let storeProducts = try await Product.products(for: Set(productIds))
                
                var productsArray: [[String: Any]] = []
                for product in storeProducts {
                    self.products[product.id] = product
                    
                    var productDict: [String: Any] = [
                        "id": product.id,
                        "displayName": product.displayName,
                        "description": product.description,
                        "price": product.price.description,
                        "displayPrice": product.displayPrice,
                        "type": self.productTypeString(product.type)
                    ]
                    
                    // Add subscription info if applicable
                    if let subscription = product.subscription {
                        productDict["subscriptionPeriod"] = [
                            "unit": self.periodUnitString(subscription.subscriptionPeriod.unit),
                            "value": subscription.subscriptionPeriod.value
                        ]
                    }
                    
                    productsArray.append(productDict)
                }
                
                call.resolve(["products": productsArray])
            } catch {
                call.reject("Failed to fetch products: \(error.localizedDescription)")
            }
        }
    }
    
    @objc func purchaseProduct(_ call: CAPPluginCall) {
        guard let productId = call.getString("productId") else {
            call.reject("Product ID is required")
            return
        }
        
        guard let product = products[productId] else {
            call.reject("Product not found. Call getProducts first.")
            return
        }
        
        Task {
            do {
                let result = try await product.purchase()
                
                switch result {
                case .success(let verification):
                    let transaction = try self.checkVerified(verification)
                    await transaction.finish()
                    
                    call.resolve([
                        "success": true,
                        "transactionId": String(transaction.id),
                        "productId": transaction.productID,
                        "originalTransactionId": String(transaction.originalID),
                        "purchaseDate": ISO8601DateFormatter().string(from: transaction.purchaseDate)
                    ])
                    
                case .userCancelled:
                    call.resolve([
                        "success": false,
                        "cancelled": true
                    ])
                    
                case .pending:
                    call.resolve([
                        "success": false,
                        "pending": true
                    ])
                    
                @unknown default:
                    call.reject("Unknown purchase result")
                }
            } catch {
                call.reject("Purchase failed: \(error.localizedDescription)")
            }
        }
    }
    
    @objc func restorePurchases(_ call: CAPPluginCall) {
        Task {
            do {
                try await AppStore.sync()
                
                var restoredTransactions: [[String: Any]] = []
                
                for await result in Transaction.currentEntitlements {
                    do {
                        let transaction = try self.checkVerified(result)
                        
                        restoredTransactions.append([
                            "productId": transaction.productID,
                            "transactionId": String(transaction.id),
                            "originalTransactionId": String(transaction.originalID),
                            "purchaseDate": ISO8601DateFormatter().string(from: transaction.purchaseDate)
                        ])
                    } catch {
                        print("Failed to verify transaction: \(error)")
                    }
                }
                
                call.resolve([
                    "success": true,
                    "transactions": restoredTransactions
                ])
            } catch {
                call.reject("Failed to restore purchases: \(error.localizedDescription)")
            }
        }
    }
    
    @objc func getReceiptData(_ call: CAPPluginCall) {
        // StoreKit 2 doesn't use receipts the same way as StoreKit 1
        // Instead, we return current entitlements
        Task {
            var entitlements: [[String: Any]] = []
            
            for await result in Transaction.currentEntitlements {
                do {
                    let transaction = try self.checkVerified(result)
                    
                    var entitlement: [String: Any] = [
                        "productId": transaction.productID,
                        "transactionId": String(transaction.id),
                        "originalTransactionId": String(transaction.originalID),
                        "purchaseDate": ISO8601DateFormatter().string(from: transaction.purchaseDate)
                    ]
                    
                    if let expirationDate = transaction.expirationDate {
                        entitlement["expirationDate"] = ISO8601DateFormatter().string(from: expirationDate)
                    }
                    
                    entitlements.append(entitlement)
                } catch {
                    print("Failed to verify entitlement: \(error)")
                }
            }
            
            call.resolve([
                "success": true,
                "entitlements": entitlements
            ])
        }
    }
    
    // MARK: - Helper Methods
    
    private func checkVerified<T>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .unverified(_, _):
            throw StoreError.failedVerification
        case .verified(let safe):
            return safe
        }
    }
    
    private func productTypeString(_ type: Product.ProductType) -> String {
        switch type {
        case .consumable:
            return "consumable"
        case .nonConsumable:
            return "nonConsumable"
        case .autoRenewable:
            return "autoRenewable"
        case .nonRenewable:
            return "nonRenewable"
        @unknown default:
            return "unknown"
        }
    }
    
    private func periodUnitString(_ unit: Product.SubscriptionPeriod.Unit) -> String {
        switch unit {
        case .day:
            return "day"
        case .week:
            return "week"
        case .month:
            return "month"
        case .year:
            return "year"
        @unknown default:
            return "unknown"
        }
    }
}

enum StoreError: Error {
    case failedVerification
}
