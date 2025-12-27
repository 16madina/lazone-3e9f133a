/**
 * StoreKit Service for iOS In-App Purchases
 * Uses Capacitor's native bridge to interact with StoreKit 2
 */

import { Capacitor, registerPlugin } from '@capacitor/core';

// Product IDs
export const PRODUCT_IDS = {
  // Single credits
  LISTING_SINGLE: 'com.lazone.listing.single',
  // Packs
  LISTING_PACK_5: 'com.lazone.listing.pack5',
  LISTING_PACK_10: 'com.lazone.listing.pack10',
  // Subscriptions (for everyone)
  SUB_PRO_MONTHLY: 'com.lazone.sub.pro.monthly',
  SUB_PREMIUM_MONTHLY: 'com.lazone.sub.premium.monthly',
};

// Credits per product
export const CREDITS_PER_PRODUCT: Record<string, number> = {
  [PRODUCT_IDS.LISTING_SINGLE]: 1,
  [PRODUCT_IDS.LISTING_PACK_5]: 5,
  [PRODUCT_IDS.LISTING_PACK_10]: 10,
  [PRODUCT_IDS.SUB_PRO_MONTHLY]: 15,      // Pro: 15 crédits/mois
  [PRODUCT_IDS.SUB_PREMIUM_MONTHLY]: 30,  // Premium: 30 crédits/mois
};

// Sponsored listings per subscription
export const SPONSORED_LISTINGS_PER_PRODUCT: Record<string, number> = {
  [PRODUCT_IDS.SUB_PRO_MONTHLY]: 1,       // Pro: 1 sponsoring/mois
  [PRODUCT_IDS.SUB_PREMIUM_MONTHLY]: 2,   // Premium: 2 sponsorings/mois
};

export interface StoreKitProduct {
  id: string;
  displayName: string;
  description: string;
  price: string;
  displayPrice: string;
  type: 'consumable' | 'nonConsumable' | 'autoRenewable' | 'nonRenewable' | 'unknown';
  subscriptionPeriod?: {
    unit: 'day' | 'week' | 'month' | 'year' | 'unknown';
    value: number;
  };
}

export interface StoreKitPurchaseResult {
  success: boolean;
  cancelled?: boolean;
  pending?: boolean;
  productId?: string;
  transactionId?: string;
  originalTransactionId?: string;
  purchaseDate?: string;
  receiptData?: string; // Base64 encoded receipt for server validation
  error?: string;
}

export interface StoreKitEntitlement {
  productId: string;
  transactionId: string;
  originalTransactionId: string;
  purchaseDate: string;
  expirationDate?: string;
}

interface StoreKitPlugin {
  initialize(): Promise<{ success: boolean }>;
  getProducts(options: { productIds: string[] }): Promise<{ products: StoreKitProduct[] }>;
  purchaseProduct(options: { productId: string }): Promise<StoreKitPurchaseResult>;
  restorePurchases(): Promise<{ success: boolean; transactions: StoreKitEntitlement[] }>;
  getReceiptData(): Promise<{ success: boolean; entitlements: StoreKitEntitlement[]; receiptData?: string }>;
}

// Prices in FCFA for web/Android display
export const PRODUCT_PRICES_FCFA: Record<string, number> = {
  [PRODUCT_IDS.LISTING_SINGLE]: 500,
  [PRODUCT_IDS.LISTING_PACK_5]: 2250,
  [PRODUCT_IDS.LISTING_PACK_10]: 4000,
  [PRODUCT_IDS.SUB_PRO_MONTHLY]: 12000,
  [PRODUCT_IDS.SUB_PREMIUM_MONTHLY]: 25000,
};

