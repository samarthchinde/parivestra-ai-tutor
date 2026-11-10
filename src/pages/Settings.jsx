import { useState, useEffect } from "react";
import { PageHeader, Card, PrimaryButton } from "../components/UI";
import { getAdminKey, setAdminKey, getUserId } from "../api/client";
import { ShieldCheck, ShieldAlert, KeyRound, User, Check, RefreshCw } from "lucide-react";

export default function Settings() {
  const [adminKeyInput, setAdminKeyInput] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [currentAdminKey, setCurrentAdminKey] = useState("");
  const [userId, setUserId] = useState("");

  useEffect(() => {
    const key = getAdminKey();
    setCurrentAdminKey(key);
    setAdminKeyInput(key);
    setUserId(getUserId());
  }, []);

  function handleSaveAdminKey(e) {
    e.preventDefault();
    setAdminKey(adminKeyInput);
    setCurrentAdminKey(adminKeyInput.trim());
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  }

  function handleClearAdminKey() {
    setAdminKey("");
    setAdminKeyInput("");
    setCurrentAdminKey("");
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  }

  const isAdmin = !!currentAdminKey;

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        eyebrow="CONFIGURATION & ACCESS"
        title="Settings"
        description="Configure your student identity, institute admin credentials, and learning parameters."
      />

      {/* Admin Privileges Section */}
      <Card title="Institute Faculty & Admin Access">
        <p className="text-sm text-slate-400 mb-4">
          Institute administrators and faculty members can enter their secret admin key here.
          Admin mode grants privileges to upload, approve, index, and manage curriculum resources.
        </p>

        <div className="flex items-center gap-3 p-3.5 mb-6 rounded-xl border bg-slate-900/60 transition-all border-slate-800">
          {isAdmin ? (
            <>
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-emerald-300">Admin Mode Active</div>
                <div className="text-xs text-slate-400">
                  Full access granted to upload, approve, index, and delete library resources.
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="p-2 bg-slate-800 text-slate-400 rounded-lg">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-slate-300">Student Mode (Read-Only)</div>
                <div className="text-xs text-slate-500">
                  Enter your institute's admin access key below to unlock faculty resource controls.
                </div>
              </div>
            </>
          )}
        </div>

        <form onSubmit={handleSaveAdminKey} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Admin Access Key (X-Admin-Key)
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3 top-3.5 text-slate-500" />
              <input
                type="password"
                value={adminKeyInput}
                onChange={(e) => setAdminKeyInput(e.target.value)}
                placeholder="Enter secret admin key (e.g. parivestra_admin_secret)"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition font-mono"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Default local key: <code className="text-indigo-400 font-mono">parivestra_admin_secret</code> (matches <code className="text-slate-400">ADMIN_KEY</code> in <code className="text-slate-400">.env</code>).
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <PrimaryButton type="submit">
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4 inline mr-1" /> Saved!
                </>
              ) : (
                "Save Admin Key"
              )}
            </PrimaryButton>
            {isAdmin && (
              <button
                type="button"
                onClick={handleClearAdminKey}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
              >
                Switch to Student Mode
              </button>
            )}
          </div>
        </form>
      </Card>

      {/* Student Identity */}
      <Card title="Student Session Identity">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 rounded-full flex items-center justify-center font-bold">
            <User className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-200">Session ID</div>
            <div className="text-xs font-mono text-slate-400 mt-0.5">{userId}</div>
            <div className="text-[11px] text-slate-500 mt-1">
              Sent in <code className="text-slate-400">X-User-Id</code> header to maintain your mastery scores, game streaks, and progress.
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
