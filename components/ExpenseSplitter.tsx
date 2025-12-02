import React, { useState, useMemo } from 'react';
import { Expense, Settlement } from '../types';
import { Plus, DollarSign, User, TrendingUp, ArrowRight, X, Trash2, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

interface ExpenseSplitterProps {
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export const ExpenseSplitter: React.FC<ExpenseSplitterProps> = ({ expenses, setExpenses }) => {
  const [users, setUsers] = useState<string[]>(['小邱', '阿邱', '秋刀魚']);
  const [newUser, setNewUser] = useState('');
  
  // New Expense Form State
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [payer, setPayer] = useState('');
  const [involved, setInvolved] = useState<string[]>([]);

  // Set default payer/involved when users change
  React.useEffect(() => {
      // Only set defaults if state is "empty" or invalid to avoid overwriting user selection during editing
      if ((!payer || !users.includes(payer)) && users.length > 0) {
          setPayer(users[0]);
      }
      // If involved is empty (and strictly empty, not just cleared by user), default to all. 
      // But simpler: just ensure form is usable. 
      // Let's just default involved to ALL users if the list of users grows or initial load
      if (involved.length === 0 && users.length > 0) {
          setInvolved(users);
      }
  }, [users.length]); // Depend on length to reset when adding users

  const handleAddUser = () => {
    if (newUser && !users.includes(newUser)) {
      const newUsersList = [...users, newUser];
      setUsers(newUsersList);
      // Auto-add new user to involved list for convenience
      setInvolved(prev => [...prev, newUser]);
      setNewUser('');
    }
  };

  const handleRemoveUser = (userToRemove: string) => {
      // 1. Check if user is a payer in any existing expense
      const isPayer = expenses.some(e => e.payer === userToRemove);
      if (isPayer) {
          alert(`無法刪除 "${userToRemove}"，因為他/她有代墊費用的紀錄。請先刪除或修改這些款項（${expenses.filter(e => e.payer === userToRemove).length} 筆）。`);
          return;
      }

      // 2. Check if user is involved in expenses
      const involvedInExpenses = expenses.filter(e => e.involved.includes(userToRemove));
      
      if (involvedInExpenses.length > 0) {
          if (!window.confirm(`"${userToRemove}" 包含在 ${involvedInExpenses.length} 筆分帳紀錄中。\n\n刪除此人將會將他從這些紀錄中移除，費用將由其餘分攤人重新計算。\n\n確定要刪除嗎？`)) {
              return;
          }
          
          // Remove user from historical expenses involved list
          setExpenses(prev => prev.map(e => ({
              ...e,
              involved: e.involved.filter(u => u !== userToRemove)
          })));
      }

      // 3. Update User State
      setUsers(prev => prev.filter(u => u !== userToRemove));
      
      // 4. Update Form State
      setInvolved(prev => prev.filter(u => u !== userToRemove));
      if (payer === userToRemove) {
          const remainingUsers = users.filter(u => u !== userToRemove);
          setPayer(remainingUsers.length > 0 ? remainingUsers[0] : '');
      }
  }

  const handleDeleteExpense = (id: string) => {
      if (window.confirm('確定要刪除這筆款項嗎？')) {
          setExpenses(expenses.filter(e => e.id !== id));
      }
  }

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc || !amount || involved.length === 0 || !payer) return;

    const newExpense: Expense = {
      id: Date.now().toString(),
      description: desc,
      amount: parseFloat(amount),
      payer,
      involved
    };

    setExpenses([...expenses, newExpense]);
    setDesc('');
    setAmount('');
    setInvolved(users); // Reset to all selected for convenience
  };

  const settlements = useMemo(() => {
    const balances: Record<string, number> = {};
    users.forEach(u => balances[u] = 0);

    expenses.forEach(exp => {
      const paidBy = exp.payer;
      const amt = exp.amount;
      
      // Only consider users who currently exist
      const validInvolved = exp.involved.filter(u => users.includes(u));
      
      // If nobody valid is involved, we skip splitting logic to avoid div by zero
      // But we must acknowledge the payer paid.
      // However, if payer is deleted, they are not in `balances`.
      // If payer exists but nobody involved, payer gets +amt, nobody gets -amt => imbalance.
      // We'll skip completely if invalid to keep checksum 0.
      if (validInvolved.length === 0) return;
      if (!users.includes(paidBy)) return; // Should not happen due to deletion guards, but safety check

      const splitAmount = amt / validInvolved.length;

      balances[paidBy] += amt;

      validInvolved.forEach(person => {
        balances[person] -= splitAmount;
      });
    });

    const debtors: { user: string; amount: number }[] = [];
    const creditors: { user: string; amount: number }[] = [];

    Object.entries(balances).forEach(([user, amount]) => {
      if (amount < -0.01) debtors.push({ user, amount }); 
      if (amount > 0.01) creditors.push({ user, amount }); 
    });

    debtors.sort((a, b) => a.amount - b.amount); 
    creditors.sort((a, b) => b.amount - a.amount); 

    const results: Settlement[] = [];
    let i = 0; 
    let j = 0; 

    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      
      // The amount to settle is the minimum of debt or credit
      const amount = Math.min(Math.abs(debtor.amount), creditor.amount);
      results.push({ from: debtor.user, to: creditor.user, amount });

      debtor.amount += amount;
      creditor.amount -= amount;

      // Move pointers if settled
      if (Math.abs(debtor.amount) < 0.01) i++;
      if (creditor.amount < 0.01) j++;
    }

    return results;
  }, [expenses, users]);

  const chartData = useMemo(() => {
    const data: Record<string, number> = {};
    users.forEach(u => data[u] = 0);
    expenses.forEach(e => {
        if (users.includes(e.payer)) {
            data[e.payer] = (data[e.payer] || 0) + e.amount;
        }
    });
    return Object.keys(data).map(key => ({ name: key, value: data[key] }));
  }, [expenses, users]);

  return (
    <div className="flex flex-col gap-6 pb-20">
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Column 1: Configuration */}
        <div className="flex flex-col gap-6">
          {/* User Management */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
              <User size={18} /> 同行旅伴
            </h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {users.map(u => (
                <span key={u} className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 pl-3 pr-1 border border-indigo-100">
                  {u}
                  <button 
                    type="button"
                    onClick={() => handleRemoveUser(u)} 
                    className="ml-1 text-indigo-400 hover:text-red-500 hover:bg-red-50 rounded-full p-1 transition-colors"
                    title="移除此旅伴"
                  >
                      <X size={14} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input 
                value={newUser}
                onChange={e => setNewUser(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddUser()}
                placeholder="輸入姓名..."
                className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button 
                type="button"
                onClick={handleAddUser} 
                className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-slate-900 transition-colors"
              >
                  <Plus size={16} />
              </button>
            </div>
          </div>

          {/* Add Expense Form */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
              <DollarSign size={18} /> 新增支出
            </h3>
            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">項目說明</label>
                <input 
                  value={desc} 
                  onChange={e => setDesc(e.target.value)} 
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                  placeholder="例如：京都晚餐、新幹線車票"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">金額 ($)</label>
                  <input 
                    type="number"
                    value={amount} 
                    onChange={e => setAmount(e.target.value)} 
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                    placeholder="0"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">誰先付的？</label>
                  <select 
                    value={payer} 
                    onChange={e => setPayer(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="" disabled>選擇付款人</option>
                    {users.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2">分攤給誰？</label>
                <div className="flex flex-wrap gap-2">
                  <button 
                    type="button" 
                    onClick={() => setInvolved(involved.length === users.length ? [] : users)}
                    className="text-xs text-indigo-600 underline mr-2"
                  >
                    {involved.length === users.length ? '取消全選' : '全選'}
                  </button>
                  {users.map(u => (
                    <label key={u} className={`text-xs px-3 py-1.5 rounded-md cursor-pointer border transition-colors select-none ${involved.includes(u) ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                      <input 
                        type="checkbox" 
                        className="hidden"
                        checked={involved.includes(u)}
                        onChange={() => {
                          if (involved.includes(u)) setInvolved(involved.filter(i => i !== u));
                          else setInvolved([...involved, u]);
                        }}
                      />
                      {u}
                    </label>
                  ))}
                </div>
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition shadow-sm mt-2">
                記錄支出
              </button>
            </form>
          </div>
        </div>

        {/* Column 2: Recent Transactions */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-[500px] lg:h-auto">
          <div className="p-5 border-b border-slate-100 bg-slate-50 rounded-t-xl">
             <h3 className="font-bold text-slate-700">最近支出紀錄</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
             {expenses.length === 0 && <p className="text-slate-400 text-center mt-20 italic text-sm">尚未有任何紀錄</p>}
             {expenses.slice().reverse().map(exp => (
               <div key={exp.id} className="group flex justify-between items-center p-3 hover:bg-slate-50 rounded-lg border-b border-slate-100 last:border-0 transition-colors">
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{exp.description}</p>
                    <p className="text-xs text-slate-500 mt-0.5"><span className="font-medium text-slate-700">{exp.payer}</span> 先付，分給 {exp.involved.length} 人</p>
                  </div>
                  <div className="flex items-center gap-3">
                      <span className="font-bold text-indigo-600 text-sm">${exp.amount.toFixed(0)}</span>
                      <button 
                        type="button"
                        onClick={() => handleDeleteExpense(exp.id)} 
                        className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="刪除"
                      >
                          <Trash2 size={14} />
                      </button>
                  </div>
               </div>
             ))}
          </div>
        </div>

        {/* Column 3: Analysis & Settlement */}
        <div className="flex flex-col gap-6">
           {/* Chart */}
           <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 h-64 flex flex-col">
             <h3 className="font-bold text-slate-700 mb-2 flex items-center gap-2 text-sm">
               <TrendingUp size={16} /> 墊付金額統計
             </h3>
             <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" tick={{fontSize: 12}} width={40} />
                    <Tooltip cursor={{fill: 'transparent'}} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Bar>
                </BarChart>
                </ResponsiveContainer>
             </div>
           </div>

           {/* Settlement Plan */}
           <div className="bg-gradient-to-br from-indigo-50 to-white p-5 rounded-xl border border-indigo-100 flex-1 shadow-sm">
             <h3 className="font-bold text-indigo-900 mb-4 border-b border-indigo-100 pb-2">結帳方案</h3>
             {settlements.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-indigo-300 pb-10">
                   <p className="text-sm">目前沒有債務關係，大家扯平了！</p>
               </div>
             ) : (
               <div className="space-y-3">
                 {settlements.map((s, idx) => (
                   <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm border border-slate-100">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-bold text-slate-700">{s.from}</span>
                        <div className="flex flex-col items-center px-2">
                             <span className="text-[10px] text-slate-400">給</span>
                             <ArrowRight size={14} className="text-slate-300" />
                        </div>
                        <span className="font-bold text-slate-700">{s.to}</span>
                      </div>
                      <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded text-sm">${s.amount.toFixed(0)}</span>
                   </div>
                 ))}
               </div>
             )}
           </div>
        </div>

      </div>
    </div>
  );
};