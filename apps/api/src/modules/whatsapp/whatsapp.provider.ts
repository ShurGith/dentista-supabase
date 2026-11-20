import type { SendMessageOptions, WawpResponse } from '../wawp/wawp.service.js';
import { WawpService } from '../wawp/wawp.service.js';

export interface WhatsAppProvider {
  sendMessage(options: SendMessageOptions): Promise<WawpResponse>;
  sendTemplate(phoneNumber: string, templateCode: string, variables: Record<string, string>, appointmentId?: string): Promise<WawpResponse>;
}

export const whatsappProvider: WhatsAppProvider = new WawpService();
