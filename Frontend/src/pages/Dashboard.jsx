import { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { summarizeNotes } from '../services/api';
import { saveMeetingSummary } from '../services/firestore';

const Dashboard = () => {
  const { user, logout, history } = useStore();
  const [notes, setNotes] = useState('');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSummarize = async () => {
    if (!notes.trim()) return;
    setLoading(true);
    try {
      const data = await summarizeNotes(notes);
      if (data.summary) {
        setSummary(data.summary);
        await saveMeetingSummary(user.uid, notes, data.summary);
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-12">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            Meeting Summarizer
          </h1>
          <div className="flex items-center gap-4">
            <span className="hidden md:inline text-slate-400">{user?.email}</span>
            <button
              onClick={logout}
              className="px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <section className="space-y-6">
            <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
              <h2 className="text-xl font-semibold mb-4 text-white">New Meeting Notes</h2>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Paste transcript here..."
                className="w-full h-64 bg-slate-950 border border-slate-700 rounded-xl p-4 text-slate-300 focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
              />
              <button
                onClick={handleSummarize}
                disabled={loading || !notes.trim()}
                className="w-full mt-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl font-bold shadow-lg shadow-blue-900/20 transition-all"
              >
                {loading ? 'Generating...' : 'Summarize Now'}
              </button>
            </div>

            {summary && (
              <div className="bg-emerald-900/20 p-6 rounded-2xl border border-emerald-500/30 animate-in fade-in slide-in-from-bottom-4">
                <h3 className="text-emerald-400 font-bold mb-3 uppercase tracking-wider text-xs">Latest Summary</h3>
                <div className="prose prose-invert max-w-none text-slate-300 whitespace-pre-wrap">
                  {summary}
                </div>
              </div>
            )}
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-6 text-white px-2">History</h2>
            <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-250px)] pr-2">
              {history.map((item) => (
                <div key={item.id} className="bg-slate-900/40 p-5 rounded-xl border border-slate-800 hover:border-slate-700 transition-all">
                  <span className="text-xs text-slate-500 block mb-2">
                    {item.createdAt?.toDate().toLocaleDateString()}
                  </span>
                  <p className="text-slate-300 line-clamp-3 text-sm leading-relaxed">
                    {item.summary}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
