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
  [PRODUCT_IDS.SUB_PRO_MONTHLY]: 30,
  [PRODUCT_IDS.SUB_PREMIUM_MONTHLY]: 999, // Unlimited
};

// Sponsored listings per subscription
export const SPONSORED_LISTINGS_PER_PRODUCT: Record<string, number> = {
  [PRODUCT_IDS.SUB_PRO_MONTHLY]: 2,
  [PRODUCT_IDS.SUB_PREMIUM_MONTHLY]: 4,
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
  getReceiptData(): Promise<{ success: boolean; entitlements: StoreKitEntitlement[] }>;
}

// Mock implementation for web/development
const mockStoreKit: StoreKitPlugin = {
  async initialize() {
    console.log('[StoreKit Mock] Initialized');
    return { success: true };
  },
  async getProducts({ productIds }) {
    console.log('[StoreKit Mock] Getting products:', productIds);
    const mockProducts: StoreKitProduct[] = [
      {
        id: PRODUCT_IDS.LISTING_SINGLE,
        displayName: '1 Crédit Annonce',
        description: 'Publiez une annonce',
        price: '500',
        displayPrice: '500 FCFA',
        type: 'consumable',
      },
      {
        id: PRODUCT_IDS.LISTING_PACK_5,
        displayName: 'Pack 5 Crédits',
        description: '5 annonces - Économisez 10%',
        price: '2250',
        displayPrice: '2 250 FCFA',
        type: 'consumable',
      },
      {
        id: PRODUCT_IDS.LISTING_PACK_10,
        displayName: 'Pack 10 Crédits',
        description: '10 annonces - Économisez 20%',
        price: '4000',
        displayPrice: '4 000 FCFA',
        type: 'consumable',
      },
      {
        id: PRODUCT_IDS.SUB_PRO_MONTHLY,
        displayName: 'Abonnement Pro',
        description: '30 annonces/mois + Badge Pro + 2 sponsos',
        price: '12000',
        displayPrice: '12 000 FCFA/mois',
        type: 'autoRenewable',
        subscriptionPeriod: { unit: 'month', value: 1 },
      },
      {
        id: PRODUCT_IDS.SUB_PREMIUM_MONTHLY,
        displayName: 'Abonnement Premium',
        description: 'Annonces illimitées + 4 sponsos + Support prioritaire',
        price: '25000',
        displayPrice: '25 000 FCFA/mois',
        type: 'autoRenewable',
        subscriptionPeriod: { unit: 'month', value: 1 },
      },
    ];
    return {
      products: mockProducts.filter(p => productIds.includes(p.id)),
    };
  },
  async purchaseProduct({ productId }) {
    console.log('[StoreKit Mock] Purchasing:', productId);
    return {
      success: true,
      productId,
      transactionId: `mock_${Date.now()}`,
      originalTransactionId: `mock_orig_${Date.now()}`,
      purchaseDate: new Date().toISOString(),
    };
  },
  async restorePurchases() {
    console.log('[StoreKit Mock] Restoring purchases');
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

  /**
   * Check if StoreKit is available (iOS only)
   */
  isAvailable(): boolean {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
  }

  /**
   * Check if we're in mock mode (web/dev)
   */
  isMockMode(): boolean {
    return !this.isAvailable();
  }

  /**
   * Initialize the StoreKit service
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      if (this.isAvailable()) {
        try {
          this.plugin = registerPlugin<StoreKitPlugin>('StoreKit');
          await this.plugin.initialize();
          console.log('[StoreKit] Native plugin initialized');
        } catch (e) {
          console.warn('[StoreKit] Native plugin not available, using mock');
          this.plugin = mockStoreKit;
        }
      } else {
        this.plugin = mockStoreKit;
        console.log('[StoreKit] Using mock for web/development');
      }

      this.initialized = true;

      // Pre-fetch all products
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
