/**
 * LRU Cache Manager for efficient memory management
 * Implements a Least Recently Used (LRU) caching strategy
 */
export class LRUCache<K, V> {
  private capacity: number;
  private cache: Map<K, V>;
  private usageOrder: K[];

  /**
   * Create a new LRU cache with the specified capacity
   * @param capacity Maximum number of items to store in the cache
   */
  constructor(capacity: number) {
    this.capacity = capacity;
    this.cache = new Map<K, V>();
    this.usageOrder = [];
  }

  /**
   * Get an item from the cache
   * @param key The key to look up
   * @returns The cached value or undefined if not found
   */
  get(key: K): V | undefined {
    if (!this.cache.has(key)) {
      return undefined;
    }

    // Update usage order (mark as most recently used)
    this.markAsUsed(key);
    return this.cache.get(key);
  }

  /**
   * Add or update an item in the cache
   * @param key The key to store
   * @param value The value to cache
   */
  put(key: K, value: V): void {
    // If key already exists, update it and mark as used
    if (this.cache.has(key)) {
      this.cache.set(key, value);
      this.markAsUsed(key);
      return;
    }

    // If cache is full, remove the least recently used item
    if (this.cache.size >= this.capacity && this.capacity > 0) {
      const leastUsedKey = this.usageOrder.shift();
      if (leastUsedKey !== undefined) {
        this.cache.delete(leastUsedKey);
      }
    }

    // Add the new item
    this.cache.set(key, value);
    this.usageOrder.push(key);
  }

  /**
   * Remove an item from the cache
   * @param key The key to remove
   * @returns true if the item was removed, false if it wasn't in the cache
   */
  remove(key: K): boolean {
    if (!this.cache.has(key)) {
      return false;
    }

    // Remove from cache
    this.cache.delete(key);

    // Remove from usage order
    const index = this.usageOrder.indexOf(key);
    if (index !== -1) {
      this.usageOrder.splice(index, 1);
    }

    return true;
  }

  /**
   * Check if an item exists in the cache
   * @param key The key to check
   * @returns true if the item exists in the cache
   */
  has(key: K): boolean {
    return this.cache.has(key);
  }

  /**
   * Get all keys currently in the cache
   * @returns Array of keys
   */
  keys(): K[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get all values currently in the cache
   * @returns Array of values
   */
  values(): V[] {
    return Array.from(this.cache.values());
  }

  /**
   * Get all entries in the cache as [key, value] pairs
   * @returns Array of entries
   */
  entries(): [K, V][] {
    return Array.from(this.cache.entries());
  }

  /**
   * Clear the cache
   */
  clear(): void {
    this.cache.clear();
    this.usageOrder = [];
  }

  /**
   * Get the number of items in the cache
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Change the capacity of the cache
   * If new capacity is smaller than current size, least recently used items will be removed
   * @param newCapacity The new maximum capacity
   */
  setCapacity(newCapacity: number): void {
    if (newCapacity < 0) {
      throw new Error('Cache capacity cannot be negative');
    }

    this.capacity = newCapacity;

    // If new capacity is smaller than current size, remove least recently used items
    while (this.cache.size > this.capacity && this.capacity > 0) {
      const leastUsedKey = this.usageOrder.shift();
      if (leastUsedKey !== undefined) {
        this.cache.delete(leastUsedKey);
      }
    }
  }

  /**
   * Mark a key as recently used by moving it to the end of the usage order
   * @param key The key to mark as used
   */
  private markAsUsed(key: K): void {
    const index = this.usageOrder.indexOf(key);
    if (index !== -1) {
      this.usageOrder.splice(index, 1);
    }
    this.usageOrder.push(key);
  }
}

/**
 * PDF Thumbnail Cache Manager
 * Specialized cache for PDF thumbnails with automatic cleanup
 */
export class PDFThumbnailCache {
  private cache: LRUCache<string, string>;
  private prefix: string;

