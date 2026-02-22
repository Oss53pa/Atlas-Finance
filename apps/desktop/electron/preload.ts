/**
 * Preload script — exposes safe APIs to the renderer.
 */
import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isDesktop: true,
});
