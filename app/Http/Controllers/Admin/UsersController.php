<?php

namespace App\Http\Controllers\Admin;

use App\Enums\GrupoHomogeneo;
use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\Setting;
use App\Models\StudySession;
use App\Models\User;
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

        // Count totals before pagination
        $allSessionIds = (clone $query)->pluck('id');
        $attendanceMap = Attendance::where('student_id', $user->id)
            ->whereIn('study_session_id', $allSessionIds)
            ->get()
            ->keyBy('study_session_id');

        $totalAll = $allSessionIds->count();
        $attendedAll = $attendanceMap->count();
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

    public function bulkDestroy(Request $request): RedirectResponse
    {
        $request->validate(['ids' => 'required|array|min:1', 'ids.*' => 'integer|exists:users,id']);
        User::whereIn('id', $request->ids)->delete();
        return back()->with('success', count($request->ids) . ' utilizador(es) eliminado(s).');
    }
}