// Mock implementation ONLY for web/Android - displays USD prices like iOS
const mockStoreKit: StoreKitPlugin = {
  async initialize() {
    console.log('[StoreKit Mock] Initialized - DEV MODE ONLY');
    return { success: true };
  },
  async getProducts({ productIds }) {
    console.log('[StoreKit Mock] Getting products:', productIds);
    // Display prices in USD (same as iOS StoreKit) - local estimate shown separately
    const mockProducts: StoreKitProduct[] = [
      {
        id: PRODUCT_IDS.LISTING_SINGLE,
        displayName: '1 Crédit Annonce',
        description: 'Publiez une annonce immobilière',
        price: '0.99',
        displayPrice: '$0.99',
        type: 'consumable',
      },
      {
        id: PRODUCT_IDS.LISTING_PACK_5,
        displayName: 'Pack 5 Crédits',
        description: '5 annonces - Économisez 10%',
        price: '3.99',
        displayPrice: '$3.99',
        type: 'consumable',
      },
      {
        id: PRODUCT_IDS.LISTING_PACK_10,
        displayName: 'Pack 10 Crédits',
        description: '10 annonces - Économisez 20%',
        price: '6.99',
        displayPrice: '$6.99',
        type: 'consumable',
      },
      {
        id: PRODUCT_IDS.SUB_PRO_MONTHLY,
        displayName: 'Abonnement Pro',
        description: '15 crédits/mois + 1 sponsoring + Badge Pro',
        price: '19.99',
        displayPrice: '$19.99/mois',
        type: 'autoRenewable',
        subscriptionPeriod: { unit: 'month', value: 1 },
      },
      {
        id: PRODUCT_IDS.SUB_PREMIUM_MONTHLY,
        displayName: 'Abonnement Premium',
        description: '30 crédits/mois + 2 sponsorings + Support prioritaire',
        price: '39.99',
        displayPrice: '$39.99/mois',
        type: 'autoRenewable',
        subscriptionPeriod: { unit: 'month', value: 1 },
      },
    ];
    return {
      products: mockProducts.filter(p => productIds.includes(p.id)),
    };
  },
  async purchaseProduct({ productId }) {
    // In mock mode (web only), always fail - no free credits
    console.log('[StoreKit Mock] Purchase blocked in dev mode:', productId);
    return {
      success: false,
      productId,
      error: 'Les achats ne sont disponibles que sur l\'application iOS',
    };
  },
  async restorePurchases() {
    console.log('[StoreKit Mock] Restoring purchases - DEV MODE');
    return { success: true, transactions: [] };
  },
  async getReceiptData() {
    return { success: true, entitlements: [] };
  },
};

class StoreKitService {
  private plugin: StoreKitPlugin | null = null;
  private initialized = false;
  private products: Map<string, StoreKitProduct> = new Map();
  private nativePluginAvailable = false;
  private initError: string | null = null;

  /**
   * Check if we're on iOS native platform
   */
  isIosNative(): boolean {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
  }

  /**
   * Check if StoreKit native plugin is available
   */
  isNativePluginAvailable(): boolean {
    return this.nativePluginAvailable;
  }

  /**
   * Check if we're in mock mode (web/dev only)
   */
  isMockMode(): boolean {
    // Mock mode is ONLY for web development, never for iOS
    return !this.isIosNative();
  }

  /**
   * Check if purchases are available
   */
  isPurchaseAvailable(): boolean {
    // Purchases are only available if:
    // 1. We're on iOS native AND the native plugin loaded successfully
    // 2. OR we're in dev/web mode (for testing UI only, purchases will fail)
    if (this.isIosNative()) {
      return this.nativePluginAvailable;
    }
    return true; // Web mode for UI testing
  }

  /**
   * Get initialization error if any
   */
  getInitError(): string | null {
    return this.initError;
  }

