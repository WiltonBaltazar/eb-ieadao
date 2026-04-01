<?php

namespace App\Http\Controllers\Admin;

use App\Enums\GrupoHomogeneo;
use App\Http\Controllers\Controller;
use App\Models\Classroom;
use App\Models\Setting;
use App\Models\StudySession;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ClassroomsController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Classroom::with('teachers')->withCount('students');

        if ($request->filled('search')) {
            $query->where('name', 'like', "%{$request->search}%");
        }
        if ($request->filled('status')) {
            $query->where('is_active', $request->status === 'active');
        }

        $sortable = ['name', 'meeting_day', 'students_count', 'is_active'];
        $sortBy = in_array($request->input('sort_by'), $sortable) ? $request->input('sort_by') : 'name';
        $sortDir = $request->input('sort_dir') === 'desc' ? 'desc' : 'asc';
        $query->orderBy($sortBy, $sortDir);

        $perPage = in_array((int) $request->input('per_page'), [25, 50, 100]) ? (int) $request->input('per_page') : 25;

        $classrooms = $query->paginate($perPage)->withQueryString()->through(fn ($c) => [
            'id'             => $c->id,
            'name'           => $c->name,
            'description'    => $c->description,
            'teacher_ids'    => $c->teachers->pluck('id'),
            'teacher_names'  => $c->teachers->pluck('name'),
            'meeting_day'    => $c->meeting_day,
            'meeting_time'   => $c->meeting_time,
            'is_active'      => $c->is_active,
            'students_count' => $c->students_count,
        ]);

        $teachers = User::whereIn('role', ['admin', 'teacher'])
            ->get()
            ->map(fn ($u) => ['id' => $u->id, 'name' => $u->name]);

        return Inertia::render('Admin/Turmas', [
            'classrooms' => $classrooms,
            'teachers'   => $teachers,
            'filters'    => $request->only(['search', 'status', 'sort_by', 'sort_dir', 'per_page']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name'           => 'required|string|max:255',
            'description'    => 'nullable|string',
            'teacher_ids'    => 'nullable|array',
            'teacher_ids.*'  => 'exists:users,id',
            'meeting_day'    => 'nullable|string|max:20',
            'meeting_time'   => 'nullable|string',
            'is_active'      => 'boolean',
        ], [
            'name.required' => 'O nome da turma é obrigatório.',
        ]);

        $classroom = Classroom::create($validated);

        if (!empty($validated['teacher_ids'])) {
            $classroom->teachers()->sync($validated['teacher_ids']);
        }

        return back()->with('success', 'Turma criada com sucesso.');
    }

    public function update(Request $request, Classroom $classroom): RedirectResponse
    {
        $validated = $request->validate([
            'name'           => 'required|string|max:255',
            'description'    => 'nullable|string',
            'teacher_ids'    => 'nullable|array',
            'teacher_ids.*'  => 'exists:users,id',
            'meeting_day'    => 'nullable|string|max:20',
            'meeting_time'   => 'nullable|string',
            'is_active'      => 'boolean',
        ]);

        $classroom->update($validated);
        $classroom->teachers()->sync($validated['teacher_ids'] ?? []);

        return back()->with('success', 'Turma atualizada com sucesso.');
    }

    public function destroy(Classroom $classroom): RedirectResponse
    {
        $classroom->delete();
        return back()->with('success', 'Turma eliminada.');
    }

    public function bulkDestroy(Request $request): RedirectResponse
    {
        $request->validate(['ids' => 'required|array|min:1', 'ids.*' => 'integer|exists:classrooms,id']);
        Classroom::whereIn('id', $request->ids)->delete();
        return back()->with('success', count($request->ids) . ' turma(s) eliminada(s).');
    }

    public function students(Request $request, Classroom $classroom): Response
    {
        $classroom->load('teachers');

        $currentYear = Setting::currentAcademicYear();
        $year = $request->filled('year') ? (int) $request->year : $currentYear;

        // Collect all years that have enrollments for this classroom
        $availableYears = \App\Models\Enrollment::where('classroom_id', $classroom->id)
            ->distinct()
            ->orderByDesc('academic_year')
            ->pluck('academic_year')
            ->map(fn ($y) => (int) $y)
            ->values();

        if ($availableYears->isEmpty()) {
            $availableYears = collect([$currentYear]);
        }

        $yearSessions = StudySession::where('classroom_id', $classroom->id)
            ->whereIn('status', ['open', 'closed'])
            ->whereYear('session_date', $year)
            ->orderBy('session_date')
            ->get(['id', 'session_date']);

        $yearSessionIds = $yearSessions->pluck('id');
        $totalSessions = $yearSessions->count();

        $query = $classroom->studentsForYear($year)
            ->with([
                'attendances' => fn ($q) => $q->whereIn('study_session_id', $yearSessionIds),
                'enrollments' => fn ($q) => $q->where('classroom_id', $classroom->id)
                    ->where('academic_year', $year)
                    ->whereNull('transferred_at'),
            ]);

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(fn ($q) => $q
                ->where('name', 'like', "%{$s}%")
                ->orWhere('phone', 'like', "%{$s}%")
                ->orWhere('whatsapp', 'like', "%{$s}%")
            );
        }

        if ($request->filled('grupo_homogeneo')) {
            $query->where('grupo_homogeneo', $request->grupo_homogeneo);
        }

        $sortable = ['name', 'phone', 'grupo_homogeneo'];
        $sortBy = in_array($request->input('sort_by'), $sortable) ? $request->input('sort_by') : 'name';
        $sortDir = $request->input('sort_dir') === 'desc' ? 'desc' : 'asc';
        $query->orderBy($sortBy, $sortDir);

        $perPage = in_array((int) $request->input('per_page'), [25, 50, 100]) ? (int) $request->input('per_page') : 25;

        $students = $query->paginate($perPage)->withQueryString()->through(function ($u) use ($yearSessions) {
            $enrollment = $u->enrollments->first();
            $enrolledAt = $enrollment?->enrolled_at?->toDateString();

            $eligibleSessions = $enrolledAt
                ? $yearSessions->filter(fn ($s) => $s->session_date->toDateString() >= $enrolledAt)
                : $yearSessions;

            $eligibleIds = $eligibleSessions->pluck('id')->all();
            $total       = $eligibleSessions->count();
            $attended    = $u->attendances->whereIn('study_session_id', $eligibleIds)->count();

            return [
                'id'                    => $u->id,
                'name'                  => $u->name,
                'phone'                 => $u->phone,
                'whatsapp'              => $u->whatsapp,
                'alt_contact'           => $u->alt_contact,
                'role'                  => $u->role->value,
                'grupo_homogeneo'       => $u->grupo_homogeneo?->value,
                'grupo_homogeneo_label' => $u->grupo_homogeneo?->label(),
                'attended'              => $attended,
                'total_sessions'        => $total,
                'rate'                  => $total > 0 ? round(($attended / $total) * 100) : 0,
                'readiness'             => $u->readiness()->value,
                'readiness_label'       => $u->readinessLabel(),
            ];
        });

        return Inertia::render('Admin/TurmaAlunos', [
            'classroom' => [
                'id'            => $classroom->id,
                'name'          => $classroom->name,
                'teacher_names' => $classroom->teachers->pluck('name'),
                'is_active'     => $classroom->is_active,
                'meeting_day'   => $classroom->meeting_day,
                'meeting_time'  => $classroom->meeting_time,
            ],
            'students'       => $students,
            'totalSessions'  => $totalSessions,
            'gruposOptions'  => collect(\App\Enums\GrupoHomogeneo::cases())
                ->map(fn ($g) => ['value' => $g->value, 'label' => $g->label()]),
            'filters'        => $request->only(['search', 'grupo_homogeneo', 'sort_by', 'sort_dir', 'per_page', 'year']),
            'year'           => $year,
            'availableYears' => $availableYears,
        ]);
    }
}
