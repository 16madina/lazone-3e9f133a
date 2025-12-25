/**
 * StoreKit Service for iOS In-App Purchases
 * Uses Capacitor's native bridge to interact with StoreKit
 */

import { Capacitor, registerPlugin } from '@capacitor/core';

// Product ID for listing credits
export const PRODUCT_ID_LISTING_CREDIT = 'com.lazone.listing_credit';

interface StoreKitProduct {
  productId: string;
  localizedTitle: string;
  localizedDescription: string;
  price: string;
  priceLocale: string;
}

interface StoreKitPurchaseResult {
  success: boolean;
  productId?: string;
  transactionId?: string;
  receiptData?: string;
  error?: string;
}

interface StoreKitPlugin {
  initialize(): Promise<void>;
  getProducts(options: { productIds: string[] }): Promise<{ products: StoreKitProduct[] }>;
  purchaseProduct(options: { productId: string }): Promise<StoreKitPurchaseResult>;
  restorePurchases(): Promise<{ transactions: StoreKitPurchaseResult[] }>;
  getReceiptData(): Promise<{ receiptData: string }>;
}

// Mock implementation for web/development
const mockStoreKit: StoreKitPlugin = {
  async initialize() {
    console.log('[StoreKit Mock] Initialized');
  },
  async getProducts({ productIds }) {
    console.log('[StoreKit Mock] Getting products:', productIds);
    return {
      products: productIds.map(id => ({
        productId: id,
        localizedTitle: 'Crédit annonce',
        localizedDescription: '1 crédit pour publier une annonce',
        price: '1000',
        priceLocale: 'XOF',
      })),
    };
  },
  async purchaseProduct({ productId }) {
    console.log('[StoreKit Mock] Purchasing:', productId);
    // In development, simulate a successful purchase
    return {
      success: true,
      productId,
      transactionId: `mock_${Date.now()}`,
      receiptData: btoa(JSON.stringify({
        mock: true,
        productId,
        timestamp: Date.now(),
      })),
    };
  },
  async restorePurchases() {
    console.log('[StoreKit Mock] Restoring purchases');
    return { transactions: [] };
  },
  async getReceiptData() {
    return { receiptData: '' };
  },
};

class StoreKitService {
  private plugin: StoreKitPlugin | null = null;
  private initialized = false;
  private products: Map<string, StoreKitProduct> = new Map();

  /**
   * Check if StoreKit is available (iOS only)
   */
  isAvailable(): boolean {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
  }

  /**
   * Initialize the StoreKit service
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      if (this.isAvailable()) {
        // Try to use native plugin
        try {
          this.plugin = registerPlugin<StoreKitPlugin>('StoreKit');
          await this.plugin.initialize();
        } catch (e) {
          console.warn('[StoreKit] Native plugin not available, using mock');
          this.plugin = mockStoreKit;
        }
      } else {
        // Use mock for web/development
        this.plugin = mockStoreKit;
      }

      this.initialized = true;
      console.log('[StoreKit] Service initialized');

      // Pre-fetch products
      await this.fetchProducts([PRODUCT_ID_LISTING_CREDIT]);
    } catch (error) {
      console.error('[StoreKit] Initialization error:', error);
      throw error;
    }
  }

  /**
   * Fetch products from App Store
   */
  async fetchProducts(productIds: string[]): Promise<StoreKitProduct[]> {
    if (!this.plugin) {
      throw new Error('StoreKit not initialized');
    }

    try {
      const { products } = await this.plugin.getProducts({ productIds });
      
      // Cache products
      products.forEach(product => {
        this.products.set(product.productId, product);
      });

      return products;
    } catch (error) {
      console.error('[StoreKit] Error fetching products:', error);
      throw error;
    }
  }

  /**
   * Get a cached product
   */
  getProduct(productId: string): StoreKitProduct | undefined {
    return this.products.get(productId);
  }

  /**
   * Get the listing credit product
   */
  getListingCreditProduct(): StoreKitProduct | undefined {
    return this.getProduct(PRODUCT_ID_LISTING_CREDIT);
  }

  /**
   * Purchase a product
   */
  async purchaseProduct(productId: string): Promise<StoreKitPurchaseResult> {
    if (!this.plugin) {
      throw new Error('StoreKit not initialized');
    }

    try {
      console.log('[StoreKit] Starting purchase for:', productId);
      const result = await this.plugin.purchaseProduct({ productId });
      
      if (result.success) {
        console.log('[StoreKit] Purchase successful:', result.transactionId);
      } else {
        console.log('[StoreKit] Purchase failed:', result.error);
      }

      return result;
    } catch (error) {
      console.error('[StoreKit] Purchase error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Purchase listing credit
   */
  async purchaseListingCredit(): Promise<StoreKitPurchaseResult> {
    return this.purchaseProduct(PRODUCT_ID_LISTING_CREDIT);
  }

  /**
   * Restore previous purchases
   */
  async restorePurchases(): Promise<StoreKitPurchaseResult[]> {
    if (!this.plugin) {
      throw new Error('StoreKit not initialized');
    }

    try {
      const { transactions } = await this.plugin.restorePurchases();
      return transactions;
    } catch (error) {
      console.error('[StoreKit] Restore error:', error);
      throw error;
    }
  }

  /**
   * Get the current receipt data (for server validation)
   */
  async getReceiptData(): Promise<string> {
    if (!this.plugin) {
      throw new Error('StoreKit not initialized');
    }

    try {
      const { receiptData } = await this.plugin.getReceiptData();
      return receiptData;
    } catch (error) {
      console.error('[StoreKit] Error getting receipt:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const storeKitService = new StoreKitService();
