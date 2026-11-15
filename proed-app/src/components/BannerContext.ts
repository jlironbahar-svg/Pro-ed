import { createContext, useContext, type ReactNode } from 'react';

/** Status banners (recovery mode, update available) shown under each screen's top bar. */
export const BannerContext = createContext<ReactNode>(null);

export function useBanner(): ReactNode {
  return useContext(BannerContext);
}
