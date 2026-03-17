<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class StudentAttendanceController extends Controller
{
    public function index(): Response
    {
        $user = Auth::user();
        $ratio = $user->attendanceRatio();

        $attendances = $user->attendances()
            ->with('session.classroom')
            ->latest('checked_in_at')
            ->paginate(15)
            ->through(fn ($a) => [
                'id' => $a->id,
                'session_title' => $a->session->title,
                'session_date' => $a->session->session_date->format('d/m/Y'),
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
