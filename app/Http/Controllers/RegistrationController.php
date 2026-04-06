<?php

namespace App\Http\Controllers;

use App\Enums\GrupoHomogeneo;
use App\Exceptions\AttendanceException;
use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\Setting;
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

    public function showGeneral(Request $request): Response
    {
        $classrooms = Classroom::where('is_active', true)
            ->get()
            ->map(fn ($c) => [
                'id' => $c->id,
                'name' => $c->name,
                'teacher_name' => null,
            ]);

        $gruposOptions = collect(GrupoHomogeneo::cases())->map(fn ($g) => [
            'value' => $g->value,
            'label' => $g->label(),
        ]);

        return Inertia::render('Registar', [
            'studySession' => null,
            'prefillPhone' => $request->old('phone', $request->query('phone', '')),
            'classrooms' => $classrooms,
            'gruposOptions' => $gruposOptions,
        ]);
    }

    public function storeGeneral(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'required|string|max:50|unique:users,phone',
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

        $student = User::create([
            ...$validated,
            'whatsapp' => $validated['phone'],
            'role' => 'student',
            'password' => null,
        ]);

        Enrollment::create([
            'student_id'    => $student->id,
            'classroom_id'  => $validated['classroom_id'],
            'academic_year' => Setting::currentAcademicYear(),
            'enrolled_at'   => now(),
        ]);

        Auth::login($student);
        $request->session()->regenerate();

        return redirect()->route('student.profile')
            ->with('success', 'Registo concluído com sucesso! Bem-vindo(a).');
    }

    public function show(Request $request, StudySession $studySession): Response
    {
        $classrooms = Classroom::where('is_active', true)
            ->with('teachers')
            ->get()
            ->map(fn ($c) => [
                'id' => $c->id,
                'name' => $c->name,
                'teacher_name' => $c->teachers->first()?->name,
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
                'classroom_id' => $studySession->classroom_id,
            ],
            'prefillPhone' => $request->old('phone', $request->query('phone', '')),
            'classrooms' => $classrooms,
            'gruposOptions' => $gruposOptions,
        ]);
    }

    public function store(Request $request, StudySession $studySession): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'required|string|max:50|unique:users,phone',
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

        $student = User::create([
            ...$validated,
            'whatsapp' => $validated['phone'],
            'role' => 'student',
            'password' => null,
        ]);

        Enrollment::create([
            'student_id'    => $student->id,
            'classroom_id'  => $validated['classroom_id'],
            'academic_year' => Setting::currentAcademicYear(),
            'enrolled_at'   => $studySession->session_date->startOfDay(),
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
