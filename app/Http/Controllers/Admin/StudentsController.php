<?php

namespace App\Http\Controllers\Admin;

use App\Enums\GrupoHomogeneo;
use App\Http\Controllers\Controller;
use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\Setting;
use App\Models\User;
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
