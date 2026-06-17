import browser from 'webextension-polyfill';
import { MessageType, MessageEnvelope, ResponseEnvelope, AppError } from './types';

/**
 * Type-safe message sender for extension IPC.
 * Automatically wraps payloads, generates requestIds, and returns typed responses.
 */
export async function sendMessage<ResponseData, PayloadData = unknown>(
  type: MessageType,
  payload?: PayloadData
): Promise<ResponseEnvelope<ResponseData>> {
  const envelope: MessageEnvelope<PayloadData> = {
    type,
    requestId: crypto.randomUUID(),
    payload: payload as PayloadData,
  };

  try {
    const response = await browser.runtime.sendMessage(envelope);
    return response as ResponseEnvelope<ResponseData>;
  } catch (error) {
    return {
      requestId: envelope.requestId,
      success: false,
      error: {
        code: 'LN_400',
        message: error instanceof Error ? error.message : 'Message transmission failed',
      },
    };
  }
}

export function createResponse<T>(requestId: string, data: T): ResponseEnvelope<T> {
  return {
    requestId,
    success: true,
    data,
  };
}

export function createErrorResponse(requestId: string, error: AppError): ResponseEnvelope<never> {
  return {
    requestId,
    success: false,
    error: {
      code: error.code,
      message: error.message,
    },
  };
}
