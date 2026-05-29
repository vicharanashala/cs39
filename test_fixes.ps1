$base = "http://localhost:5000/api"

function Get-Json($path) {
    $raw = curl.exe -s "$base/$path"
    if ($raw -eq "" -or $null -eq $raw) { return $null }
    try { return $raw | ConvertFrom-Json } catch { return $raw }
}

function Post-Json($path, $body) {
    $b = $body | ConvertTo-Json -Compress
    $raw = curl.exe -s -X POST "$base/$path" -H "Content-Type: application/json" -d $b
    if ($raw -eq "" -or $null -eq $raw) { return $null }
    try { return $raw | ConvertFrom-Json } catch { return $raw }
}

function Get-Auth($path, $token) {
    $raw = curl.exe -s "$base/$path" -H "Authorization: Bearer $token"
    if ($raw -eq "" -or $null -eq $raw) { return $null }
    try { return $raw | ConvertFrom-Json } catch { return $raw }
}

function Post-Auth($path, $body, $token) {
    $b = $body | ConvertTo-Json -Compress
    $raw = curl.exe -s -X POST "$base/$path" -H "Content-Type: application/json" -H "Authorization: Bearer $token" -d $b
    if ($raw -eq "" -or $null -eq $raw) { return $null }
    try { return $raw | ConvertFrom-Json } catch { return $raw }
}

Write-Host "=== TEST 1: Health ===" -ForegroundColor Cyan
$r = Get-Json "health"
$r | ConvertTo-Json -Depth 3
Write-Host "Status: $($r.status)" -ForegroundColor Green

