import db from '../config/database.js';

export default class PaymentAuditLogModel {
  static async record(event, connection = db) {
    return connection('payment_audit_logs').insert({
      event_type: event.eventType,
      order_id: event.orderId ?? null,
      transaction_id: event.transactionId ?? null,
      payload: JSON.stringify(event.payload ?? {}),
      performed_by: event.performedBy ?? null
    });
  }
}
