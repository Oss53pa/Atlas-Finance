/**
 * Report Share Service — stub local
 * Partage de rapports par lien, email et export PDF
 */

interface ShareLink {
  id: string;
  url: string;
  expiresAt: string;
  accessLevel: string;
}

export const reportShareService = {
  async getShareLinks(_reportId: string): Promise<ShareLink[]> {
    return [];
  },

  async createShareLink(data: { reportId: string; accessLevel?: string; expiresIn?: number }): Promise<ShareLink> {
    const id = `share-${Date.now()}`;
    return {
      id,
      url: `${window.location.origin}/shared/${id}`,
      expiresAt: new Date(Date.now() + (data.expiresIn || 7) * 86400000).toISOString(),
      accessLevel: data.accessLevel || 'view',
    };
  },

  async copyToClipboard(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) { /* silent */
      return false;
    }
  },

  async deleteShareLink(_id: string): Promise<void> {},

  async getPdfDownloadUrl(_reportId: string): Promise<string> {
    return '#';
  },

  async sendByEmail(_params: { reportId: string; recipients: string[]; message?: string }): Promise<{ success: boolean }> {
    return { success: true };
  },
};
