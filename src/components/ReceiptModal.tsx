import { Printer, X } from 'lucide-react';
import { FEGGY_LOGO_URL, formatNgn, formatReadableDate } from '../data/catalog';
import type { PaymentRecord } from '../types';

interface ReceiptModalProps {
  payment: PaymentRecord | null;
  onClose: () => void;
}

export function ReceiptModal({ payment, onClose }: ReceiptModalProps) {
  if (!payment) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Payment Receipt"
    >
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 overflow-hidden shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 no-print">
          <h3 className="font-display text-base font-bold text-slate-900">
            Official Payment Receipt
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close receipt"
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={FEGGY_LOGO_URL} alt="FEGGY FOODSTUFF" className="w-10 h-10 object-contain" />
              <div>
                <p className="font-display font-bold text-[#0B2545]">FEGGY FOODSTUFF</p>
                <p className="text-xs text-slate-500">Easy Buy Foodstuff</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Receipt No.</p>
              <p className="font-mono-nums text-sm font-semibold text-slate-900">
                {payment.receiptNumber}
              </p>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-green-800 font-medium">Verified Amount Paid</p>
              <p className="font-display text-2xl font-bold text-green-900 tabular-nums mt-0.5">
                {formatNgn(payment.amountNgn)}
              </p>
            </div>
            <span className="text-xs font-semibold text-green-800">PAID · PAYSTACK</span>
          </div>

          <dl className="divide-y divide-slate-100 text-sm">
            <div className="py-2.5 flex justify-between gap-4">
              <dt className="text-slate-500">Customer</dt>
              <dd className="font-medium text-slate-900 text-right">{payment.customerName}</dd>
            </div>
            <div className="py-2.5 flex justify-between gap-4">
              <dt className="text-slate-500">Email</dt>
              <dd className="font-medium text-slate-900 text-right">{payment.customerEmail}</dd>
            </div>
            <div className="py-2.5 flex justify-between gap-4">
              <dt className="text-slate-500">Description</dt>
              <dd className="font-medium text-slate-900 text-right">{payment.description}</dd>
            </div>
            <div className="py-2.5 flex justify-between gap-4">
              <dt className="text-slate-500">Paystack Reference</dt>
              <dd className="font-mono-nums text-xs text-slate-800 text-right">
                {payment.paystackReference}
              </dd>
            </div>
            <div className="py-2.5 flex justify-between gap-4">
              <dt className="text-slate-500">Channel</dt>
              <dd className="font-medium text-slate-900 uppercase text-right">{payment.channel}</dd>
            </div>
            <div className="py-2.5 flex justify-between gap-4">
              <dt className="text-slate-500">Payment Date</dt>
              <dd className="font-medium text-slate-900 text-right">
                {formatReadableDate(payment.paidAt)}
              </dd>
            </div>
          </dl>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 no-print">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-700 text-white text-sm font-semibold hover:bg-green-800 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print / Save PDF
          </button>
        </div>
      </div>
    </div>
  );
}
