# Run Tutor Benchmark Evaluation
param(
    [switch]$Mock
)
if ($Mock) {
    Write-Host "Running evaluation harness with mock LLM (offline verification)..." -ForegroundColor Cyan
    python eval/run_eval.py --mock-llm
} else {
    Write-Host "Running evaluation harness against configured LLM..." -ForegroundColor Cyan
    python eval/run_eval.py
}

