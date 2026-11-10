import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Heart, Flame, Trophy, HelpCircle, CheckCircle2,
  XCircle, RotateCcw, Sparkles, Clock, Bug, Zap,
  ChevronRight, AlertCircle, Award
} from "lucide-react";
import {
  startBugHuntGame,
  submitBugHuntAnswer,
  getBugHuntHint,
  getGameLeaderboard
} from "../api/client";
import { PageHeader, Card, PrimaryButton } from "../components/UI";

const FALLBACK_BUGS = [
  {
    snippet: "def calculate_average(nums):\n    total = sum(nums)\n    return total / len(nums)\n\nprint(calculate_average([]))",
    buggy_line: 3,
    bug_type: "logic",
    explanation: "ZeroDivisionError occurs when len(nums) is 0 on an empty list.",
    hint: "What happens when an empty list is passed?",
    topic: "Functions",
  },
  {
    snippet: "fruits = [\"apple\", \"banana\", \"cherry\"]\nfor i in range(len(fruits) + 1):\n    print(fruits[i])",
    buggy_line: 3,
    bug_type: "index_error",
    explanation: "range(len(fruits) + 1) generates indices up to 3, but the maximum index is 2.",
    hint: "Check the upper bound of the loop.",
    topic: "Lists",
  },
  {
    snippet: "user_info = {\"name\": \"Aria\", \"role\": \"student\"}\nprint(\"Level: \" + user_info[\"level\"])",
    buggy_line: 2,
    bug_type: "key_error",
    explanation: "Key 'level' does not exist in user_info dictionary.",
    hint: "Check dictionary keys for membership before direct indexing.",
    topic: "Dictionaries",
  }
];

