import { ArrowUpRight, MoreHorizontal } from 'lucide-react';

type Transaction = {
  id: string;
  property: string;
  client: string;
  amount: string;
  date: string;
  status: 'تکمیل‌شده' | 'در حال بررسی' | 'در انتظار';
};

const transactions: Transaction[] = [
  {
    id: 'TXN-1042',
    property: 'ویلا، نیاوران',
    client: 'کوروش تهرانی',
    amount: '۴٫۸ میلیارد',
    date: '۱۴۰۴/۰۴/۳۱',
    status: 'تکمیل‌شده',
  },
  {
    id: 'TXN-1041',
    property: 'آپارتمان، سعادت‌آباد',
    client: 'مریم احمدی',
    amount: '۲٫۳ میلیارد',
    date: '۱۴۰۴/۰۴/۳۰',
    status: 'در حال بررسی',
  },
  {
    id: 'TXN-1040',
    property: 'مغازه، میرداماد',
    client: 'سامان رضایی',
    amount: '۱٫۹ میلیارد',
    date: '۱۴۰۴/۰۴/۲۹',
    status: 'تکمیل‌شده',
  },
  {
    id: 'TXN-1039',
    property: 'دفتر کار، ولیعصر',
    client: 'نگار صادقی',
    amount: '۳٫۵ میلیارد',
    date: '۱۴۰۴/۰۴/۲۸',
    status: 'در انتظار',
  },
  {
    id: 'TXN-1038',
    property: 'ویلا، فرحزاد',
    client: 'امیر کاظمی',
    amount: '۶٫۲ میلیارد',
    date: '۱۴۰۴/۰۴/۲۷',
    status: 'تکمیل‌شده',
  },
];

const statusStyles: Record<Transaction['status'], string> = {
  'تکمیل‌شده': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'در حال بررسی': 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  'در انتظار': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

export default function TransactionsTable() {
  return (
    <div className="bg-slate-800 border border-slate-700/50 rounded-2xl overflow-hidden animate-fade-in-up">
      <div className="flex items-center justify-between p-5 lg:p-6 border-b border-slate-700/50">
        <div>
          <h3 className="text-base font-bold text-slate-100">تراکنش‌های اخیر</h3>
          <p className="text-xs text-slate-500 mt-1">۵ تراکنش آخر این هفته</p>
        </div>
        <button className="flex items-center gap-1 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors">
          مشاهده همه
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-right">
          <thead>
            <tr className="border-b border-slate-700/50">
              <th className="px-5 lg:px-6 py-3 text-xs font-semibold text-slate-500">کد تراکنش</th>
              <th className="px-5 lg:px-6 py-3 text-xs font-semibold text-slate-500">ملک</th>
              <th className="px-5 lg:px-6 py-3 text-xs font-semibold text-slate-500">مشتری</th>
              <th className="px-5 lg:px-6 py-3 text-xs font-semibold text-slate-500">مبلغ</th>
              <th className="px-5 lg:px-6 py-3 text-xs font-semibold text-slate-500 hidden sm:table-cell">تاریخ</th>
              <th className="px-5 lg:px-6 py-3 text-xs font-semibold text-slate-500">وضعیت</th>
              <th className="px-5 lg:px-6 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr
                key={t.id}
                className="border-b border-slate-700/30 last:border-0 hover:bg-slate-700/20 transition-colors"
              >
                <td className="px-5 lg:px-6 py-4 text-sm font-mono text-slate-400 nums-fa">
                  {t.id}
                </td>
                <td className="px-5 lg:px-6 py-4 text-sm font-medium text-slate-200">
                  {t.property}
                </td>
                <td className="px-5 lg:px-6 py-4 text-sm text-slate-300">
                  {t.client}
                </td>
                <td className="px-5 lg:px-6 py-4 text-sm font-semibold text-emerald-400 nums-fa">
                  {t.amount}
                </td>
                <td className="px-5 lg:px-6 py-4 text-sm text-slate-400 hidden sm:table-cell nums-fa">
                  {t.date}
                </td>
                <td className="px-5 lg:px-6 py-4">
                  <span
                    className={`inline-block text-[11px] font-medium px-2.5 py-1 rounded-lg border ${statusStyles[t.status]}`}
                  >
                    {t.status}
                  </span>
                </td>
                <td className="px-5 lg:px-6 py-4">
                  <button className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-700 transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
