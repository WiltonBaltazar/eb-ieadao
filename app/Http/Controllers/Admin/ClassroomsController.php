<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Classroom;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ClassroomsController extends Controller
{
    public function index(): Response
    {
        $classrooms = Classroom::with('teacher')
            ->withCount('students')
            ->latest()
            ->get()
            ->map(fn ($c) => [
                'id' => $c->id,
                'name' => $c->name,
                'description' => $c->description,
                'teacher_name' => $c->teacher?->name,
                'teacher_id' => $c->teacher_id,
                'meeting_day' => $c->meeting_day,
                'meeting_time' => $c->meeting_time,
                'is_active' => $c->is_active,
                'students_count' => $c->students_count,
            ]);

        $teachers = User::whereIn('role', ['admin', 'teacher'])
            ->get()
            ->map(fn ($u) => ['id' => $u->id, 'name' => $u->name]);

        return Inertia::render('Admin/Turmas', [
            'classrooms' => $classrooms,
            'teachers' => $teachers,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'teacher_id' => 'nullable|exists:users,id',
            'meeting_day' => 'nullable|string|max:20',
            'meeting_time' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        Classroom::create($validated);
        return back()->with('success', 'Turma criada com sucesso.');
    }

    public function update(Request $request, Classroom $classroom): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'teacher_id' => 'nullable|exists:users,id',
            'meeting_day' => 'nullable|string|max:20',
            'meeting_time' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $classroom->update($validated);
        return back()->with('success', 'Turma atualizada com sucesso.');
    }

    public function destroy(Classroom $classroom): RedirectResponse
    {
        $classroom->delete();
        return back()->with('success', 'Turma eliminada.');
    }
}
