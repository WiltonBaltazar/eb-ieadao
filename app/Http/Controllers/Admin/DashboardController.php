<?php

namespace App\Http\Controllers\Admin;

use App\Enums\GrupoHomogeneo;
use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Classroom;
use App\Models\Setting;
use App\Models\StudySession;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        $threshold = Setting::attendanceThreshold();

        $totalStudents = User::where('role', 'student')->count();
        $totalClassrooms = Classroom::where('is_active', true)->count();
        $totalSessions = StudySession::count();
        $openSessions = StudySession::where('status', 'open')->count();

        // Average attendance rate across all students
        $students = User::where('role', 'student')
            ->with(['classroom', 'attendances'])
            ->whereNotNull('classroom_id')
            ->get();

        $rates = $students->map(fn ($s) => $s->attendanceRatio())
            ->filter(fn ($r) => $r['total'] > 0);
        $avgAttendance = $rates->count() > 0
            ? round($rates->avg('rate'))
            : 0;

        // This month vs last month attendance totals
        $now = Carbon::now();
        $thisMonthStart = $now->copy()->startOfMonth();
        $lastMonthStart = $now->copy()->subMonth()->startOfMonth();
        $lastMonthEnd = $now->copy()->subMonth()->endOfMonth();

        $thisMonthAttendances = Attendance::whereHas('session', fn ($q) =>
            $q->where('session_date', '>=', $thisMonthStart)
        )->count();

        $lastMonthAttendances = Attendance::whereHas('session', fn ($q) =>
            $q->whereBetween('session_date', [$lastMonthStart, $lastMonthEnd])
        )->count();

        $monthTrend = $lastMonthAttendances > 0
            ? round((($thisMonthAttendances - $lastMonthAttendances) / $lastMonthAttendances) * 100)
            : ($thisMonthAttendances > 0 ? 100 : 0);

        // Students per grupo homogéneo
        $grupoDistribution = collect(GrupoHomogeneo::cases())->map(function ($grupo) {
            return [
                'value' => $grupo->value,
                'label' => $grupo->label(),
                'count' => User::where('role', 'student')
                    ->where('grupo_homogeneo', $grupo->value)
                    ->count(),
            ];
        })->filter(fn ($g) => $g['count'] > 0)->values();

        $recentSessions = StudySession::with('classroom')
            ->latest('session_date')
            ->take(5)
            ->get()
            ->map(fn ($s) => [
                'id' => $s->id,
                'title' => $s->title,
                'session_date' => $s->session_date->format('d/m/Y'),
                'status' => $s->status->value,
                'status_label' => $s->status->label(),
                'classroom_name' => $s->classroom->name,
                'attendance_count' => $s->attendances()->count(),
            ]);

        // Top 5 attendance students (above threshold) for dashboard preview
        $topAttendance = $students->filter(function ($student) use ($threshold) {
            $ratio = $student->attendanceRatio();
            return $ratio['total'] > 0 && $ratio['rate'] >= $threshold;
        })->sortByDesc(fn ($s) => $s->attendanceRatio()['rate'])
          ->take(5)
          ->map(fn ($s) => [
              'id' => $s->id,
              'name' => $s->name,
              'phone' => $s->phone,
              'classroom_name' => $s->classroom?->name,
              'attended' => $s->attendanceRatio()['attended'],
              'total' => $s->attendanceRatio()['total'],
              'rate' => $s->attendanceRatio()['rate'],
          ])->values();

        // Attendance by classroom (for quick comparison)
        $classroomRates = Classroom::where('is_active', true)
            ->withCount('students')
            ->with(['studySessions' => fn ($q) => $q->whereIn('status', ['open', 'closed'])])
            ->get()
            ->map(function ($c) {
                $sessionsCount = $c->studySessions->count();
                $totalAtt = $c->studySessions->sum(fn ($s) => $s->attendances()->count());
                $maxPossible = $sessionsCount * $c->students_count;
                return [
                    'name' => $c->name,
                    'rate' => $maxPossible > 0 ? round(($totalAtt / $maxPossible) * 100) : 0,
                    'students_count' => $c->students_count,
                ];
            });

        return Inertia::render('Admin/Dashboard', [
            'stats' => [
                'total_students' => $totalStudents,
                'total_classrooms' => $totalClassrooms,
                'total_sessions' => $totalSessions,
                'open_sessions' => $openSessions,
                'avg_attendance' => $avgAttendance,
                'this_month_attendances' => $thisMonthAttendances,
                'month_trend' => $monthTrend,
            ],
            'recentSessions' => $recentSessions,
            'topAttendance' => $topAttendance,
            'threshold' => $threshold,
            'grupoDistribution' => $grupoDistribution,
            'classroomRates' => $classroomRates,
        ]);
    }

    public function attendanceRanking(Request $request): Response
    {
        $threshold = Setting::attendanceThreshold();
        $sortDir = $request->input('sort_dir') === 'asc' ? 'asc' : 'desc';
        $classroomId = $request->input('classroom_id');

        $query = User::where('role', 'student')
            ->with(['classroom', 'attendances'])
            ->whereNotNull('classroom_id');

        if ($classroomId) {
            $query->where('classroom_id', $classroomId);
        }

        $students = $query->get()
            ->map(function ($s) {
                $ratio = $s->attendanceRatio();
                return [
                    'id' => $s->id,
                    'name' => $s->name,
                    'phone' => $s->phone,
                    'classroom_name' => $s->classroom?->name,
                    'grupo_homogeneo_label' => $s->grupo_homogeneo?->label(),
                    'attended' => $ratio['attended'],
                    'total' => $ratio['total'],
                    'rate' => $ratio['rate'],
                ];
            })
            ->filter(fn ($s) => $s['total'] > 0);

        if ($sortDir === 'desc') {
            $students = $students->sortByDesc('rate');
        } else {
            $students = $students->sortBy('rate');
        }

        $students = $students->values();

        $perPage = in_array((int) $request->input('per_page'), [25, 50, 100]) ? (int) $request->input('per_page') : 25;
        $page = (int) $request->input('page', 1);
        $paginated = new LengthAwarePaginator(
            $students->slice(($page - 1) * $perPage, $perPage)->values(),
            $students->count(),
            $perPage,
            $page,
            ['path' => $request->url(), 'query' => $request->query()],
        );

        $classrooms = Classroom::orderBy('name')->get()
            ->map(fn ($c) => ['id' => $c->id, 'name' => $c->name, 'is_active' => $c->is_active]);

        return Inertia::render('Admin/Ranking', [
            'students' => $paginated,
            'threshold' => $threshold,
            'classrooms' => $classrooms,
            'filters' => [
                'sort_dir' => $sortDir,
                'classroom_id' => $classroomId,
                'per_page' => (string) $perPage,
            ],
        ]);
    }
}
