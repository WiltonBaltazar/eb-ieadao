<?php

namespace App\Http\Controllers\Admin;

use App\Enums\GrupoHomogeneo;
use App\Exceptions\AttendanceException;
use App\Http\Controllers\Controller;
use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\Setting;
use App\Models\StudySession;
use App\Models\User;
use App\Services\AttendanceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class StudentsController extends Controller
{
    public function index(Request $request): Response
    {
        $query = User::where('role', 'student')->with('classroom');

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(fn ($q) => $q
                ->where('name', 'like', "%{$s}%")
                ->orWhere('phone', 'like', "%{$s}%")
            );
        }
        if ($request->filled('classroom_id')) {
            if ($request->classroom_id === 'none') {
                $query->whereNull('classroom_id');
            } else {
                $query->where('classroom_id', $request->classroom_id);
            }
        }
        if ($request->filled('grupo_homogeneo')) {
            $query->where('grupo_homogeneo', $request->grupo_homogeneo);
        }

        $sortable = ['name', 'phone', 'grupo_homogeneo', 'created_at'];
        $sortBy = in_array($request->input('sort_by'), $sortable) ? $request->input('sort_by') : 'name';
        $sortDir = $request->input('sort_dir') === 'desc' ? 'desc' : 'asc';
        $query->orderBy($sortBy, $sortDir);

        $perPage = in_array((int) $request->input('per_page'), [25, 50, 100]) ? (int) $request->input('per_page') : 25;

        $students = $query->paginate($perPage)->withQueryString()->through(fn ($u) => [
            'id'                    => $u->id,
            'name'                  => $u->name,
            'phone'                 => $u->phone,
            'classroom_id'          => $u->classroom_id,
            'classroom_name'        => $u->classroom?->name,
            'grupo_homogeneo'       => $u->grupo_homogeneo?->value,
            'grupo_homogeneo_label' => $u->grupo_homogeneo?->label(),
            'attendance_rate'       => $u->attendanceRatio()['rate'],
        ]);

        return Inertia::render('Admin/Alunos', [
            'students'      => $students,
            'classrooms'    => Classroom::orderBy('name')->get()->map(fn ($c) => ['id' => $c->id, 'name' => $c->name]),
            'gruposOptions' => collect(GrupoHomogeneo::cases())->map(fn ($g) => ['value' => $g->value, 'label' => $g->label()]),
            'filters'       => $request->only(['search', 'classroom_id', 'grupo_homogeneo', 'sort_by', 'sort_dir', 'per_page']),
        ]);
    }

    public function bulkImport(Request $request): JsonResponse
    {
        $grupoValues = implode(',', array_column(GrupoHomogeneo::cases(), 'value'));

        $request->validate([
            'rows'                       => 'required|array|min:1|max:500',
            'rows.*.nome'                => 'required|string|max:255',
            'rows.*.telefone'            => 'required|string|max:50',
            'rows.*.grupo_homogeneo'     => "required|in:{$grupoValues}",
            'rows.*.data_inscricao'      => 'required|date_format:Y-m-d',
            'classroom_id'               => 'nullable|exists:classrooms,id',
        ], [
            'rows.*.nome.required'            => 'Nome obrigatório.',
            'rows.*.telefone.required'        => 'Telefone obrigatório.',
            'rows.*.grupo_homogeneo.in'       => 'Grupo inválido (use: homens, senhoras, jovens, criancas).',
            'rows.*.data_inscricao.date_format' => 'Data deve estar no formato YYYY-MM-DD.',
        ]);

        $year        = Setting::currentAcademicYear();
        $classroomId = $request->classroom_id ?: null;
        $enrolledBy  = $request->user()?->id;

        $created = 0;
        $updated = 0;
        $rowErrors = [];

        foreach ($request->rows as $i => $row) {
            try {
                DB::transaction(function () use ($row, $classroomId, $year, $enrolledBy, &$created, &$updated) {
                    $existing = User::where('phone', $row['telefone'])->first();

                    if ($existing) {
                        $existing->update([
                            'name'            => $row['nome'],
                            'grupo_homogeneo' => $row['grupo_homogeneo'],
                            'classroom_id'    => $classroomId ?? $existing->classroom_id,
                        ]);
                        $user = $existing;
                        $updated++;
                    } else {
                        $user = User::create([
                            'name'            => $row['nome'],
                            'phone'           => $row['telefone'],
                            'whatsapp'        => $row['telefone'],
                            'grupo_homogeneo' => $row['grupo_homogeneo'],
                            'classroom_id'    => $classroomId,
                            'role'            => 'student',
                            'password'        => null,
                        ]);
                        $created++;
                    }

                    if ($classroomId) {
                        Enrollment::updateOrCreate(
                            [
                                'student_id'    => $user->id,
                                'classroom_id'  => $classroomId,
                                'academic_year' => $year,
                            ],
                            [
                                'enrolled_at'    => $row['data_inscricao'],
                                'enrolled_by_id' => $enrolledBy,
                                'transferred_at' => null,
                            ]
                        );
                    }
                });
            } catch (\Exception $e) {
                $rowErrors[] = 'Linha ' . ($i + 2) . " ({$row['nome']}): " . $e->getMessage();
            }
        }

        return response()->json([
            'created' => $created,
            'updated' => $updated,
            'errors'  => $rowErrors,
        ]);
    }

    public function markSessions(Request $request, User $user): RedirectResponse
    {
        $request->validate([
            'session_ids'   => 'required|array|min:1',
            'session_ids.*' => 'integer',
        ]);

        $service      = app(AttendanceService::class);
        $admin        = $request->user();
        $count        = 0;
        $earliestDate = null;

        foreach ($request->session_ids as $sessionId) {
            $session = StudySession::find($sessionId);

            if (!$session || $session->classroom_id !== $user->classroom_id) {
                continue;
            }

            try {
                $service->markPresent($session, $user, $admin);
                $count++;

                if ($earliestDate === null || $session->session_date->lt($earliestDate)) {
                    $earliestDate = $session->session_date->copy();
                }
            } catch (AttendanceException) {
                // duplicate — skip silently
            }
        }

        // Push enrolled_at back if we marked a session earlier than the current enrollment date
        if ($count > 0 && $earliestDate) {
            $enrollment = Enrollment::where('student_id', $user->id)
                ->where('academic_year', $earliestDate->year)
                ->whereNull('transferred_at')
                ->first();

            if ($enrollment && ($enrollment->enrolled_at === null || $earliestDate->lt($enrollment->enrolled_at))) {
                $enrollment->update(['enrolled_at' => $earliestDate->toDateString()]);
            }
        }

        return back()->with('success', "{$count} presença(s) marcada(s) para {$user->name}.");
    }

    public function transfer(Request $request, User $user): RedirectResponse
    {
        $request->validate([
            'classroom_id' => 'nullable|exists:classrooms,id',
        ], [
            'classroom_id.exists' => 'A turma selecionada não existe.',
        ]);

        $old = $user->classroom?->name ?? 'Sem turma';
        $newClassroomId = $request->classroom_id ?: null;
        $year = Setting::currentAcademicYear();

        DB::transaction(function () use ($user, $newClassroomId, $year, $request) {
            // Stamp transferred_at on any active enrollment for this year
            Enrollment::where('student_id', $user->id)
                ->where('academic_year', $year)
                ->whereNull('transferred_at')
                ->update(['transferred_at' => now()]);

            // Create new enrollment if a classroom is chosen
            if ($newClassroomId) {
                Enrollment::create([
                    'student_id'      => $user->id,
                    'classroom_id'    => $newClassroomId,
                    'academic_year'   => $year,
                    'enrolled_at'     => now(),
                    'enrolled_by_id'  => $request->user()?->id,
                ]);
            }

            // Sync the cache column
            $user->update(['classroom_id' => $newClassroomId]);
        });

        $new = $user->fresh()->classroom?->name ?? 'Sem turma';

        return back()->with('success', "{$user->name} transferido(a): {$old} → {$new}.");
    }
}