  /**
   * Create a new PDF thumbnail cache
   * @param capacity Maximum number of thumbnails to store
   * @param prefix Optional prefix to add to cache keys for isolation
   */
  constructor(capacity: number = 200, prefix: string = '') {
    this.cache = new LRUCache<string, string>(capacity);
    this.prefix = prefix;
  }

  /**
   * Create a cache key for a thumbnail
   * @param pageNumber Page number
   * @param width Thumbnail width
   * @param height Optional thumbnail height
   * @returns Cache key
   */
  private createKey(pageNumber: number, width: number, height?: number): string {
    return `${this.prefix}:page${pageNumber}:w${width}:h${height || 'auto'}`;
  }

  /**
   * Get a thumbnail from the cache
   * @param pageNumber Page number
   * @param width Thumbnail width
   * @param height Optional thumbnail height
   * @returns Thumbnail data URL or undefined if not in cache
   */
  getThumbnail(pageNumber: number, width: number, height?: number): string | undefined {
    const key = this.createKey(pageNumber, width, height);
    return this.cache.get(key);
  }

  /**
   * Store a thumbnail in the cache
   * @param pageNumber Page number
   * @param width Thumbnail width
   * @param height Optional thumbnail height
   * @param dataUrl Thumbnail data URL
   */
  setThumbnail(pageNumber: number, width: number, height: number | undefined, dataUrl: string): void {
    const key = this.createKey(pageNumber, width, height);
    this.cache.put(key, dataUrl);
  }

  /**
   * Remove a thumbnail from the cache
   * @param pageNumber Page number
   * @param width Thumbnail width
   * @param height Optional thumbnail height
   */
  removeThumbnail(pageNumber: number, width: number, height?: number): void {
    const key = this.createKey(pageNumber, width, height);
    this.cache.remove(key);
  }

  /**
   * Check if a thumbnail exists in the cache
   * @param pageNumber Page number
   * @param width Thumbnail width
   * @param height Optional thumbnail height
   */
  hasThumbnail(pageNumber: number, width: number, height?: number): boolean {
    const key = this.createKey(pageNumber, width, height);
    return this.cache.has(key);
  }

  /**
   * Clear all thumbnails from the cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get the number of thumbnails in the cache
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Change the capacity of the cache
   * @param newCapacity New maximum capacity
   */
  setCapacity(newCapacity: number): void {
    this.cache.setCapacity(newCapacity);
  }

  /**
   * Get all cached pages
   * @returns Array of page numbers that have thumbnails in the cache
   */
  getCachedPages(): number[] {
    const pages = new Set<number>();
    
    this.cache.keys().forEach(key => {
      const match = key.match(/page(\d+):/);
      if (match && match[1]) {
        pages.add(parseInt(match[1]));
      }
    });
    
    return Array.from(pages).sort((a, b) => a - b);
  }

  /**
   * Prefetch a range of pages to ensure they're in the cache
   * @param fetchFunction Function to fetch thumbnails for pages not in cache
   * @param startPage First page to prefetch
   * @param endPage Last page to prefetch
   * @param width Thumbnail width
   * @param height Optional thumbnail height
   */
  async prefetchRange(
    fetchFunction: (pageNumber: number) => Promise<string>,
    startPage: number,
    endPage: number,
    width: number,
    height?: number
  ): Promise<void> {
    const pagesToFetch = [];
    
    // Identify which pages in the range need to be fetched
    for (let page = startPage; page <= endPage; page++) {
      if (!this.hasThumbnail(page, width, height)) {
        pagesToFetch.push(page);
      }
    }
    
    // Fetch the pages in parallel (but limit concurrency to avoid overload)
    const concurrencyLimit = 3;
    for (let i = 0; i < pagesToFetch.length; i += concurrencyLimit) {
      const batch = pagesToFetch.slice(i, i + concurrencyLimit);
      await Promise.all(
        batch.map(async (page) => {
          try {
            const thumbnail = await fetchFunction(page);
            this.setThumbnail(page, width, height, thumbnail);
          } catch (error) {
            console.error(`Failed to prefetch thumbnail for page ${page}:`, error);
          }
        })
      );
    }
  }
} 