export default function Games() {
  const [searchParams] = useSearchParams();
  const initialTopic = searchParams.get("topic") || null;

  // Game state
  const [sessionId, setSessionId] = useState(null);
  const [roundNumber, setRoundNumber] = useState(1);
  const [snippet, setSnippet] = useState("");
  const [currentTopic, setCurrentTopic] = useState(initialTopic || "Python");
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [personalBest, setPersonalBest] = useState(0);
  const [allowedBugTypes, setAllowedBugTypes] = useState([
    "syntax", "logic", "off-by-one", "type_error",
    "name_error", "index_error", "key_error", "wrong_output"
  ]);

  // Round selection state
  const [selectedLine, setSelectedLine] = useState(null);
  const [selectedBugType, setSelectedBugType] = useState("");
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [hint, setHint] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [roundResult, setRoundResult] = useState(null);
  const [gameOver, setGameOver] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [activeTab, setActiveTab] = useState("arena"); // arena | leaderboard
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [masterReaction, setMasterReaction] = useState(
    "Welcome to the Arena, Hunter! Spot the faulty line and name its bug before time runs out."
  );

  const timerRef = useRef(null);

  // Start timer on new round
  useEffect(() => {
    if (!gameOver && !roundResult && snippet) {
      setTimerSeconds(0);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [roundNumber, roundResult, gameOver, snippet]);

  // Fetch leaderboard on mount
  useEffect(() => {
    loadLeaderboard();
    startNewGame(initialTopic);
  }, [initialTopic]);

  async function loadLeaderboard() {
    try {
      const data = await getGameLeaderboard(8);
      if (Array.isArray(data)) {
        setLeaderboard(data);
      }
    } catch {
      // ignore
    }
  }

  async function startNewGame(topic = null) {
    setLoading(true);
    setGameOver(false);
    setRoundResult(null);
    setHint(null);
    setSelectedLine(null);
    setSelectedBugType("");
    setMasterReaction("New challenge dispatched. Analyze the syntax and logic carefully!");

    try {
      const data = await startBugHuntGame(topic);
      setSessionId(data.session_id);
      setRoundNumber(data.round_number);
      setSnippet(data.snippet);
      setCurrentTopic(data.topic);
      setLives(data.lives);
      setScore(data.score);
      setStreak(data.streak);
      setPersonalBest(data.personal_best);
      if (data.allowed_bug_types) setAllowedBugTypes(data.allowed_bug_types);
      setIsOfflineMode(false);
    } catch (err) {
      console.warn("Backend offline, using fallback bugs for Bug Hunt:", err);
      // Fallback offline mode
      setIsOfflineMode(true);
      const fallback = FALLBACK_BUGS[0];
      setSessionId(`offline_${Date.now()}`);
      setRoundNumber(1);
      setSnippet(fallback.snippet);
      setCurrentTopic(fallback.topic);
      setLives(3);
      setScore(0);
      setStreak(0);
    } finally {
      setLoading(false);
    }
  }

  async function handleHint() {
    if (score < 25) {
      setMasterReaction("Game Master: You need at least 25 points to consult my codex!");
      return;
    }
    try {
      if (isOfflineMode) {
        setHint("Look closely at the data types or lengths involved.");
        setScore(prev => Math.max(0, prev - 25));
        return;
      }
      const data = await getBugHuntHint(sessionId);
      setHint(data.hint);
      setScore(data.score);
      setMasterReaction("Game Master: Here is a clue from the compiler realm...");
    } catch (err) {
      console.error("Hint error:", err);
    }
  }

  async function handleSubmitAnswer() {
    if (selectedLine === null || !selectedBugType) return;
    setSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);

    if (isOfflineMode) {
      // Local fallback grading
      const bug = FALLBACK_BUGS[(roundNumber - 1) % FALLBACK_BUGS.length];
      const lineCorrect = selectedLine === bug.buggy_line;
      const typeCorrect = selectedBugType.toLowerCase() === bug.bug_type.toLowerCase();
      const points = lineCorrect ? (100 + (typeCorrect ? 50 : 0)) : 0;
      const nextLives = lineCorrect ? lives : lives - 1;
      const nextScore = score + points;
      const nextStreak = lineCorrect ? streak + 1 : 0;

      setRoundResult({
        was_line_correct: lineCorrect,
        was_type_correct: typeCorrect,
        correct_line: bug.buggy_line,
        correct_bug_type: bug.bug_type,
        points_awarded: points,
        current_score: nextScore,
        lives_remaining: nextLives,
        streak: nextStreak,
        explanation: bug.explanation,
        game_over: nextLives <= 0
      });
      setScore(nextScore);
      setLives(nextLives);
      setStreak(nextStreak);
      if (nextLives <= 0) setGameOver(true);
      setSubmitting(false);
      return;
    }

    try {
      const data = await submitBugHuntAnswer({
        sessionId,
        selectedLine,
        selectedBugType,
        timeTakenSeconds: timerSeconds
      });

      setRoundResult(data);
      setScore(data.current_score);
      setLives(data.lives_remaining);
      setStreak(data.streak);
      if (data.reaction) setMasterReaction(data.reaction);

      if (data.game_over) {
        setGameOver(true);
        if (data.personal_best) setPersonalBest(data.personal_best);
        loadLeaderboard();
      }
    } catch (err) {
      console.error("Submit bug answer error:", err);
    } finally {
      setSubmitting(false);
    }
  }

  function handleNextRound() {
    if (!roundResult) return;
    if (roundResult.next_round) {
      const next = roundResult.next_round;
      setRoundNumber(next.round_number);
      setSnippet(next.snippet);
      setCurrentTopic(next.topic);
      setLives(next.lives);
      setScore(next.score);
      setStreak(next.streak);
    } else {
      // offline fallback advancement
      const nextBug = FALLBACK_BUGS[roundNumber % FALLBACK_BUGS.length];
      setRoundNumber(prev => prev + 1);
      setSnippet(nextBug.snippet);
      setCurrentTopic(nextBug.topic);
    }
    setRoundResult(null);
    setHint(null);
    setSelectedLine(null);
    setSelectedBugType("");
  }

  const lines = snippet ? snippet.split("\n") : [];
  const streakMultiplier = Math.min(2.0, (1.0 + streak * 0.1)).toFixed(1);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <PageHeader
          eyebrow="INTERACTIVE CODE DETECTIVE"
          title="Bug Hunt Arena"
          description="Hunt down syntax anomalies and logical flaws in real code. Keep your streak alive to maximize score!"
        />
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("arena")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              activeTab === "arena"
                ? "bg-indigo-600 text-white"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            <Bug className="w-4 h-4 inline mr-1" /> Arena
          </button>
          <button
            onClick={() => setActiveTab("leaderboard")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              activeTab === "leaderboard"
                ? "bg-amber-600 text-white"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            <Trophy className="w-4 h-4 inline mr-1" /> Leaderboard
          </button>
        </div>
      </div>

      {isOfflineMode && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs px-4 py-2 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>Local backend offline. Running in offline standalone arcade mode with built-in bug challenges.</span>
        </div>
      )}

      {activeTab === "arena" ? (
        <div className="space-y-6">
          {/* Top HUD: Lives, Score, Streak, Multiplier, Timer */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Lives */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
              <div className="flex gap-1">
                {[1, 2, 3].map(heartIdx => (
                  <Heart
                    key={heartIdx}
                    className={`w-6 h-6 transition-all ${
                      heartIdx <= lives
                        ? "text-red-500 fill-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                        : "text-slate-700 fill-slate-800"
                    }`}
                  />
                ))}
              </div>
              <div>
                <div className="text-xs text-slate-400">Integrity</div>
                <div className="text-sm font-bold text-slate-200">{lives} / 3 Lives</div>
              </div>
            </div>

            {/* Score */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-400">Score (Best: {personalBest})</div>
                <div className="text-lg font-black text-amber-300">{score.toLocaleString()} pts</div>
              </div>
            </div>

            {/* Streak & Multiplier */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg text-orange-400">
                <Flame className={`w-5 h-5 ${streak > 0 ? "animate-pulse" : ""}`} />
              </div>
              <div>
                <div className="text-xs text-slate-400">Streak Multiplier</div>
                <div className="text-sm font-bold text-orange-300">
                  {streak} in a row <span className="text-xs text-orange-400">({streakMultiplier}x)</span>
                </div>
              </div>
            </div>

            {/* Timer */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
              <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-400">Elapsed Time</div>
                <div className="text-sm font-bold text-cyan-300">
                  {timerSeconds}s
                  {timerSeconds <= 15 && !roundResult && !gameOver && (
                    <span className="ml-1 text-[10px] bg-cyan-500/20 text-cyan-300 px-1 rounded">Fast Bonus!</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Game Master Reaction Box */}
          <div className="bg-gradient-to-r from-indigo-950/60 to-purple-950/40 border border-indigo-500/30 rounded-xl p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-600/30 border border-indigo-400/50 flex items-center justify-center shrink-0 text-indigo-300">
              <Zap className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                Game Master Persona
              </div>
              <p className="text-sm text-slate-200 mt-0.5">{masterReaction}</p>
              {hint && (
                <div className="mt-2 text-xs bg-indigo-900/50 border border-indigo-500/30 p-2.5 rounded text-indigo-200 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <span><strong>Master's Hint:</strong> {hint}</span>
                </div>
              )}
            </div>
            {!hint && !roundResult && !gameOver && (
              <button
                onClick={handleHint}
                className="px-3 py-1.5 text-xs font-medium bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 border border-indigo-700/50 rounded-lg transition shrink-0 flex items-center gap-1"
                title="Deducts 25 points from current round"
              >
                <HelpCircle className="w-3.5 h-3.5" /> Hint (-25 pts)
              </button>
            )}
          </div>

          {/* Arena Codeboard & Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Code Snippet Box with Clickable Lines */}
            <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-inner">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-xs text-slate-400">
                <span className="font-mono">
                  Round #{roundNumber} &bull; Target: <span className="text-indigo-300 font-semibold">{currentTopic}</span>
                </span>
                <span className="text-slate-500">
                  {roundResult ? "Round Finished" : "Click line number to select buggy line"}
                </span>
              </div>

              {loading ? (
                <div className="py-16 text-center text-slate-400">
                  <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-2" />
                  Generating fresh arena challenge...
                </div>
              ) : (
                <div className="font-mono text-sm space-y-1 bg-slate-900/80 p-4 rounded-lg border border-slate-800/80 overflow-x-auto">
                  {lines.map((lineText, idx) => {
                    const lineNum = idx + 1;
                    const isSelected = selectedLine === lineNum;
                    const isCorrectLine = roundResult && roundResult.correct_line === lineNum;
                    const isWrongSelection = roundResult && isSelected && !roundResult.was_line_correct;

                    let bgClass = "hover:bg-slate-800/80 text-slate-300";
                    if (isSelected && !roundResult) {
                      bgClass = "bg-indigo-950/80 border-l-4 border-indigo-400 text-indigo-100 font-semibold";
                    }
                    if (isCorrectLine) {
                      bgClass = "bg-emerald-950/80 border-l-4 border-emerald-400 text-emerald-100 font-semibold";
                    } else if (isWrongSelection) {
                      bgClass = "bg-rose-950/80 border-l-4 border-rose-400 text-rose-100";
                    }

                    return (
                      <div
                        key={lineNum}
                        onClick={() => {
                          if (!roundResult && !gameOver) setSelectedLine(lineNum);
                        }}
                        className={`flex items-start gap-4 px-3 py-1.5 rounded transition cursor-pointer select-none ${bgClass}`}
                      >
                        <span className={`w-6 text-right shrink-0 select-none ${
                          isSelected ? "text-indigo-400 font-bold" : "text-slate-600"
                        }`}>
                          {lineNum}
                        </span>
                        <pre className="m-0 font-mono text-inherit whitespace-pre overflow-x-auto">
                          {lineText || " "}
                        </pre>
                        {isSelected && !roundResult && (
                          <span className="ml-auto text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded uppercase font-sans">
                            Selected
                          </span>
                        )}
                        {isCorrectLine && (
                          <span className="ml-auto text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded uppercase font-sans">
                            Actual Bug
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Answer Controls & Bug Type Selection */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-200 mb-1">Diagnose Bug Type</h3>
                <p className="text-xs text-slate-400 mb-4">
                  Identify which category of bug causes this failure:
                </p>

                <div className="grid grid-cols-2 gap-2">
                  {allowedBugTypes.map(bType => {
                    const isSelected = selectedBugType === bType;
                    const isActual = roundResult && roundResult.correct_bug_type === bType;

                    let btnClass = "bg-slate-800/80 border-slate-700/60 text-slate-300 hover:border-slate-500";
                    if (isSelected && !roundResult) {
                      btnClass = "bg-indigo-600/30 border-indigo-500 text-indigo-200 font-semibold";
                    }
                    if (isActual) {
                      btnClass = "bg-emerald-600/30 border-emerald-500 text-emerald-200 font-bold";
                    }

                    return (
                      <button
                        key={bType}
                        disabled={!!roundResult || gameOver}
                        onClick={() => setSelectedBugType(bType)}
                        className={`px-3 py-2 text-xs border rounded-lg text-left transition capitalize ${btnClass}`}
                      >
                        {bType.replace("_", " ")}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action buttons */}
              {!roundResult && !gameOver ? (
                <div className="space-y-2 pt-4 border-t border-slate-800">
                  <div className="text-xs text-slate-400 flex justify-between">
                    <span>Target: {selectedLine ? `Line #${selectedLine}` : "None"}</span>
                    <span>Type: {selectedBugType ? selectedBugType.replace("_", " ") : "None"}</span>
                  </div>
                  <PrimaryButton
                    onClick={handleSubmitAnswer}
                    disabled={selectedLine === null || !selectedBugType || submitting}
                    style={{ width: "100%" }}
                  >
                    {submitting ? "Analyzing..." : "Confirm Diagnosis"}
                  </PrimaryButton>
                </div>
              ) : roundResult && !gameOver ? (
                <div className="space-y-3 pt-4 border-t border-slate-800">
                  <div className={`p-3 rounded-lg text-xs ${
                    roundResult.was_line_correct
                      ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
                      : "bg-rose-500/10 border border-rose-500/20 text-rose-300"
                  }`}>
                    <div className="font-bold flex items-center gap-1.5 mb-1">
                      {roundResult.was_line_correct ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Bug Spotted! +{roundResult.points_awarded} pts</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 text-rose-400" />
                          <span>Missed! Bug was on Line {roundResult.correct_line}</span>
                        </>
                      )}
                    </div>
                    <p className="text-slate-300">{roundResult.explanation}</p>
                  </div>

                  <PrimaryButton onClick={handleNextRound} style={{ width: "100%" }}>
                    Next Round <ChevronRight className="w-4 h-4 inline ml-1" />
                  </PrimaryButton>
                </div>
              ) : null}
            </div>
          </div>

          {/* Game Over Modal / Card */}
          {gameOver && (
            <div className="bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-rose-500/40 rounded-2xl p-8 text-center max-w-lg mx-auto shadow-2xl">
              <div className="w-16 h-16 bg-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-500/40">
                <Bug className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black text-white">System Overload!</h2>
              <p className="text-sm text-slate-400 mt-1">
                You ran out of lives after clearing {roundNumber - 1} bug rounds.
              </p>

              <div className="grid grid-cols-2 gap-4 my-6">
                <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl">
                  <div className="text-xs text-slate-400">Final Score</div>
                  <div className="text-2xl font-black text-amber-400">{score}</div>
                </div>
                <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl">
                  <div className="text-xs text-slate-400">Personal Best</div>
                  <div className="text-2xl font-black text-slate-200">{personalBest}</div>
                </div>
              </div>

              {score >= personalBest && score > 0 && (
                <div className="mb-6 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-300 text-xs flex items-center justify-center gap-1.5 font-semibold">
                  <Sparkles className="w-4 h-4" /> New High Score Achieved!
                </div>
              )}

              <PrimaryButton onClick={() => startNewGame(currentTopic)} style={{ width: "100%" }}>
                <RotateCcw className="w-4 h-4 inline mr-2" /> Play Again
              </PrimaryButton>
            </div>
          )}
        </div>
      ) : (
        /* Leaderboard Tab */
        <Card title="Top Bug Hunters Leaderboard">
          <p className="text-sm text-slate-400 mb-6">
            Ranked by highest score achieved in Bug Hunt Arena sessions.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs uppercase bg-slate-900/80 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Rank</th>
                  <th className="py-3 px-4">Coder</th>
                  <th className="py-3 px-4">Score</th>
                  <th className="py-3 px-4">Rounds Cleared</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {leaderboard.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-8 text-center text-slate-500">
                      No leaderboard scores recorded yet. Be the first to conquer Bug Hunt!
                    </td>
                  </tr>
                ) : (
                  leaderboard.map(item => (
                    <tr key={item.rank} className="hover:bg-slate-900/50">
                      <td className="py-3 px-4 font-bold">
                        {item.rank === 1 ? (
                          <span className="text-amber-400 flex items-center gap-1">
                            <Award className="w-4 h-4" /> #1
                          </span>
                        ) : item.rank === 2 ? (
                          <span className="text-slate-300">#2</span>
                        ) : item.rank === 3 ? (
                          <span className="text-amber-600">#3</span>
                        ) : (
                          `#${item.rank}`
                        )}
                      </td>
                      <td className="py-3 px-4 font-medium text-white">{item.user_name}</td>
                      <td className="py-3 px-4 font-bold text-amber-300">{item.score.toLocaleString()} pts</td>
                      <td className="py-3 px-4 text-slate-400">{item.rounds_cleared} rounds</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

