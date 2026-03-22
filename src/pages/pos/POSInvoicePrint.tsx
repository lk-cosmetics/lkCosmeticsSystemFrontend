import { fmtTND } from './types';
import type { PrintableOrderData } from './types';

interface POSInvoicePrintProps {
  data: PrintableOrderData;
}

export function POSInvoicePrint({ data }: POSInvoicePrintProps) {
  const { order, channel, client, paymentMethod, amountReceived, changeAmount } =
    data;
  const date = new Date(order.created_at);

  const fmtDate = date.toLocaleDateString('fr-TN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const fmtTime = date.toLocaleTimeString('fr-TN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className="pos-invoice"
      style={{ page: 'invoice' } as React.CSSProperties}
    >
      {/* ── Company Header ──────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 'bold', margin: 0 }}>
            {channel?.name || 'LkSystem'}
          </h1>
          {channel?.address && (
            <p style={{ fontSize: 11, color: '#666', margin: '2px 0 0' }}>
              {channel.address}
              {channel.city ? `, ${channel.city}` : ''}
            </p>
          )}
          {channel?.phone && (
            <p style={{ fontSize: 11, color: '#666', margin: '2px 0 0' }}>
              Tel: {channel.phone}
            </p>
          )}
          {channel?.email && (
            <p style={{ fontSize: 11, color: '#666', margin: '2px 0 0' }}>
              {channel.email}
            </p>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <h2
            style={{ fontSize: 22, fontWeight: 'bold', margin: 0, color: '#333' }}
          >
            FACTURE
          </h2>
        </div>
      </div>

      {/* ── Invoice Info & Client ───────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 20,
          fontSize: 11,
        }}
      >
        <div>
          <p style={{ margin: '2px 0', fontWeight: 'bold' }}>Invoice Details</p>
          <p style={{ margin: '2px 0' }}>Number: {order.order_number}</p>
          <p style={{ margin: '2px 0' }}>Date: {fmtDate}</p>
          <p style={{ margin: '2px 0' }}>Time: {fmtTime}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: '2px 0', fontWeight: 'bold' }}>Client</p>
          {client ? (
            <>
              <p style={{ margin: '2px 0' }}>
                {client.first_name} {client.last_name}
              </p>
              {client.email && (
                <p style={{ margin: '2px 0' }}>{client.email}</p>
              )}
              {client.phone && (
                <p style={{ margin: '2px 0' }}>Tel: {client.phone}</p>
              )}
              {client.address && (
                <p style={{ margin: '2px 0' }}>{client.address}</p>
              )}
              {client.city && (
                <p style={{ margin: '2px 0' }}>{client.city}</p>
              )}
            </>
          ) : (
            <p style={{ margin: '2px 0', color: '#999' }}>Walk-in customer</p>
          )}
        </div>
      </div>

      {/* ── Line Items Table ────────────────────────────────────────── */}
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          marginBottom: 16,
          fontSize: 11,
        }}
      >
        <thead>
          <tr style={{ borderBottom: '2px solid #333' }}>
            <th style={{ textAlign: 'left', padding: '6px 4px', fontWeight: 'bold' }}>
              Product
            </th>
            <th style={{ textAlign: 'left', padding: '6px 4px', fontWeight: 'bold' }}>
              Barcode
            </th>
            <th style={{ textAlign: 'center', padding: '6px 4px', fontWeight: 'bold' }}>
              Qty
            </th>
            <th style={{ textAlign: 'right', padding: '6px 4px', fontWeight: 'bold' }}>
              Unit Price
            </th>
            <th style={{ textAlign: 'right', padding: '6px 4px', fontWeight: 'bold' }}>
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {order.lines?.map((line, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #e5e5e5' }}>
              <td style={{ padding: '5px 4px' }}>{line.product_name}</td>
              <td style={{ padding: '5px 4px', color: '#666' }}>
                {line.barcode || '—'}
              </td>
              <td style={{ padding: '5px 4px', textAlign: 'center' }}>
                {line.quantity}
              </td>
              <td style={{ padding: '5px 4px', textAlign: 'right' }}>
                {fmtTND(Number(line.unit_price))}
              </td>
              <td style={{ padding: '5px 4px', textAlign: 'right', fontWeight: 'bold' }}>
                {fmtTND(Number(line.total))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── Summary ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <table style={{ fontSize: 11, minWidth: 200 }}>
          <tbody>
            {Number(order.tax_total) > 0 && (
              <>
                <tr>
                  <td style={{ padding: '3px 12px 3px 0' }}>Subtotal</td>
                  <td style={{ textAlign: 'right', padding: '3px 0' }}>
                    {fmtTND(Number(order.subtotal))} TND
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '3px 12px 3px 0' }}>Tax</td>
                  <td style={{ textAlign: 'right', padding: '3px 0' }}>
                    {fmtTND(Number(order.tax_total))} TND
                  </td>
                </tr>
                <tr>
                  <td colSpan={2} style={{ borderTop: '1px solid #ccc' }} />
                </tr>
              </>
            )}
            <tr style={{ fontSize: 14, fontWeight: 'bold' }}>
              <td style={{ padding: '4px 12px 4px 0' }}>Total</td>
              <td style={{ textAlign: 'right', padding: '4px 0' }}>
                {fmtTND(Number(order.total))} TND
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Payment Section ─────────────────────────────────────────── */}
      <div
        style={{
          backgroundColor: '#f9f9f9',
          padding: 10,
          borderRadius: 4,
          fontSize: 11,
          marginBottom: 24,
        }}
      >
        <p style={{ margin: '2px 0' }}>
          <strong>Payment Method:</strong>{' '}
          {paymentMethod === 'cash'
            ? 'Cash'
            : paymentMethod === 'card'
              ? 'Card'
              : 'Bank Transfer'}
        </p>
        {paymentMethod === 'cash' && amountReceived > 0 && (
          <>
            <p style={{ margin: '2px 0' }}>
              Amount Received: {fmtTND(amountReceived)} TND
            </p>
            <p style={{ margin: '2px 0', fontWeight: 'bold' }}>
              Change: {fmtTND(changeAmount)} TND
            </p>
          </>
        )}
      </div>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <div
        style={{
          textAlign: 'center',
          fontSize: 9,
          color: '#999',
          borderTop: '1px solid #e5e5e5',
          paddingTop: 10,
        }}
      >
        Generated by LkSystem — {date.toLocaleDateString('fr-TN')}
      </div>
    </div>
  );
}