  /**
   * Initialize the StoreKit service
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Log platform detection for debugging
    const isNative = Capacitor.isNativePlatform();
    const platform = Capacitor.getPlatform();
    console.log(`[StoreKit] Platform detection: isNative=${isNative}, platform=${platform}`);

    try {
      if (this.isIosNative()) {
        // On iOS, we MUST use the native plugin
        console.log('[StoreKit] iOS native detected, attempting to load native plugin...');
        try {
          this.plugin = registerPlugin<StoreKitPlugin>('StoreKit');
          console.log('[StoreKit] Plugin registered, calling initialize...');
          await this.plugin.initialize();
          this.nativePluginAvailable = true;
          console.log('[StoreKit] ✅ Native plugin initialized successfully');
        } catch (e) {
          // On iOS, if native plugin fails, we DO NOT fallback to mock
          // This prevents fake credits on real devices
          const errorMsg = e instanceof Error ? e.message : String(e);
          console.error('[StoreKit] ❌ CRITICAL: Native plugin failed on iOS:', errorMsg);
          this.initError = `Plugin StoreKit non disponible: ${errorMsg}`;
          this.nativePluginAvailable = false;
          
          // Still set a plugin for getProducts (display purposes only)
          this.plugin = {
            ...mockStoreKit,
            purchaseProduct: async () => ({
              success: false,
              error: 'StoreKit natif non disponible. Veuillez réinstaller l\'application.',
            }),
          };
        }
      } else {
        // On web/dev, use mock for UI testing
        console.log('[StoreKit] Web/Android detected, using mock (purchases disabled)');
        this.plugin = mockStoreKit;
        this.nativePluginAvailable = false;
      }

      this.initialized = true;

      // Pre-fetch all products for display
      await this.fetchProducts(Object.values(PRODUCT_IDS));
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
      
      products.forEach(product => {
        this.products.set(product.id, product);
      });

      console.log('[StoreKit] Fetched products:', products.length);
      return products;
    } catch (error) {
      console.error('[StoreKit] Error fetching products:', error);
      throw error;
    }
  }

  /**
   * Get all cached products
   */
  getAllProducts(): StoreKitProduct[] {
    return Array.from(this.products.values());
  }

  /**
   * Get credit packs (consumables)
   */
  getCreditPacks(): StoreKitProduct[] {
    return this.getAllProducts().filter(p => p.type === 'consumable');
  }

  /**
   * Get subscriptions
   */
  getSubscriptions(): StoreKitProduct[] {
    return this.getAllProducts().filter(p => p.type === 'autoRenewable');
  }

  /**
   * Get a cached product
   */
  getProduct(productId: string): StoreKitProduct | undefined {
    return this.products.get(productId);
  }

  /**
   * Get credits amount for a product
   */
  getCreditsForProduct(productId: string): number {
    return CREDITS_PER_PRODUCT[productId] || 0;
  }

  /**
   * Purchase a product
   * Returns purchase result with receipt data for server validation
   */
  async purchaseProduct(productId: string): Promise<StoreKitPurchaseResult> {
    if (!this.plugin) {
      throw new Error('StoreKit not initialized');
    }

    // Block purchases if native plugin not available on iOS
    if (this.isIosNative() && !this.nativePluginAvailable) {
      console.error('[StoreKit] Purchase blocked: native plugin not available');
      return {
        success: false,
        error: 'StoreKit non disponible. Veuillez réinstaller l\'application.',
      };
    }

    try {
      console.log('[StoreKit] Starting purchase for:', productId);
      const result = await this.plugin.purchaseProduct({ productId });
      
      if (result.success) {
        console.log('[StoreKit] Purchase successful:', result.transactionId);
        
        // Get receipt data for server validation (iOS only)
        if (this.isIosNative() && this.nativePluginAvailable) {
          try {
            const receiptResult = await this.plugin.getReceiptData();
            if (receiptResult.receiptData) {
              result.receiptData = receiptResult.receiptData;
            }
          } catch (e) {
            console.warn('[StoreKit] Could not get receipt data:', e);
          }
        }
      } else if (result.cancelled) {
        console.log('[StoreKit] Purchase cancelled by user');
      } else if (result.pending) {
        console.log('[StoreKit] Purchase pending');
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
   * Restore previous purchases
   */
  async restorePurchases(): Promise<StoreKitEntitlement[]> {
    if (!this.plugin) {
      throw new Error('StoreKit not initialized');
    }

    try {
      const { transactions } = await this.plugin.restorePurchases();
      console.log('[StoreKit] Restored transactions:', transactions.length);
      return transactions;
    } catch (error) {
      console.error('[StoreKit] Restore error:', error);
      throw error;
    }
  }

  /**
   * Get current entitlements (active purchases/subscriptions)
   */
  async getEntitlements(): Promise<StoreKitEntitlement[]> {
    if (!this.plugin) {
      throw new Error('StoreKit not initialized');
    }

    try {
      const { entitlements } = await this.plugin.getReceiptData();
      return entitlements;
    } catch (error) {
      console.error('[StoreKit] Error getting entitlements:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const storeKitService = new StoreKitService();
