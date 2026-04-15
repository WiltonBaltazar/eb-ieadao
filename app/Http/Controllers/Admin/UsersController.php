<?php

namespace App\Http\Controllers\Admin;

use App\Enums\CheckInMethod;
use App\Enums\GrupoHomogeneo;
use App\Enums\Role;
use App\Enums\StudySessionStatus;
use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\Setting;
use App\Models\StudySession;
use App\Models\User;
use App\Support\ExcelExport;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response;

class UsersController extends Controller
{
    public function index(Request $request): Response
    {
        $query = User::with('classroom');

        if ($request->filled('role')) {
            $query->where('role', $request->role);
        }
        if ($request->filled('classroom_id')) {
            $query->where('classroom_id', $request->classroom_id);
        }
        if ($request->filled('grupo_homogeneo')) {
            $query->where('grupo_homogeneo', $request->grupo_homogeneo);
        }
        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%")
                  ->orWhere('phone', 'like', "%{$request->search}%")
                  ->orWhere('email', 'like', "%{$request->search}%");
            });
        }

        $sortable = ['name', 'email', 'phone', 'role', 'created_at'];
        $sortBy = in_array($request->input('sort_by'), $sortable) ? $request->input('sort_by') : 'name';
        $sortDir = $request->input('sort_dir') === 'desc' ? 'desc' : 'asc';
        $query->orderBy($sortBy, $sortDir);

        $perPage = in_array((int) $request->input('per_page'), [25, 50, 100]) ? (int) $request->input('per_page') : 25;

        $users = $query->paginate($perPage)->withQueryString()->through(fn ($u) => [
            'id'                    => $u->id,
            'name'                  => $u->name,
            'email'                 => $u->email,
            'phone'                 => $u->phone,
            'whatsapp'              => $u->whatsapp,
            'alt_contact'           => $u->alt_contact,
            'role'                  => $u->role->value,
            'role_label'            => $u->role->label(),
            'classroom_id'          => $u->classroom_id,
            'classroom_name'        => $u->classroom?->name,
            'grupo_homogeneo'       => $u->grupo_homogeneo?->value,
            'grupo_homogeneo_label' => $u->grupo_homogeneo?->label(),
            'attendance_rate'       => $u->isStudent() || $u->isTeacher() ? $u->attendanceRatio()['rate'] : null,
        ]);

        return Inertia::render('Admin/Utilizadores', [
            'users' => $users,
            'classrooms' => Classroom::where('is_active', true)->get()->map(fn ($c) => ['id' => $c->id, 'name' => $c->name]),
            'roles' => collect(Role::cases())->map(fn ($r) => ['value' => $r->value, 'label' => $r->label()]),
            'gruposOptions' => collect(GrupoHomogeneo::cases())->map(fn ($g) => ['value' => $g->value, 'label' => $g->label()]),
            'filters' => $request->only(['role', 'classroom_id', 'grupo_homogeneo', 'search', 'sort_by', 'sort_dir', 'per_page']),
        ]);
    }

    public function show(Request $request, User $user): Response
    {
        $user->load('classroom', 'enrollments.classroom');

        // Build enrollment history sorted desc by year
        $enrollmentHistory = $user->enrollments
            ->sortByDesc('academic_year')
            ->groupBy('academic_year')
            ->map(fn ($items, $year) => [
                'year'           => (int) $year,
                'classroom_id'   => $items->whereNull('transferred_at')->first()?->classroom_id
                                    ?? $items->last()?->classroom_id,
                'classroom_name' => $items->whereNull('transferred_at')->first()?->classroom?->name
                                    ?? $items->last()?->classroom?->name,
                'entries'        => $items->map(fn ($e) => [
                    'classroom_name'  => $e->classroom?->name,
                    'enrolled_at'     => $e->enrolled_at?->format('d/m/Y'),
                    'transferred_at'  => $e->transferred_at?->format('d/m/Y'),
                ])->values(),
            ])
            ->values();

        $availableYears = $enrollmentHistory->pluck('year')->sort()->reverse()->values();
        $currentYear = Setting::currentAcademicYear();
        $selectedYear = $request->filled('year') ? (int) $request->year : $currentYear;

        // Determine the classroom to query sessions from (based on selected year enrollment)
        $enrollmentForYear = $user->enrollmentForYear($selectedYear);
        $classroomIdForSessions = $enrollmentForYear?->classroom_id ?? $user->classroom_id;

        $query = StudySession::where('classroom_id', $classroomIdForSessions)
            ->whereIn('status', ['open', 'closed'])
            ->whereYear('session_date', $selectedYear)
            ->with('teacher');

        $fromDate = $enrollmentForYear?->enrolled_at ?? $user->created_at;
        if ($fromDate) {
            $query->where('session_date', '>=', $fromDate->toDateString());
        }

        // All sessions in classroom/year (without date filter) — for counting actual attendances
        $allClassroomIds = StudySession::where('classroom_id', $classroomIdForSessions)
            ->whereIn('status', ['open', 'closed'])
            ->whereYear('session_date', $selectedYear)
            ->pluck('id');

        $attendanceMap = Attendance::where('student_id', $user->id)
            ->whereIn('study_session_id', $allClassroomIds)
            ->get()
            ->keyBy('study_session_id');

        $attendedIds = $attendanceMap->keys();
        $attendedAll = $attendanceMap->count();

        // Sessions from enrollment date onward (for total denominator)
        $requiredIds = (clone $query)->pluck('id');

        // Total = required sessions ∪ any attended before the cutoff (don't hide early attendances)
        $totalAll = $requiredIds->union($attendedIds)->unique()->count();
        $rate = $totalAll > 0 ? round(($attendedAll / $totalAll) * 100) : 0;

        $sortable = ['title', 'session_date'];
        $sortBy = in_array($request->input('sort_by'), $sortable) ? $request->input('sort_by') : 'session_date';
        $sortDir = $request->input('sort_dir') === 'desc' ? 'desc' : 'asc';
        $query->orderBy($sortBy, $sortDir);

        $perPage = in_array((int) $request->input('per_page'), [25, 50, 100]) ? (int) $request->input('per_page') : 25;

        $sessions = $query->paginate($perPage)->withQueryString()->through(function ($s) use ($attendanceMap) {
            $att = $attendanceMap->get($s->id);
            return [
                'id'               => $s->id,
                'title'            => $s->title,
                'session_date'     => $s->session_date->format('d/m/Y'),
                'session_date_iso' => $s->session_date->format('Y-m-d'),
                'teacher_name'     => $s->teacher?->name,
                'attended'         => $att !== null,
                'method'           => $att?->check_in_method->value,
                'method_label'     => $att?->check_in_method->label(),
                'checked_in_at'    => $att?->checked_in_at->format('H:i'),
            ];
        });

        return Inertia::render('Admin/AlunoDetalhe', [
            'student' => [
                'id'                    => $user->id,
                'name'                  => $user->name,
                'phone'                 => $user->phone,
                'alt_contact'           => $user->alt_contact,
                'grupo_homogeneo'       => $user->grupo_homogeneo?->value,
                'grupo_homogeneo_label' => $user->grupo_homogeneo?->label(),
                'classroom_id'          => $user->classroom_id,
                'classroom_name'        => $user->classroom?->name,
                'readiness'             => $user->readiness()->value,
                'readiness_label'       => $user->readinessLabel(),
            ],
            'sessions'          => $sessions,
            'stats'             => ['attended' => $attendedAll, 'total' => $totalAll, 'rate' => $rate],
            'filters'           => $request->only(['sort_by', 'sort_dir', 'per_page', 'year']),
            'enrollmentHistory' => $enrollmentHistory,
            'availableYears'    => $availableYears->isEmpty() ? [$currentYear] : $availableYears->toArray(),
            'selectedYear'      => $selectedYear,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $isStudent = $request->role === 'student';

        $rules = [
            'name' => 'required|string|max:255',
            'role' => 'required|in:admin,teacher,student',
            'phone' => $isStudent ? 'required|string|max:50|unique:users,phone' : 'nullable|string|max:50',
            'whatsapp' => 'nullable|string|max:50',
            'alt_contact' => 'nullable|string|max:255',
            'grupo_homogeneo' => 'nullable|in:' . implode(',', array_column(GrupoHomogeneo::cases(), 'value')),
            'classroom_id' => 'nullable|exists:classrooms,id',
        ];

        if (!$isStudent) {
            $rules['email'] = 'required|email|unique:users,email';
            $rules['password'] = 'required|string|min:8';
        }

        $validated = $request->validate($rules, [
            'name.required' => 'O nome é obrigatório.',
            'email.required' => 'O email é obrigatório.',
            'email.email' => 'O email não é válido.',
            'email.unique' => 'Este email já está registado.',
            'password.required' => 'A password é obrigatória.',
            'password.min' => 'A password deve ter pelo menos 8 caracteres.',
            'phone.required' => 'O número de telefone é obrigatório.',
            'phone.unique' => 'Este número de telefone já está registado.',
            'classroom_id.exists' => 'A turma selecionada não existe.',
        ]);

        if (!$isStudent && isset($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        User::create($validated);

        return back()->with('success', 'Utilizador criado com sucesso.');
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $isStudent = $user->role->value === 'student';

        $rules = [
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:50|unique:users,phone,' . $user->id,
            'whatsapp' => 'nullable|string|max:50',
            'alt_contact' => 'nullable|string|max:255',
            'grupo_homogeneo' => 'nullable|in:' . implode(',', array_column(GrupoHomogeneo::cases(), 'value')),
            'classroom_id' => 'nullable|exists:classrooms,id',
        ];

        if (!$isStudent) {
            $rules['email'] = 'required|email|unique:users,email,' . $user->id;
        }

        $validated = $request->validate($rules, [
            'name.required' => 'O nome é obrigatório.',
            'email.required' => 'O email é obrigatório.',
            'email.email' => 'O email não é válido.',
            'email.unique' => 'Este email já está registado.',
            'phone.unique' => 'Este número de telefone já está registado.',
            'classroom_id.exists' => 'A turma selecionada não existe.',
        ]);

        if ($request->filled('password')) {
            $validated['password'] = Hash::make($request->password);
        }

        $user->update($validated);

        return back()->with('success', 'Utilizador atualizado com sucesso.');
    }

    public function destroy(User $user): RedirectResponse
    {
        $user->delete();
        return back()->with('success', 'Utilizador eliminado.');
    }

    public function updateRole(Request $request, User $user): RedirectResponse
    {
        $request->validate([
            'role' => 'required|in:admin,teacher,student',
        ]);

        $user->update(['role' => $request->role]);
        $label = Role::from($request->role)->label();

        return back()->with('success', "Papel de {$user->name} alterado para {$label}.");
    }

    public function bulkDestroy(Request $request): RedirectResponse
    {
        $request->validate(['ids' => 'required|array|min:1', 'ids.*' => 'integer|exists:users,id']);
        User::whereIn('id', $request->ids)->delete();
        return back()->with('success', count($request->ids) . ' utilizador(es) eliminado(s).');
    }

    public function studentsTemplate(): \Symfony\Component\HttpFoundation\BinaryFileResponse
    {
        return ExcelExport::download('template-alunos.xlsx', function ($sheet) {
            $headers = ['name', 'phone', 'grupo_homogeneo'];
            foreach ($headers as $i => $h) {
                $sheet->setCellValue([$i + 1, 1], $h);
            }
            ExcelExport::styleHeader($sheet, 'A1:C1');
            $sheet->getColumnDimension('A')->setWidth(30);
            $sheet->getColumnDimension('B')->setWidth(18);
            $sheet->getColumnDimension('C')->setWidth(20);

            // Example row
            $sheet->setCellValue('A2', 'João Silva');
            $sheet->setCellValue('B2', '841234567');
            $sheet->setCellValue('C2', 'homens');
            ExcelExport::styleData($sheet, 'A2:C2', true);
        });
    }

    public function importStudents(Request $request): JsonResponse
    {
        $request->validate([
            'xlsx'         => 'required|file|mimes:xlsx,xls|max:5120',
            'classroom_id' => 'required|exists:classrooms,id',
        ]);

        try {
            $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load(
                $request->file('xlsx')->getRealPath()
            );
        } catch (\Exception) {
            return response()->json(['error' => 'Não foi possível ler o ficheiro Excel.'], 422);
        }

        $rows = $spreadsheet->getActiveSheet()->toArray(null, true, true, false);

        if (empty($rows)) {
            return response()->json(['error' => 'Ficheiro Excel vazio.'], 422);
        }

        $header   = array_map(fn($h) => strtolower(trim((string) $h)), $rows[0]);
        $nameIdx  = array_search('name', $header);
        $phoneIdx = array_search('phone', $header);
        $grupoIdx = array_search('grupo_homogeneo', $header);

        if ($nameIdx === false || $phoneIdx === false) {
            return response()->json(['error' => 'O ficheiro deve ter colunas "name" e "phone".'], 422);
        }

        $classroom   = Classroom::findOrFail($request->classroom_id);
        $year        = Setting::currentAcademicYear();
        $created     = 0;
        $skipped     = 0;
        $errors      = [];

        foreach (array_slice($rows, 1) as $i => $line) {
            $rowNum = $i + 2;
            $name   = trim((string) ($line[$nameIdx] ?? ''));
            $phone  = trim((string) ($line[$phoneIdx] ?? ''));

            if ($name === '' && $phone === '') continue;

            if ($name === '') { $errors[] = "Linha {$rowNum}: nome em falta."; continue; }
            if ($phone === '') { $errors[] = "Linha {$rowNum}: telefone em falta."; continue; }

            // Skip if phone already registered
            if (User::where('phone', $phone)->exists()) {
                $skipped++;
                continue;
            }

            $grupo = ($grupoIdx !== false && isset($line[$grupoIdx]))
                ? trim((string) $line[$grupoIdx]) ?: null
                : null;

            $student = User::create([
                'name'            => $name,
                'phone'           => $phone,
                'whatsapp'        => $phone,
                'role'            => 'student',
                'grupo_homogeneo' => $grupo,
                'classroom_id'    => $classroom->id,
                'password'        => null,
            ]);

            Enrollment::create([
                'student_id'     => $student->id,
                'classroom_id'   => $classroom->id,
                'academic_year'  => $year,
                'enrolled_at'    => now(),
                'enrolled_by_id' => auth()->id(),
            ]);

            $created++;
        }

        return response()->json([
            'created' => $created,
            'skipped' => $skipped,
            'errors'  => $errors,
        ]);
    }

    public function importMapaIci(Request $request): JsonResponse
    {
        $request->validate([
            'xlsx'         => 'required|file|mimes:xlsx,xls|max:10240',
            'classroom_id' => 'required|exists:classrooms,id',
        ]);

        try {
            $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load(
                $request->file('xlsx')->getRealPath()
            );
        } catch (\Exception) {
            return response()->json(['error' => 'Não foi possível ler o ficheiro Excel.'], 422);
        }

        $sheet = $spreadsheet->getSheetByName('MAPA GERAL');
        if (!$sheet) {
            return response()->json(['error' => 'Folha "MAPA GERAL" não encontrada no ficheiro.'], 422);
        }

        $rows = $sheet->toArray(null, true, true, false);

        // Row indices (0-based): 6=months, 7=days, 9=header, 10+=students
        $monthRow = $rows[6] ?? [];
        $dayRow   = $rows[7] ?? [];

        // Build month abbreviation → number map
        $monthMap = [
            'JAN'=>1,'FEV'=>2,'MAR'=>3,'ABR'=>4,'MAI'=>5,'JUN'=>6,
            'JUL'=>7,'AGO'=>8,'SET'=>9,'OUT'=>10,'NOV'=>11,'DEZ'=>12,
        ];

        // Build column index → Carbon date for date columns (starting at index 6)
        $colDates   = [];
        $currentMonth = null;
        $year = 2026; // ICI course started Mar.26
        for ($ci = 6; $ci < count($monthRow); $ci++) {
            $label = strtoupper(trim((string)($monthRow[$ci] ?? '')));
            if (isset($monthMap[$label])) {
                $currentMonth = $monthMap[$label];
            }
            $day = $dayRow[$ci] ?? null;
            if ($currentMonth && is_numeric($day) && $day > 0) {
                $colDates[$ci] = Carbon::create($year, $currentMonth, (int)$day);
            }
        }

        // Identify active columns (at least one P or F in student rows)
        $studentRows = array_slice($rows, 10);
        $activeCols = [];
        foreach ($studentRows as $row) {
            $ord = $row[0] ?? null;
            if (!is_numeric($ord) || (int)$ord <= 0) continue;
            foreach ($colDates as $ci => $date) {
                $val = strtoupper(trim((string)($row[$ci] ?? '')));
                if ($val === 'P' || $val === 'F') {
                    $activeCols[$ci] = true;
                }
            }
        }
        ksort($activeCols);

        $classroom = Classroom::findOrFail($request->classroom_id);
        $year      = Setting::currentAcademicYear();

        // Create study sessions for active columns
        $sessionMap      = [];
        $sessionsCreated = 0;
        $lessonNum       = 1;
        foreach (array_keys($activeCols) as $ci) {
            $date = $colDates[$ci] ?? now()->toDateString();
            [$session, $wasCreated] = [
                StudySession::firstOrCreate(
                    ['classroom_id' => $classroom->id, 'title' => "Aula {$lessonNum}"],
                    [
                        'session_date'         => $date,
                        'status'               => StudySessionStatus::Closed,
                        'attendance_closed_at' => now(),
                    ]
                ),
                false,
            ];
            // Check if it was just created
            if ($session->wasRecentlyCreated) {
                $sessionsCreated++;
            }
            $sessionMap[$ci] = $session;
            $lessonNum++;
        }

        // GH code → grupo_homogeneo DB value
        $ghMap = [];
        foreach (GrupoHomogeneo::cases() as $case) {
            $ghMap[$case->short()] = $case->value;
        }

        $studentsCreated    = 0;
        $studentsUpdated    = 0;
        $attendancesCreated = 0;
        $skipped            = 0;
        $errors             = [];

        // Seed placeholder counter from the highest existing placeholder phone
        $lastPlaceholder = User::where('phone', 'like', '880000000%')
            ->orderByDesc('phone')
            ->value('phone');
        $placeholderCounter = $lastPlaceholder
            ? ((int) substr($lastPlaceholder, 9)) + 1
            : 1;

        foreach ($studentRows as $i => $row) {
            $rowNum = $i + 11;

            $ord = $row[0] ?? null;
            if (!is_numeric($ord) || (int)$ord <= 0) continue;

            $name = trim((string)($row[1] ?? ''));
            if ($name === '') {
                $errors[] = "Linha {$rowNum}: nome em falta.";
                continue;
            }

            // Prefer WA (col 3) over CONTACTO (col 2)
            $rawWa       = trim((string)($row[3] ?? ''));
            $rawPhone    = trim((string)($row[2] ?? ''));
            $waDigits    = preg_replace('/\D/', '', $rawWa);
            $phoneDigits = preg_replace('/\D/', '', $rawPhone);

            $phone    = $waDigits !== '' ? $waDigits : $phoneDigits;
            $whatsapp = $waDigits !== '' ? $waDigits : null;

            // No contact: assign placeholder (can be updated later)
            if ($phone === '' || strlen($phone) < 5) {
                do {
                    $candidate = '880000000' . $placeholderCounter++;
                } while (User::where('phone', $candidate)->exists());
                $phone    = $candidate;
                $whatsapp = null;
            }

            $ghCode = strtoupper(trim((string)($row[5] ?? '')));
            $grupo  = $ghMap[$ghCode] ?? null;
            $email  = trim((string)($row[4] ?? '')) ?: null;

            // Determine enrollment date = date of student's first P in the file
            $firstPDate = null;
            foreach ($sessionMap as $ci => $session) {
                $val = strtoupper(trim((string)($row[$ci] ?? '')));
                if ($val === 'P') {
                    if ($firstPDate === null || $session->session_date->lt($firstPDate)) {
                        $firstPDate = $session->session_date->copy();
                    }
                }
            }
            // Fallback: use the first session date in the map
            if ($firstPDate === null && !empty($sessionMap)) {
                $firstPDate = collect($sessionMap)->sortBy(fn ($s) => $s->session_date)->first()?->session_date->copy();
            }
            $enrolledAt = $firstPDate ?? now();

            $existing = User::where('phone', $phone)->first();

            if ($existing) {
                $existing->update([
                    'name'            => $name,
                    'whatsapp'        => $whatsapp ?? $existing->whatsapp,
                    'grupo_homogeneo' => $grupo ?? $existing->grupo_homogeneo?->value,
                    'classroom_id'    => $classroom->id,
                ]);
                $student = $existing;
                $studentsUpdated++;

                // Ensure enrollment exists; update enrolled_at if earlier than current
                $enrollment = Enrollment::where('student_id', $student->id)
                    ->where('classroom_id', $classroom->id)
                    ->where('academic_year', $year)
                    ->first();

                if (!$enrollment) {
                    Enrollment::create([
                        'student_id'     => $student->id,
                        'classroom_id'   => $classroom->id,
                        'academic_year'  => $year,
                        'enrolled_at'    => $enrolledAt,
                        'enrolled_by_id' => auth()->id(),
                    ]);
                } elseif ($enrollment->enrolled_at === null || $enrolledAt->lt($enrollment->enrolled_at)) {
                    $enrollment->update(['enrolled_at' => $enrolledAt]);
                }
            } else {
                $student = User::create([
                    'name'            => $name,
                    'phone'           => $phone,
                    'whatsapp'        => $whatsapp,
                    'email'           => $email,
                    'role'            => 'student',
                    'grupo_homogeneo' => $grupo,
                    'classroom_id'    => $classroom->id,
                    'password'        => null,
                ]);

                Enrollment::create([
                    'student_id'     => $student->id,
                    'classroom_id'   => $classroom->id,
                    'academic_year'  => $year,
                    'enrolled_at'    => $enrolledAt,
                    'enrolled_by_id' => auth()->id(),
                ]);

                $studentsCreated++;
            }

            // Import attendance: P = create record, F = no record (counted as missed via ratio)
            foreach ($sessionMap as $ci => $session) {
                $val = strtoupper(trim((string)($row[$ci] ?? '')));
                if ($val === 'P') {
                    $att = Attendance::firstOrCreate(
                        ['study_session_id' => $session->id, 'student_id' => $student->id],
                        [
                            'check_in_method' => CheckInMethod::Manual,
                            'checked_in_at'   => $session->session_date,
                            'marked_by_id'    => auth()->id(),
                        ]
                    );
                    if ($att->wasRecentlyCreated) {
                        $attendancesCreated++;
                    }
                }
            }
        }

        return response()->json([
            'students_created'    => $studentsCreated,
            'students_updated'    => $studentsUpdated,
            'sessions_created'    => $sessionsCreated,
            'attendances_created' => $attendancesCreated,
            'skipped'             => $skipped,
            'errors'              => $errors,
        ]);
    }
}