Write-Host "`n=== TEST 2: Login Priya ===" -ForegroundColor Cyan
$r = Post-Json "auth/login" @{email="priya@iitr.ac.in";password="student123"}
if ($r.token) {
    $script:token = $r.token
    $script:priyaId = $r.user._id
    Write-Host "Token: $($token.Substring(0,30))..." -ForegroundColor Green
    Write-Host "Priya ID: $priyaId" -ForegroundColor Green
} else {
    Write-Host "Login failed: $($r | ConvertTo-Json)" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== TEST 3: Login Admin ===" -ForegroundColor Cyan
$r = Post-Json "auth/login" @{email="admin@iitr.ac.in";password="admin123"}
if ($r.token) {
    $script:adminToken = $r.token
    Write-Host "Admin OK: $($adminToken.Substring(0,25))..." -ForegroundColor Green
} else {
    Write-Host "Admin login failed" -ForegroundColor Red
}

Write-Host "`n=== TEST 4: Thread List (no search) ===" -ForegroundColor Cyan
$r = Get-Json "threads?limit=3"
Write-Host "Got $($r.Count) threads (expect 100+)" -ForegroundColor $(if($r.Count -gt 0){'Green'}else{'Red'})
Write-Host "First thread: $($r[0].title.Substring(0,60))"

Write-Host "`n=== TEST 5: Thread Search (semantic re-ranking - internship) ===" -ForegroundColor Cyan
$r = Get-Json "threads?search=internship"
if ($r.message) {
    Write-Host "ERROR: $($r.message)" -ForegroundColor Red
} else {
    Write-Host "Got $($r.Count) results for 'internship'" -ForegroundColor Green
    if ($r[0]._semScore -ne $null) {
        Write-Host "Top result has _semScore=$($r[0]._semScore): $($r[0].title.Substring(0,60))" -ForegroundColor Green
    } else {
        Write-Host "Top result: $($r[0].title.Substring(0,60)) (no _semScore)" -ForegroundColor Yellow
    }
}

Write-Host "`n=== TEST 6: Thread Search (wifi - should surface specific thread) ===" -ForegroundColor Cyan
$r = Get-Json "threads?search=wifi"
if ($r.message) {
    Write-Host "ERROR: $($r.message)" -ForegroundColor Red
} else {
    Write-Host "Got $($r.Count) results for 'wifi'" -ForegroundColor Green
    $r | ForEach-Object { Write-Host "  - $($_.title.Substring(0,70))" }
}

Write-Host "`n=== TEST 7: Check Duplicate (semantic similarity) ===" -ForegroundColor Cyan
$r = Post-Json "threads/check-duplicate" @{title="When does the internship portal open?"; category="Internship"}
$r | ConvertTo-Json -Depth 4

Write-Host "`n=== TEST 8: SP History Endpoint (NEW) ===" -ForegroundColor Cyan
$r = Get-Auth "profile/$priyaId/sp-history?page=1&limit=5" $token
if ($r.pagination) {
    Write-Host "SP History: $($r.pagination.total) total transactions" -ForegroundColor Green
    Write-Host "Page $($r.pagination.page) of $($r.pagination.pages)" -ForegroundColor Green
    $r.transactions | ForEach-Object {
        Write-Host "  [$($_.type)] $($_.pointsChange) SP - $($_.description)" -ForegroundColor $(if($_.pointsChange -gt 0){'Green'}else{'Yellow'})
    }
} else {
    Write-Host "SP History failed: $($r | ConvertTo-Json)" -ForegroundColor Red
}

Write-Host "`n=== TEST 9: Leaderboard (all-time, real SP) ===" -ForegroundColor Cyan
$r = Get-Auth "leaderboard?filter=all-time" $token
if ($r.leaderboard) {
    Write-Host "Leaderboard entries: $($r.leaderboard.Count)" -ForegroundColor Green
    $r.leaderboard[0..2] | ForEach-Object { Write-Host "  $($_.username): $($_.spPoints) SP (Level $($_.level))" }
} else {
    Write-Host "Leaderboard failed: $($r | ConvertTo-Json)" -ForegroundColor Red
}

Write-Host "`n=== TEST 10: Leaderboard (weekly, real SP) ===" -ForegroundColor Cyan
$r = Get-Auth "leaderboard?filter=weekly" $token
if ($r.leaderboard) {
    Write-Host "Weekly leaderboard entries: $($r.leaderboard.Count)" -ForegroundColor Green
    $r.leaderboard[0..2] | ForEach-Object { Write-Host "  $($_.username): $($_.spPoints) SP this week" }
} else {
    Write-Host "Weekly leaderboard failed: $($r | ConvertTo-Json)" -ForegroundColor Red
}

Write-Host "`n=== TEST 11: Notifications ===" -ForegroundColor Cyan
$r = Get-Auth "notifications" $token
if ($r.notifications) {
    Write-Host "Notifications: $($r.notifications.Count) total, $($r.unreadCount) unread" -ForegroundColor Green
} else {
    Write-Host "Notifications: $($r | ConvertTo-Json)" -ForegroundColor Red
}

Write-Host "`n=== TEST 12: Thread Detail with answers ===" -ForegroundColor Cyan
$r = Get-Json "threads?isOfficial=false&limit=5"
if ($r.Count -gt 0) {
    $tid = $r[0]._id
    $detail = Get-Json "threads/$tid"
    Write-Host "Thread: $($detail.title)" -ForegroundColor Green
    Write-Host "Answers: $($detail.answers.Count)"
}

Write-Host "`n=== TEST 13: Profile (Priya) ===" -ForegroundColor Cyan
$r = Get-Auth "profile/$priyaId" $token
if ($r.user) {
    Write-Host "User: $($r.user.username) | SP: $($r.user.spPoints) | Level: $($r.user.level)" -ForegroundColor Green
    Write-Host "FAQ contributions: $($r.user.faqContributionsCount)"
    Write-Host "Verified answers: $($r.user.verifiedAnswersCount)"
} else {
    Write-Host "Profile failed: $($r | ConvertTo-Json)" -ForegroundColor Red
}

Write-Host "`n=== ALL TESTS COMPLETE ===" -ForegroundColor Green