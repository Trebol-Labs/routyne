export interface MediaResult {
  url: string;
  type: 'gif' | 'image' | 'video';
  fallbackUrl?: string;
}

export interface MediaProvider {
  resolve(name: string): Promise<MediaResult | null>;
}
