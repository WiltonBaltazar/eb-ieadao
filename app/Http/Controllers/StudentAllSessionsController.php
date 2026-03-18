<?php

namespace App\Http\Controllers;

use App\Models\StudySession;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class StudentAllSessionsController extends Controller
{
    public function index(Request $request): Response
    {
        $user = Auth::user();

        if (!$user->classroom_id) {
            return Inertia::render('TodasAulas', [
                'sessions' => [],
                'filters'  => [],
            ]);
        }

        // Fetch all non-draft sessions for the student's classroom
        // ordered by date descending so newest is first
        $query = StudySession::with(['resources', 'classroom'])
            ->where('classroom_id', $user->classroom_id)
            ->whereIn('status', ['open', 'closed'])
            ->orderByDesc('session_date');

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where('title', 'like', "%{$s}%");
        }

        // Load the student's attendance IDs in one query for efficiency
        $attendedSessionIds = $user->attendances()
            ->pluck('study_session_id')
            ->flip(); // O(1) lookup

        $sessions = $query->get()->map(function ($s) use ($attendedSessionIds) {
            return [
                'id'              => $s->id,
                'title'           => $s->title,
                'session_date'    => $s->session_date->format('d/m/Y'),
                'status'          => $s->status->value,
                'status_label'    => $s->status->label(),
                'classroom_name'  => $s->classroom->name,
                'lesson_type'     => $s->lesson_type,
                'resources_count' => $s->resources->count(),
                'attended'        => $attendedSessionIds->has($s->id),
                'session_url'     => route('student.aula.show', $s),
            ];
        });

        return Inertia::render('TodasAulas', [
            'sessions' => $sessions,
            'filters'  => $request->only(['search']),
        ]);
    }
}
