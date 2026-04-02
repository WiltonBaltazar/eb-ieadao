# Plan: Retroactive Paper Attendance Import

## Context
Attendance was collected on paper before the app was used. The admin needs to:
1. Create sessions for past dates (retroactively)
2. Upload students from a CSV
3. Mark those students present on those sessions
4. Have everything count correctly in student and admin reports

**Two root problems found:**
- Sessions created via UI default to `draft` status. `attendanceRatio()` only counts `open` or `closed` sessions → past sessions **don't count in reports**.
- `bulkEnroll()` hardcodes `enrolled_at = now()`. If sessions happened before today's enrollment date, they fall outside the count window and **don't count for those students**.

`AttendanceService::markPresent()` has **no session status check** — attendance can already be added to any session. The fix is purely about status + enrollment dates.

---

## Fix 1 — Auto-close sessions created for past dates

**File:** `app/Http/Controllers/Admin/StudySessionsController.php` → `store()`

After `$validated = $request->validate(...)`, before `StudySession::create(...)`:

```php
if (Carbon::parse($validated['session_date'])->isBefore(today())) {
    $validated['status'] = StudySessionStatus::Closed;
    $validated['attendance_closed_at'] = now();
}
```

Add imports: `use Carbon\Carbon;` and `use App\Enums\StudySessionStatus;` (already partially present).

Result: past-dated sessions are created as `closed` and immediately count in reports. Future-dated sessions remain `draft` as before.

---

## Fix 2 — Allow backdating enrollment when importing

**File:** `app/Http/Controllers/Admin/EnrollmentsController.php` → `bulkEnroll()`

Add `enrolled_at` as an optional validated field:
```php
'enrolled_at' => 'nullable|date|before_or_equal:today',
```

Use it when creating the enrollment:
```php
'enrolled_at' => $request->filled('enrolled_at')
    ? Carbon::parse($request->enrolled_at)->startOfDay()
    : now(),
```

This is used by the CSV import (Fix 3) to backdate enrollments to the first session date. No frontend change needed for the CSV flow — the import controller calls this logic directly.

---

## Fix 3 — CSV attendance import per session

### Backend

**New method:** `StudySessionsController::importAttendance(Request $request, StudySession $studySession)`

**New route** (add to `routes/web.php` after the existing session routes):
```php
Route::post('/sessoes/{studySession}/importar-presencas', [StudySessionsController::class, 'importAttendance'])
    ->name('admin.sessions.import-attendance');
```

**CSV format** (download a template from the UI):
```
name,phone,grupo_homogeneo
João Silva,841234567,homens
Maria Santos,861234567,mulheres
```
`grupo_homogeneo` is optional.

**Logic per row:**
1. Find user by `phone` → or create new student (role=student, classroom_id = session's classroom)
2. Check enrollment for current academic year + session classroom:
   - If none: create with `enrolled_at = session_date`
   - If exists but `enrolled_at > session_date`: update `enrolled_at = session_date` so this session counts
3. Mark present via `AttendanceService::createAttendance()` with `CheckInMethod::Manual`
4. If duplicate: skip silently, count as skipped
5. Return JSON: `{ imported: N, skipped: N, errors: [...] }`

**Validation:**
```php
$request->validate(['csv' => 'required|file|mimes:csv,txt|max:2048']);
```

Parse with PHP's `fgetcsv`. First row is header. Skip blank rows. Collect errors per row (row number + reason).

### Frontend

**File:** `resources/js/Pages/Admin/SessaoPresencas.tsx`

Add an "Importar CSV" button near the existing "Marcar Presente" actions. On click, open a modal with:
- File input (accept `.csv`)
- Link to download CSV template
- Submit → POST to import route
- Show result: "X presenças importadas, Y já existiam" + error list if any

---

## Implementation Order

1. Fix 1 (auto-close past sessions) — 1 file, ~5 lines
2. Fix 2 (enrollment backdate) — 1 file, ~3 lines
3. Fix 3 backend (`importAttendance` method + route) — ~60 lines
4. Fix 3 frontend (import modal on SessaoPresencas.tsx)

---

## Critical Files

| File | Change |
|------|--------|
| `app/Http/Controllers/Admin/StudySessionsController.php` | Auto-close past sessions + `importAttendance()` |
| `app/Http/Controllers/Admin/EnrollmentsController.php` | Accept `enrolled_at` param |
| `app/Services/AttendanceService.php` | Reuse `createAttendance()` — no changes |
| `routes/web.php` | Add import route |
| `resources/js/Pages/Admin/SessaoPresencas.tsx` | Add import modal |

---

## Verification

1. Create a session with a past date → confirm status is `closed` in DB
2. Upload a CSV with 2–3 names → confirm users created, enrollments backdated, attendances created
3. Student detail page → confirm attendance count includes the imported session
4. Reports page → confirm student appears with correct rate
5. Re-import same CSV → confirm duplicates skipped, no double-entries
