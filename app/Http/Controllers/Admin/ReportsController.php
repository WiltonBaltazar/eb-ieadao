<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Classroom;
use App\Models\Setting;
use App\Models\StudySession;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportsController extends Controller
{
    public function index(): Response
    {
        $threshold = Setting::attendanceThreshold();

        // Attendance over time (last 12 sessions)
        $attendanceOverTime = StudySession::with('attendances')
            ->whereIn('status', ['open', 'closed'])
            ->latest('session_date')
            ->take(12)
            ->get()
            ->reverse()
            ->map(fn ($s) => [
                'date' => $s->session_date->format('d/m'),
                'count' => $s->attendances->count(),
                'title' => $s->title,
            ])
            ->values();

        // Per classroom
        $byClassroom = Classroom::withCount('students')
            ->with(['studySessions' => fn ($q) => $q->whereIn('status', ['open', 'closed'])])
            ->get()
            ->map(fn ($c) => [
                'id' => $c->id,
                'name' => $c->name,
                'students_count' => $c->students_count,
                'sessions_count' => $c->studySessions->count(),
                'total_attendances' => $c->studySessions->sum(fn ($s) => $s->attendances()->count()),
            ]);

        // Below threshold
        $belowThreshold = User::where('role', 'student')
            ->whereNotNull('classroom_id')
            ->with('classroom')
            ->get()
            ->filter(fn ($s) => (function () use ($s, $threshold) {
                $r = $s->attendanceRatio();
                return $r['total'] > 0 && $r['rate'] < $threshold;
            })())
            ->map(fn ($s) => [
                'id' => $s->id,
                'name' => $s->name,
                'phone' => $s->phone,
                'classroom_name' => $s->classroom?->name,
                ...$s->attendanceRatio(),
            ])
            ->values();

        return Inertia::render('Admin/Relatorios', [
            'attendanceOverTime' => $attendanceOverTime,
            'byClassroom' => $byClassroom,
            'belowThreshold' => $belowThreshold,
            'threshold' => $threshold,
        ]);
    }

    public function registros(Request $request): Response
    {
        $query = Attendance::with(['session.classroom', 'student', 'markedBy'])
            ->latest('checked_in_at');

        if ($request->filled('classroom_id')) {
            $query->whereHas('session', fn ($q) => $q->where('classroom_id', $request->classroom_id));
        }
        if ($request->filled('session_id')) {
            $query->where('study_session_id', $request->session_id);
        }
        if ($request->filled('method')) {
            $query->where('check_in_method', $request->method);
        }

        $attendances = $query->paginate(25)->through(fn ($a) => [
            'id' => $a->id,
            'student_name' => $a->student->name,
            'student_phone' => $a->student->phone,
            'session_title' => $a->session->title,
            'session_date' => $a->session->session_date->format('d/m/Y'),
            'classroom_name' => $a->session->classroom->name,
            'method' => $a->check_in_method->value,
            'method_label' => $a->check_in_method->label(),
            'checked_in_at' => $a->checked_in_at->format('d/m/Y H:i'),
            'marked_by' => $a->markedBy?->name,
        ]);

        $classrooms = Classroom::all()->map(fn ($c) => ['id' => $c->id, 'name' => $c->name]);
        $sessions = StudySession::latest('session_date')->get()->map(fn ($s) => [
            'id' => $s->id,
            'title' => $s->title,
            'session_date' => $s->session_date->format('d/m/Y'),
        ]);

        return Inertia::render('Admin/Relatorios', [
            'tab' => 'registros',
            'attendances' => $attendances,
            'classrooms' => $classrooms,
            'sessions' => $sessions,
            'filters' => $request->only(['classroom_id', 'session_id', 'method']),
        ]);
    }

    public function exportCsv(Request $request): StreamedResponse
    {
        $query = Attendance::with(['session.classroom', 'student', 'markedBy'])
            ->latest('checked_in_at');

        if ($request->filled('classroom_id')) {
            $query->whereHas('session', fn ($q) => $q->where('classroom_id', $request->classroom_id));
        }

        $attendances = $query->get();

        return response()->streamDownload(function () use ($attendances) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['Nome', 'Telefone', 'Sessão', 'Data', 'Turma', 'Método', 'Hora']);

            foreach ($attendances as $a) {
                fputcsv($handle, [
                    $a->student->name,
                    $a->student->phone,
                    $a->session->title,
                    $a->session->session_date->format('d/m/Y'),
                    $a->session->classroom->name,
                    $a->check_in_method->label(),
                    $a->checked_in_at->format('d/m/Y H:i'),
                ]);
            }

            fclose($handle);
        }, 'presencas.csv', ['Content-Type' => 'text/csv']);
    }
}
