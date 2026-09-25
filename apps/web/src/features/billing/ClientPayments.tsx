import { FormEvent, useState } from 'react';
import { Badge, Empty, Panel, Row, Sheet } from '../../components/ui';
import { useNotify } from '../../hooks/useNotify';
import { clientScope, serviceName } from '../../services/selectors';
import { useStore } from '../../services/store';
import type { PaymentMethod, PaymentTransaction } from '../../types/domain';
import { formatDate, formatMoney } from '../../utils/format';

export function ClientPayments() {
  const { db, user } = useStore();
  const scope = clientScope(db, user!);
  const [paying, setPaying] = useState<PaymentTransaction | null>(null);
  const pending = scope.payments.filter((item) => item.status === 'pending');
  const paid = scope.payments.filter((item) => item.status === 'paid');

  return (
    <>
      {scope.packs.map((pack) => (
        <Panel key={pack.id} className="panel-accent">
          <span className="eyebrow">Pack ativo</span>
          <div className="pack">
            <strong>{pack.remainingSessions}<small>/{pack.totalSessions}</small></strong>
            <div>
              <span>sessões de {serviceName(db, pack.serviceId).toLowerCase()} disponíveis</span>
              <span className="muted small">Válido até {formatDate(pack.expirationDate)}</span>
            </div>
          </div>
          <div className="meter" aria-hidden="true"><span style={{ width: `${(pack.remainingSessions / pack.totalSessions) * 100}%` }} /></div>
        </Panel>
      ))}

      <Panel title="Por pagar">
        {pending.length === 0 && <Empty>Não tem pagamentos pendentes.</Empty>}
        {pending.map((item) => (
          <Row key={item.id} title={item.description} detail={`${formatMoney(item.amount)} · ${item.reference}`} meta={item.awaitingValidation ? <Badge tone="warn">{item.method} · a validar</Badge> : <Badge tone="danger">Pendente</Badge>}>
            {!item.awaitingValidation && <button className="button button-primary" type="button" onClick={() => setPaying(item)}>Pagar</button>}
          </Row>
        ))}
      </Panel>

      <Panel title="Histórico financeiro">
        {paid.length === 0 && <Empty>Sem pagamentos registados.</Empty>}
        {paid.map((item) => {
          const invoice = scope.invoices.find((inv) => inv.paymentId === item.id);
          return (
            <Row key={item.id} title={item.description} detail={`${item.method} · ${item.paidAt ? formatDate(item.paidAt) : ''}${invoice ? ` · ${invoice.invoiceNumber}` : ''}`} meta={<Badge tone="mint">{formatMoney(item.amount)} · Pago</Badge>} />
          );
        })}
      </Panel>

      {paying && <PaySheet payment={paying} onClose={() => setPaying(null)} />}
    </>
  );
}

function PaySheet({ payment, onClose }: { payment: PaymentTransaction; onClose: () => void }) {
  const { db, user, actions } = useStore();
  const notify = useNotify();
  const patient = clientScope(db, user!).patient;
  const [tab, setTab] = useState<'mbway' | 'manual'>('mbway');
  const [phone, setPhone] = useState(patient.phone);
  const [method, setMethod] = useState<PaymentMethod>('Transferência');
  const [step, setStep] = useState<'form' | 'waiting' | 'done'>('form');

  async function payMbway(event: FormEvent) {
    event.preventDefault();
    setStep('waiting');
    await actions.payWithMbway(payment.id, phone);
    setStep('done');
    notify('Pagamento MB Way confirmado. Fatura emitida.');
  }

  function declareManual(event: FormEvent) {
    event.preventDefault();
    actions.declareManualPayment(payment.id, method);
    notify('Pagamento registado. Fica pendente até a clínica o validar.');
    onClose();
  }

  return (
    <Sheet title={`Pagar ${formatMoney(payment.amount)}`} onClose={onClose}>
      {step === 'form' && (
        <div className="stack">
          <Row title={payment.description} detail={payment.reference} />
          <div className="segmented">
            <button type="button" className={tab === 'mbway' ? 'is-active' : ''} onClick={() => setTab('mbway')}>MB Way</button>
            <button type="button" className={tab === 'manual' ? 'is-active' : ''} onClick={() => setTab('manual')}>Outro método</button>
          </div>
          {tab === 'mbway' ? (
            <form className="form" onSubmit={payMbway}>
              <label>Telemóvel MB Way<input required value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" /></label>
              <p className="muted small">A confirmação é automática: quando aprovar na app, o pagamento fica PAGO e a fatura é emitida.</p>
              <button className="button button-primary button-block" type="submit">Enviar pedido MB Way</button>
            </form>
          ) : (
            <form className="form" onSubmit={declareManual}>
              <label>Método
                <select value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)}>
                  <option>Transferência</option>
                  <option>Cartão</option>
                  <option>Dinheiro</option>
                </select>
              </label>
              <p className="muted small">O pagamento fica PENDENTE até a receção o validar. Depois disso, é faturado.</p>
              <button className="button button-primary button-block" type="submit">Registar pagamento</button>
            </form>
          )}
        </div>
      )}
      {step === 'waiting' && (
        <div className="progress-state">
          <span className="spinner" aria-hidden="true" />
          <strong>Confirme o pagamento na app MB Way</strong>
          <p className="muted">À espera da confirmação do MB Way…</p>
        </div>
      )}
      {step === 'done' && (
        <div className="progress-state">
          <span className="check-mark" aria-hidden="true">✓</span>
          <strong>Pagamento confirmado</strong>
          <p className="muted">Estado PAGO. A fatura foi emitida e enviada para o Primavera.</p>
          <button className="button button-primary button-block" type="button" onClick={onClose}>Concluir</button>
        </div>
      )}
    </Sheet>
  );
}
