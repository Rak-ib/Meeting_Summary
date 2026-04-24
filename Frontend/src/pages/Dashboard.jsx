import { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { summarizeNotes, askAgent } from '../services/api';
import { saveMeetingSummary, updateActionItemStatus, updateMeetingTitle, deleteMeetings } from '../services/firestore';
import { ClipboardCheck, CheckCircle2, Circle, LogOut, Sparkles, History as HistoryIcon, Copy, Check, MessageSquare, Send, Bot, BrainCircuit, User, Calendar, Filter, AlertTriangle, Trash2, X } from 'lucide-react';

const Dashboard = () => {
  const { user, logout, history, historyLoading, historyError } = useStore();
  const [notes, setNotes] = useState('');
  const [summary, setSummary] = useState('');
  const [actionItems, setActionItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [currentDocId, setCurrentDocId] = useState(null);
  const [title, setTitle] = useState('');
  const [myTasksOnly, setMyTasksOnly] = useState(false);
  const [chatQuery, setChatQuery] = useState('');
  const [chatResponse, setChatResponse] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  const handleSummarize = async () => {
    if (!notes.trim()) return;
    setLoading(true);
    setSummary('');
    setActionItems([]);
    setTitle('');
    try {
      const data = await summarizeNotes(notes);
      if (data.summary) {
        setSummary(data.summary);
        setActionItems(data.action_items || []);
        setTitle(data.title || "Untitled Meeting");
        const docId = await saveMeetingSummary(user.uid, notes, data.summary, data.action_items || [], data.title);
        setCurrentDocId(docId);
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTask = async (index) => {
    const newTasks = [...actionItems];
    newTasks[index].completed = !newTasks[index].completed;
    setActionItems(newTasks);
    
    if (currentDocId) {
      await updateActionItemStatus(currentDocId, newTasks);
    }
  };

  const handleCopyMarkdown = () => {
    const markdown = `# Meeting Summary\n\n${summary}\n\n## Action Items\n${actionItems.map(item => `- [${item.completed ? 'x' : ' '}] ${item.text}`).join('\n')}`;
    navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAskAgent = async (e) => {
    e.preventDefault();
    if (!chatQuery.trim()) return;
    setChatLoading(true);
    setChatResponse('');
    try {
      const data = await askAgent(chatQuery, summary, history);
      
      // 1. Set the human-readable answer
      setChatResponse(data.answer);

      // 2. Dispatch any actions returned by the AI
      if (data.actions && data.actions.length > 0) {
        for (const action of data.actions) {
          if (action.type === 'UPDATE_TITLE' && currentDocId) {
            setTitle(action.payload);
            await updateMeetingTitle(currentDocId, action.payload);
          }
          if (action.type === 'UPDATE_TASK' && currentDocId) {
            const { taskId, completed } = action.payload;
            const newTasks = [...actionItems];
            if (newTasks[taskId]) {
              newTasks[taskId].completed = completed;
              setActionItems(newTasks);
              await updateActionItemStatus(currentDocId, newTasks);
            }
          }
          if (action.type === 'DELETE_MEETINGS') {
            setPendingAction(action);
          }
        }
      }
    } catch (err) {
      alert("Agent Action Error: " + err.message);
    } finally {
      setChatLoading(false);
      setChatQuery('');
    }
  };

  const handleConfirmAction = async () => {
    if (!pendingAction) return;
    try {
      if (pendingAction.type === 'DELETE_MEETINGS') {
        await deleteMeetings(pendingAction.payload);
        if (pendingAction.payload.includes(currentDocId)) {
          setSummary('');
          setActionItems([]);
          setTitle('');
          setCurrentDocId(null);
        }
      }
      setPendingAction(null);
    } catch (err) {
      alert("Execution Error: " + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-12">
          <div className="flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-blue-500" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
              MeetingPro
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-sm font-medium text-slate-200">{user?.displayName || 'User'}</span>
              <span className="text-xs text-slate-500">{user?.email}</span>
            </div>
            <button
              onClick={logout}
              className="p-2 hover:bg-slate-800 rounded-full border border-slate-800 text-slate-400 hover:text-red-400 transition-all"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
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
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="bg-slate-900/50 backdrop-blur-sm p-6 rounded-2xl border border-slate-800 relative group">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-white mb-1">{title}</h2>
                      <h3 className="text-blue-400 font-bold uppercase tracking-wider text-[10px]">Executive Summary</h3>
                    </div>
                    <button 
                      onClick={handleCopyMarkdown}
                      className="flex items-center gap-2 text-xs text-slate-500 hover:text-white transition-colors"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Copied!' : 'Copy Markdown'}
                    </button>
                  </div>
                  <div className="prose prose-invert max-w-none text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {summary}
                  </div>
                </div>

                {actionItems.length > 0 && (
                  <div className="bg-emerald-900/10 backdrop-blur-sm p-6 rounded-2xl border border-emerald-500/20">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <ClipboardCheck className="w-5 h-5 text-emerald-500" />
                        <h3 className="text-emerald-400 font-bold uppercase tracking-wider text-xs">Action Items</h3>
                      </div>
                      <button 
                        onClick={() => setMyTasksOnly(!myTasksOnly)}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold transition-all border ${myTasksOnly ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-slate-900 text-slate-400 border-slate-800'}`}
                      >
                        <Filter className="w-3 h-3" />
                        {myTasksOnly ? 'My Tasks Only' : 'All Tasks'}
                      </button>
                    </div>
                    <ul className="space-y-4">
                      {actionItems
                        .filter(item => !myTasksOnly || (item.assignee?.toLowerCase().includes('me') || item.assignee?.toLowerCase().includes(user?.displayName?.toLowerCase() || '')))
                        .map((item, index) => (
                        <li 
                          key={index} 
                          onClick={() => handleToggleTask(index)}
                          className="flex items-start gap-4 text-slate-300 text-sm group cursor-pointer p-2 hover:bg-white/5 rounded-xl transition-all"
                        >
                          <button className="mt-1 shrink-0 transition-transform active:scale-90">
                            {item.completed ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            ) : (
                              <Circle className="w-5 h-5 text-slate-700 group-hover:text-slate-500" />
                            )}
                          </button>
                          <div className="flex-1">
                            <p className={`transition-all duration-300 ${item.completed ? 'line-through text-slate-600' : 'text-slate-200'}`}>
                              {item.text}
                            </p>
                            <div className="flex gap-4 mt-2">
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                                <User className="w-3 h-3" />
                                {item.assignee || 'Unassigned'}
                              </div>
                              <div className={`flex items-center gap-1.5 text-[10px] ${item.deadline !== 'No deadline' && !item.completed ? 'text-amber-500 font-medium' : 'text-slate-500'}`}>
                                <Calendar className="w-3 h-3" />
                                {item.deadline || 'No deadline'}
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* AI Intelligence Assistant Section */}
            <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-6">
                <BrainCircuit className="w-5 h-5 text-indigo-400" />
                <h2 className="text-xl font-semibold text-white">Meeting Intelligence</h2>
              </div>
              
              <div className="space-y-4">
                <div className="min-h-[120px] bg-slate-950/50 rounded-xl border border-slate-800 p-4 text-sm text-slate-400 leading-relaxed overflow-y-auto max-h-64">
                  {chatLoading ? (
                    <div className="flex items-center gap-2 text-indigo-400">
                      <Bot className="w-4 h-4 animate-pulse" />
                      <span>Agent is thinking...</span>
                    </div>
                  ) : chatResponse ? (
                    <div className="prose prose-invert max-w-none text-slate-300 whitespace-pre-wrap">
                      {chatResponse}
                    </div>
                  ) : (
                    <p className="italic">Ask the agent about this meeting or past records. (e.g. "What did we decide about the budget?" or "Compare this meeting to the last one.")</p>
                  )}
                </div>

                {pendingAction && (
                  <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl animate-in zoom-in-95 duration-200">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-red-500/20 rounded-lg">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">Confirm Deletion</h4>
                        <p className="text-[10px] text-red-400">The agent is requesting to delete {pendingAction.payload.length} record(s).</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={handleConfirmAction}
                        className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Confirm Delete
                      </button>
                      <button 
                        onClick={() => setPendingAction(null)}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-all flex items-center justify-center gap-2"
                      >
                        <X className="w-3.5 h-3.5" />
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <form onSubmit={handleAskAgent} className="flex gap-2">
                  <input
                    value={chatQuery}
                    onChange={(e) => setChatQuery(e.target.value)}
                    placeholder="Ask the Agent anything..."
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                  <button
                    type="submit"
                    disabled={chatLoading || !chatQuery.trim()}
                    className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl transition-all"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-6 px-2">
              <div className="flex items-center gap-2">
                <HistoryIcon className="w-5 h-5 text-slate-500" />
                <h2 className="text-xl font-semibold text-white">History</h2>
              </div>
              <span className="text-xs bg-slate-800 text-slate-500 px-2 py-1 rounded-md">
                {history.length} Sessions
              </span>
            </div>
            <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-250px)] pr-2 custom-scrollbar">
              {historyLoading && (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-slate-500">Loading history...</span>
                </div>
              )}
              {historyError && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs leading-relaxed">
                  <p className="font-bold mb-1">Failed to load history:</p>
                  {historyError}
                </div>
              )}
              {!historyLoading && !historyError && history.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-2xl text-slate-600">
                  No meetings summarized yet
                </div>
              )}
              {history.map((item) => (
                <div 
                  key={item.id} 
                  onClick={() => {
                    setSummary(item.summary);
                    setActionItems(item.actionItems || []);
                    setTitle(item.title || "Untitled Meeting");
                    setCurrentDocId(item.id);
                  }}
                  className={`bg-slate-900/40 p-5 rounded-xl border transition-all cursor-pointer hover:scale-[1.02] active:scale-95 ${currentDocId === item.id ? 'border-blue-500/50 bg-blue-500/5' : 'border-slate-800 hover:border-slate-700'}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-sm font-bold text-white truncate max-w-[150px]">{item.title || "Untitled"}</h4>
                    <span className="text-[10px] text-slate-500">
                      {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString() : 'Just now'}
                    </span>
                  </div>
                  <p className="text-slate-300 line-clamp-2 text-[11px] leading-relaxed mb-3">
                    {item.summary}
                  </p>
                  {item.actionItems?.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        {item.actionItems.filter(t => typeof t === 'object' && t.completed).length}/{item.actionItems.length} Done
                      </span>
                    </div>
                  )}
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
