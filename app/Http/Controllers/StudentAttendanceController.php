<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class StudentAttendanceController extends Controller
{
    public function index(Request $request): Response
    {
        $user = Auth::user();
        $ratio = $user->attendanceRatio();

        $query = $user->attendances()->with('session.classroom');

        if ($request->filled('search')) {
            $s = $request->search;
            $query->whereHas('session', fn ($q) => $q->where('title', 'like', "%{$s}%"));
        }

        $sortable = ['session_title', 'session_date', 'check_in_method', 'checked_in_at'];
        $sortBy = $request->input('sort_by');
        $sortDir = $request->input('sort_dir') === 'asc' ? 'asc' : 'desc';

        if ($sortBy === 'session_title') {
            $query->join('study_sessions', 'study_sessions.id', '=', 'attendances.study_session_id')
                ->orderBy('study_sessions.title', $sortDir)
                ->select('attendances.*');
        } elseif ($sortBy === 'session_date') {
            $query->join('study_sessions', 'study_sessions.id', '=', 'attendances.study_session_id')
                ->orderBy('study_sessions.session_date', $sortDir)
                ->select('attendances.*');
        } elseif (in_array($sortBy, ['check_in_method', 'checked_in_at'])) {
            $query->orderBy($sortBy, $sortDir);
        } else {
            $query->latest('checked_in_at');
        }

        $perPage = in_array((int) $request->input('per_page'), [15, 25, 50]) ? (int) $request->input('per_page') : 15;

        $attendances = $query->paginate($perPage)->withQueryString()->through(fn ($a) => [
            'id' => $a->id,
            'session_title' => $a->session->title,
            'session_date' => $a->session->session_date->format('d/m/Y'),
            'session_date_iso' => $a->session->session_date->format('Y-m-d'),
            'classroom_name' => $a->session->classroom->name,
            'method' => $a->check_in_method->value,
            'method_label' => $a->check_in_method->label(),
            'checked_in_at' => $a->checked_in_at->format('d/m/Y H:i'),
        ]);

        // Calculate streak
        $streak = $this->calculateStreak($user);

        return Inertia::render('MinhasPresencas', [
            'attendances' => $attendances,
            'stats' => [
                ...$ratio,
                'streak' => $streak,
            ],
            'filters' => $request->only(['search', 'sort_by', 'sort_dir', 'per_page']),
        ]);
    }

    private function calculateStreak($user): int
    {
        $sessions = $user->attendances()
            ->with('session')
            ->get()
            ->pluck('session.session_date')
            ->sort()
            ->values();

        if ($sessions->isEmpty()) return 0;

        $streak = 1;
        for ($i = $sessions->count() - 1; $i > 0; $i--) {
            $diff = $sessions[$i]->diffInDays($sessions[$i - 1]);
            if ($diff <= 7) {
                $streak++;
            } else {
                break;
            }
        }

        return $streak;
    }
}
