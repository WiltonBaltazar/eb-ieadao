<?php

namespace App\Http\Controllers\Admin;

use App\Exceptions\AttendanceException;
use App\Http\Controllers\Controller;
use App\Models\Classroom;
use App\Models\StudySession;
use App\Models\User;
use App\Services\AttendanceService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class StudySessionsController extends Controller
{
    public function __construct(private readonly AttendanceService $attendanceService)
    {
    }

    public function index(): Response
    {
        $sessions = StudySession::with('classroom')
            ->withCount('attendances')
            ->latest('session_date')
            ->paginate(20)
            ->through(fn ($s) => [
                'id' => $s->id,
                'title' => $s->title,
                'session_date' => $s->session_date->format('d/m/Y'),
                'status' => $s->status->value,
                'status_label' => $s->status->label(),
                'classroom_name' => $s->classroom->name,
                'classroom_id' => $s->classroom_id,
                'lesson_type' => $s->lesson_type,
                'attendances_count' => $s->attendances_count,
                'check_in_code_expires_at' => $s->check_in_code_expires_at?->toISOString(),
            ]);

        $classrooms = Classroom::all()->map(fn ($c) => ['id' => $c->id, 'name' => $c->name]);

        return Inertia::render('Admin/Sessoes', [
            'sessions' => $sessions,
            'classrooms' => $classrooms,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'classroom_id' => 'required|exists:classrooms,id',
            'title' => 'required|string|max:255',
            'session_date' => 'required|date',
            'lesson_type' => 'nullable|string|max:100',
            'notes' => 'nullable|string',
        ]);

        StudySession::create($validated);
        return back()->with('success', 'Sessão criada com sucesso.');
    }

    public function update(Request $request, StudySession $studySession): RedirectResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'session_date' => 'required|date',
            'lesson_type' => 'nullable|string|max:100',
            'notes' => 'nullable|string',
        ]);

        $studySession->update($validated);
        return back()->with('success', 'Sessão atualizada com sucesso.');
    }

    public function destroy(StudySession $studySession): RedirectResponse
    {
        $studySession->delete();
        return back()->with('success', 'Sessão eliminada.');
    }

    public function open(StudySession $studySession): RedirectResponse
    {
        try {
            $this->attendanceService->openSession($studySession);
            return back()->with('success', 'Sessão aberta para presenças.');
        } catch (AttendanceException $e) {
            return back()->withErrors(['general' => $e->getMessage()]);
        }
    }

    public function close(StudySession $studySession): RedirectResponse
    {
        try {
            $this->attendanceService->closeSession($studySession);
            return back()->with('success', 'Sessão fechada.');
        } catch (AttendanceException $e) {
            return back()->withErrors(['general' => $e->getMessage()]);
        }
    }

    public function regenerateCode(StudySession $studySession): RedirectResponse
    {
        try {
            $this->attendanceService->regenerateCode($studySession);
            return back()->with('success', 'Código QR regenerado.');
        } catch (AttendanceException $e) {
            return back()->withErrors(['general' => $e->getMessage()]);
        }
    }

    public function markPresent(Request $request, StudySession $studySession): RedirectResponse
    {
        $request->validate(['student_id' => 'required|exists:users,id']);

        $student = User::findOrFail($request->student_id);

        try {
            $this->attendanceService->markPresent($studySession, $student, auth()->user());
            return back()->with('success', 'Presença marcada com sucesso.');
        } catch (AttendanceException $e) {
            return back()->withErrors(['general' => $e->getMessage()]);
        }
    }
}
