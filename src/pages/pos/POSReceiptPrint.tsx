import { fmtTND } from './types';
import type { PrintableOrderData } from './types';

interface POSReceiptPrintProps {
  data: PrintableOrderData;
}

export function POSReceiptPrint({ data }: POSReceiptPrintProps) {
  const { order, channel, paymentMethod, amountReceived, changeAmount } = data;
  const date = new Date(order.created_at);

  const fmtDate = date.toLocaleDateString('fr-TN');
  const fmtTime = date.toLocaleTimeString('fr-TN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className="pos-receipt"
      style={{ page: 'receipt' } as React.CSSProperties}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 'bold' }}>
          {channel?.name || 'LkSystem POS'}
        </div>
        {channel?.address && (
          <div style={{ fontSize: 9, marginTop: 2 }}>{channel.address}</div>
        )}
        {channel?.phone && (
          <div style={{ fontSize: 9 }}>Tel: {channel.phone}</div>
        )}
        <div style={{ fontSize: 9, marginTop: 4 }}>
          {fmtDate} {fmtTime}
        </div>
        <div style={{ fontSize: 9 }}>Order: {order.order_number}</div>
      </div>

      {/* Separator */}
      <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

      {/* Line Items */}
      <table
        style={{ width: '100%', fontSize: 10, borderCollapse: 'collapse' }}
      >
        <tbody>
          {order.lines?.map((line, i) => (
            <tr key={i}>
              <td style={{ paddingTop: 3, paddingBottom: 3 }}>
                <div>{line.product_name}</div>
                <div style={{ fontSize: 9, color: '#666' }}>
                  {line.quantity} x {fmtTND(Number(line.unit_price))}
                </div>
              </td>
              <td
                style={{
                  textAlign: 'right',
                  verticalAlign: 'top',
                  fontWeight: 'bold',
                  paddingTop: 3,
                }}
              >
                {fmtTND(Number(line.total))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Separator */}
      <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

      {/* Totals */}
      <table style={{ width: '100%', fontSize: 10 }}>
        <tbody>
          {Number(order.tax_total) > 0 && (
            <>
              <tr>
                <td>Subtotal</td>
                <td style={{ textAlign: 'right' }}>
                  {fmtTND(Number(order.subtotal))}
                </td>
              </tr>
              <tr>
                <td>Tax</td>
                <td style={{ textAlign: 'right' }}>
                  {fmtTND(Number(order.tax_total))}
                </td>
              </tr>
            </>
          )}
          <tr style={{ fontSize: 13, fontWeight: 'bold' }}>
            <td style={{ paddingTop: 4 }}>TOTAL</td>
            <td style={{ textAlign: 'right', paddingTop: 4 }}>
              {fmtTND(Number(order.total))} TND
            </td>
          </tr>
        </tbody>
      </table>

      {/* Separator */}
      <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

      {/* Payment Info */}
      <div style={{ fontSize: 10 }}>
        <div>
          Payment:{' '}
          {paymentMethod === 'cash'
            ? 'Cash'
            : paymentMethod === 'card'
              ? 'Card'
              : 'Transfer'}
        </div>
        {paymentMethod === 'cash' && amountReceived > 0 && (
          <>
            <div>Received: {fmtTND(amountReceived)} TND</div>
            <div style={{ fontWeight: 'bold' }}>
              Change: {fmtTND(changeAmount)} TND
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', marginTop: 12, fontSize: 9 }}>
        <div>Merci pour votre achat!</div>
        <div style={{ marginTop: 2, color: '#999' }}>
          Powered by LkSystem
        </div>
      </div>
    </div>
  );
}
