<?php

namespace App\Http\Controllers;

use App\Enums\GrupoHomogeneo;
use App\Models\StudySession;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class StudentProfileController extends Controller
{
    public function show(): Response
    {
        $user = Auth::user()->load('classroom', 'attendances.session.classroom');

        $ratio = $user->attendanceRatio();

        $lastAttendances = $user->attendances()
            ->with('session.classroom')
            ->latest('checked_in_at')
            ->take(5)
            ->get()
            ->map(fn ($a) => [
                'id' => $a->id,
                'session_title' => $a->session->title,
                'session_date' => $a->session->session_date->format('d/m/Y'),
                'classroom_name' => $a->session->classroom->name,
                'method' => $a->check_in_method->value,
                'method_label' => $a->check_in_method->label(),
                'checked_in_at' => $a->checked_in_at->format('H:i'),
            ]);

        $upcomingSessions = [];
        if ($user->classroom_id) {
            $upcomingSessions = StudySession::where('classroom_id', $user->classroom_id)
                ->where('status', 'open')
                ->with('classroom')
                ->get()
                ->map(fn ($s) => [
                    'id' => $s->id,
                    'title' => $s->title,
                    'session_date' => $s->session_date->format('d/m/Y'),
                    'classroom_name' => $s->classroom->name,
                    'check_in_url' => $s->checkInUrl(),
                ]);
        }

        return Inertia::render('MeuPerfil', [
            'student' => [
                'id' => $user->id,
                'name' => $user->name,
                'phone' => $user->phone,
                'classroom_name' => $user->classroom?->name,
                'grupo_homogeneo' => $user->grupo_homogeneo?->label(),
                'readiness' => $user->readiness()->value,
                'readiness_label' => $user->readinessLabel(),
            ],
            'stats' => $ratio,
            'lastAttendances' => $lastAttendances,
            'upcomingSessions' => $upcomingSessions,
        ]);
    }

    public function edit(): Response
    {
        $user = Auth::user()->load('classroom');

        $gruposOptions = collect(GrupoHomogeneo::cases())->map(fn ($g) => [
            'value' => $g->value,
            'label' => $g->label(),
        ]);

        return Inertia::render('EditarPerfil', [
            'student' => [
                'id' => $user->id,
                'name' => $user->name,
                'phone' => $user->phone,
                'whatsapp' => $user->whatsapp,
                'alt_contact' => $user->alt_contact,
                'grupo_homogeneo' => $user->grupo_homogeneo?->value,
                'classroom_name' => $user->classroom?->name,
            ],
            'gruposOptions' => $gruposOptions,
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $user = Auth::user();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'required|string|max:50|unique:users,phone,' . $user->id,
            'alt_contact' => 'nullable|string|max:255',
            'grupo_homogeneo' => 'nullable|in:' . implode(',', array_column(GrupoHomogeneo::cases(), 'value')),
        ], [
            'name.required' => 'O nome é obrigatório.',
            'phone.required' => 'O número de telefone é obrigatório.',
            'phone.unique' => 'Este número de telefone já está registado.',
        ]);

        // classroom_id is NOT updateable by student
        $user->update([...$validated, 'whatsapp' => $validated['phone']]);

        return back()->with('success', 'Perfil atualizado com sucesso!');
    }
}
