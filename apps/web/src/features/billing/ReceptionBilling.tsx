import { useState } from 'react';
import { Badge, Empty, Panel, Row, Stat } from '../../components/ui';
import { useNotify } from '../../hooks/useNotify';
import { patientName } from '../../services/selectors';
import { useStore } from '../../services/store';
import type { PaymentMethod } from '../../types/domain';
import { formatDate, formatMoney } from '../../utils/format';

export function ReceptionPayments() {
  const { db, actions } = useStore();
  const notify = useNotify();
  const [methods, setMethods] = useState<Record<string, PaymentMethod>>({});
  const toValidate = db.payments.filter((item) => item.status === 'pending' && item.awaitingValidation);
  const open = db.payments.filter((item) => item.status === 'pending' && !item.awaitingValidation);
  const paid = db.payments.filter((item) => item.status === 'paid').sort((a, b) => (b.paidAt ?? '').localeCompare(a.paidAt ?? ''));

  const confirm = (id: string, method: PaymentMethod) => {
    actions.confirmPayment(id, method);
    notify('Pagamento PAGO. Fatura emitida.');
  };

  return (
    <>
      <Panel title="A validar" action={<Badge tone={toValidate.length ? 'warn' : 'mint'}>{toValidate.length}</Badge>}>
        <p className="muted small">Pagamentos manuais declarados pelo cliente: validar → PAGO → faturação.</p>
        {toValidate.length === 0 && <Empty>Nada para validar.</Empty>}
        {toValidate.map((item) => (
          <Row key={item.id} title={`${patientName(db, item.patientId)} · ${formatMoney(item.amount)}`} detail={`${item.description} · ${item.method} · ${item.reference}`}>
            <button className="button button-primary" type="button" onClick={() => confirm(item.id, item.method ?? 'Dinheiro')}>Validar pagamento</button>
          </Row>
        ))}
      </Panel>

      <Panel title="Pendentes">
        {open.length === 0 && <Empty>Sem pagamentos pendentes.</Empty>}
        {open.map((item) => (
          <Row key={item.id} title={`${patientName(db, item.patientId)} · ${formatMoney(item.amount)}`} detail={`${item.description} · ${item.reference}`}>
            <select aria-label="Método" value={methods[item.id] ?? 'Dinheiro'} onChange={(event) => setMethods({ ...methods, [item.id]: event.target.value as PaymentMethod })}>
              <option>Dinheiro</option>
              <option>Cartão</option>
              <option>Transferência</option>
              <option>MBWay</option>
            </select>
            <button className="button button-ghost" type="button" onClick={() => confirm(item.id, methods[item.id] ?? 'Dinheiro')}>Recebido</button>
          </Row>
        ))}
      </Panel>

      <Panel title="Recebidos">
        {paid.map((item) => (
          <Row key={item.id} title={`${patientName(db, item.patientId)} · ${formatMoney(item.amount)}`} detail={`${item.description} · ${item.method} · ${item.paidAt ? formatDate(item.paidAt) : ''}`} meta={<Badge tone="mint">Pago</Badge>} />
        ))}
      </Panel>
    </>
  );
}

export function InvoicesView({ canSync }: { canSync: boolean }) {
  const { db, actions } = useStore();
  const notify = useNotify();
  const invoices = [...db.invoices].sort((a, b) => b.issueDate.localeCompare(a.issueDate));
  const total = invoices.reduce((sum, item) => sum + item.amount, 0);
  const pendingTotal = db.payments.filter((item) => item.status === 'pending').reduce((sum, item) => sum + item.amount, 0);
  const unsynced = invoices.filter((item) => !item.syncedToPrimavera).length;

  return (
    <>
      <div className="stats">
        <Stat label="Faturado" value={formatMoney(total)} hint={`${invoices.length} faturas`} />
        <Stat label="Por receber" value={formatMoney(pendingTotal)} />
        <Stat label="Por enviar ao Primavera" value={unsynced} />
      </div>
      <Panel title="Faturas">
        {invoices.length === 0 && <Empty>Sem faturas emitidas.</Empty>}
        {invoices.map((item) => (
          <Row key={item.id} title={`${item.invoiceNumber} · ${formatMoney(item.amount)}`} detail={`${patientName(db, item.patientId)} · ${formatDate(item.issueDate)}`} meta={<Badge tone={item.syncedToPrimavera ? 'mint' : 'warn'}>{item.syncedToPrimavera ? 'Primavera ✓' : 'Por enviar'}</Badge>}>
            {canSync && !item.syncedToPrimavera && <button className="button button-ghost" type="button" onClick={() => { actions.syncInvoice(item.id); notify(`${item.invoiceNumber} enviada para o Primavera.`); }}>Enviar</button>}
          </Row>
        ))}
      </Panel>
    </>
  );
}
