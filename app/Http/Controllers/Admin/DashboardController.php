<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Classroom;
use App\Models\Setting;
use App\Models\StudySession;
use App\Models\User;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        $threshold = Setting::attendanceThreshold();

        $totalStudents = User::where('role', 'student')->count();
        $totalClassrooms = Classroom::count();
        $totalSessions = StudySession::count();
        $openSessions = StudySession::where('status', 'open')->count();

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

        // Low attendance students
        $students = User::where('role', 'student')
            ->with(['classroom', 'attendances'])
            ->whereNotNull('classroom_id')
            ->get();

        $lowAttendance = $students->filter(function ($student) use ($threshold) {
            $ratio = $student->attendanceRatio();
            return $ratio['total'] > 0 && $ratio['rate'] < $threshold;
        })->take(10)->map(fn ($s) => [
            'id' => $s->id,
            'name' => $s->name,
            'phone' => $s->phone,
            'classroom_name' => $s->classroom?->name,
            'attended' => $s->attendanceRatio()['attended'],
            'total' => $s->attendanceRatio()['total'],
            'rate' => $s->attendanceRatio()['rate'],
        ])->values();

        return Inertia::render('Admin/Dashboard', [
            'stats' => [
                'total_students' => $totalStudents,
                'total_classrooms' => $totalClassrooms,
                'total_sessions' => $totalSessions,
                'open_sessions' => $openSessions,
            ],
            'recentSessions' => $recentSessions,
            'lowAttendance' => $lowAttendance,
            'threshold' => $threshold,
        ]);
    }
}
