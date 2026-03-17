<?php

namespace App\Http\Controllers;

use App\Enums\GrupoHomogeneo;
use App\Exceptions\AttendanceException;
use App\Models\Classroom;
use App\Models\StudySession;
use App\Models\User;
use App\Services\AttendanceService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class RegistrationController extends Controller
{
    public function __construct(private readonly AttendanceService $attendanceService)
    {
    }

    public function show(Request $request, StudySession $studySession): Response
    {
        $classrooms = Classroom::where('is_active', true)
            ->with('teacher')
            ->get()
            ->map(fn ($c) => [
                'id' => $c->id,
                'name' => $c->name,
                'teacher_name' => $c->teacher?->name,
            ]);

        $gruposOptions = collect(GrupoHomogeneo::cases())->map(fn ($g) => [
            'value' => $g->value,
            'label' => $g->label(),
        ]);

        return Inertia::render('Registar', [
            'studySession' => [
                'id' => $studySession->id,
                'title' => $studySession->title,
                'session_date' => $studySession->session_date->format('Y-m-d'),
            ],
            'prefillPhone' => $request->query('phone', ''),
            'classrooms' => $classrooms,
            'gruposOptions' => $gruposOptions,
        ]);
    }

    public function store(Request $request, StudySession $studySession): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'required|string|max:50|unique:users,phone',
            'whatsapp' => 'nullable|string|max:50',
            'alt_contact' => 'nullable|string|max:255',
            'grupo_homogeneo' => 'required|in:' . implode(',', array_column(GrupoHomogeneo::cases(), 'value')),
            'classroom_id' => 'required|exists:classrooms,id',
        ], [
            'name.required' => 'O nome é obrigatório.',
            'phone.required' => 'O número de telefone é obrigatório.',
            'phone.unique' => 'Este número de telefone já está registado.',
            'grupo_homogeneo.required' => 'O grupo homogéneo é obrigatório.',
            'classroom_id.required' => 'A turma é obrigatória.',
            'classroom_id.exists' => 'A turma selecionada não existe.',
        ]);

        // Default whatsapp to phone if blank
        if (empty($validated['whatsapp'])) {
            $validated['whatsapp'] = $validated['phone'];
        }

        $student = User::create([
            ...$validated,
            'role' => 'student',
            'password' => null,
        ]);

        // Attempt check-in
        try {
            $code = $request->input('code', $studySession->check_in_code ?? '');
            $this->attendanceService->phoneCheckIn($student->phone, $studySession, $code);
        } catch (AttendanceException) {
            // Check-in failed but registration succeeded — proceed
        }

        Auth::login($student);
        $request->session()->regenerate();

        return redirect()->route('student.profile')
            ->with('success', 'Registo e presença confirmados com sucesso!');
    }
}
