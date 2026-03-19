<?php

namespace App\Http\Controllers\Admin;

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

class EnrollmentsController extends Controller
{
    public function index(Request $request): Response
    {
        $currentYear = Setting::currentAcademicYear();
        $year = $request->filled('year') ? (int) $request->year : $currentYear;

        $availableYears = Enrollment::distinct()
            ->orderByDesc('academic_year')
            ->pluck('academic_year')
            ->map(fn ($y) => (int) $y)
            ->values();

        if ($availableYears->isEmpty()) {
            $availableYears = collect([$currentYear]);
        }

        $query = Enrollment::with(['student', 'classroom'])
            ->where('academic_year', $year)
            ->whereNull('transferred_at');

        if ($request->filled('classroom_id')) {
            $query->where('classroom_id', $request->classroom_id);
        }

        if ($request->filled('search')) {
            $s = $request->search;
            $query->whereHas('student', fn ($q) => $q
                ->where('name', 'like', "%{$s}%")
                ->orWhere('phone', 'like', "%{$s}%")
            );
        }

        $enrollments = $query->orderBy('id')->paginate(50)->withQueryString()->through(fn ($e) => [
            'id'             => $e->id,
            'student_id'     => $e->student_id,
            'student_name'   => $e->student?->name,
            'student_phone'  => $e->student?->phone,
            'classroom_id'   => $e->classroom_id,
            'classroom_name' => $e->classroom?->name,
            'enrolled_at'    => $e->enrolled_at?->format('d/m/Y'),
        ]);

        return Inertia::render('Admin/Matriculas', [
            'enrollments'    => $enrollments,
            'classrooms'     => Classroom::where('classroom_type', 'bible_study')->orderBy('name')->get()->map(fn ($c) => ['id' => $c->id, 'name' => $c->name]),
            'year'           => $year,
            'availableYears' => $availableYears,
            'filters'        => $request->only(['year', 'classroom_id', 'search']),
        ]);
    }

    public function bulkEnroll(Request $request): RedirectResponse
    {
        $request->validate([
            'year'                    => 'required|integer|min:2000|max:2100',
            'assignments'             => 'required|array|min:1',
            'assignments.*.student_id'  => 'required|integer|exists:users,id',
            'assignments.*.classroom_id'=> 'required|integer|exists:classrooms,id',
        ]);

        $year = (int) $request->year;

        DB::transaction(function () use ($request, $year) {
            foreach ($request->assignments as $assignment) {
                $studentId   = $assignment['student_id'];
                $classroomId = $assignment['classroom_id'];

                // Stamp transferred_at on existing active enrollment for this year
                Enrollment::where('student_id', $studentId)
                    ->where('academic_year', $year)
                    ->whereNull('transferred_at')
                    ->update(['transferred_at' => now()]);

                Enrollment::create([
                    'student_id'     => $studentId,
                    'classroom_id'   => $classroomId,
                    'academic_year'  => $year,
                    'enrolled_at'    => now(),
                    'enrolled_by_id' => $request->user()?->id,
                ]);

                // Sync cache if it's the current year
                if ($year === Setting::currentAcademicYear()) {
                    User::where('id', $studentId)->update(['classroom_id' => $classroomId]);
                }
            }
        });

        return back()->with('success', count($request->assignments) . ' matrícula(s) registada(s).');
    }

    public function copyFromYear(Request $request): RedirectResponse
    {
        $request->validate([
            'from_year' => 'required|integer|min:2000|max:2100',
            'to_year'   => 'required|integer|min:2000|max:2100|different:from_year',
        ]);

        $fromYear = (int) $request->from_year;
        $toYear   = (int) $request->to_year;

        $source = Enrollment::where('academic_year', $fromYear)
            ->whereNull('transferred_at')
            ->get();

        $copied = 0;

        DB::transaction(function () use ($source, $toYear, $request, &$copied) {
            foreach ($source as $enrollment) {
                $exists = Enrollment::where('student_id', $enrollment->student_id)
                    ->where('academic_year', $toYear)
                    ->whereNull('transferred_at')
                    ->exists();

                if (!$exists) {
                    Enrollment::create([
                        'student_id'     => $enrollment->student_id,
                        'classroom_id'   => $enrollment->classroom_id,
                        'academic_year'  => $toYear,
                        'enrolled_at'    => now(),
                        'enrolled_by_id' => $request->user()?->id,
                        'notes'          => "Copiado de {$toYear} — ano anterior",
                    ]);
                    $copied++;
                }
            }
        });

        return back()->with('success', "{$copied} matrícula(s) copiada(s) de {$fromYear} para {$toYear}.");
    }
}
