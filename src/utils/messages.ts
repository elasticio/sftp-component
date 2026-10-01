import { randomUUID } from 'crypto';

export interface Message {
  id: string;
  attachments: Record<string, any>;
  body: any;
  headers: Record<string, any>;
  metadata: Record<string, any>;
}

export const newMessageWithBody = (body: any): Message => ({
  id: randomUUID(),
  attachments: {},
  body,
  headers: {},
  metadata: {}
});

export const newEmptyMessage = (): Message => ({
  id: randomUUID(),
  attachments: {},
  body: {},
  headers: {},
  metadata: {}
});

export const messages = {
  newMessageWithBody,
  newEmptyMessage
};
