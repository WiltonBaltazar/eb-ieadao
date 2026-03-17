<?php

namespace App\Http\Controllers\Admin;

use App\Enums\GrupoHomogeneo;
use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Models\Classroom;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response;

class UsersController extends Controller
{
    public function index(Request $request): Response
    {
        $query = User::with('classroom')->latest();

        if ($request->filled('role')) {
            $query->where('role', $request->role);
        }
        if ($request->filled('classroom_id')) {
            $query->where('classroom_id', $request->classroom_id);
        }
        if ($request->filled('grupo_homogeneo')) {
            $query->where('grupo_homogeneo', $request->grupo_homogeneo);
        }
        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%")
                  ->orWhere('phone', 'like', "%{$request->search}%")
                  ->orWhere('email', 'like', "%{$request->search}%");
            });
        }

        $users = $query->paginate(20)->through(fn ($u) => [
            'id' => $u->id,
            'name' => $u->name,
            'email' => $u->email,
            'phone' => $u->phone,
            'role' => $u->role->value,
            'role_label' => $u->role->label(),
            'classroom_name' => $u->classroom?->name,
            'grupo_homogeneo' => $u->grupo_homogeneo?->value,
            'grupo_homogeneo_label' => $u->grupo_homogeneo?->label(),
            'attendance_rate' => $u->isStudent() ? $u->attendanceRatio()['rate'] : null,
        ]);

        return Inertia::render('Admin/Utilizadores', [
            'users' => $users,
            'classrooms' => Classroom::all()->map(fn ($c) => ['id' => $c->id, 'name' => $c->name]),
            'roles' => collect(Role::cases())->map(fn ($r) => ['value' => $r->value, 'label' => $r->label()]),
            'gruposOptions' => collect(GrupoHomogeneo::cases())->map(fn ($g) => ['value' => $g->value, 'label' => $g->label()]),
            'filters' => $request->only(['role', 'classroom_id', 'grupo_homogeneo', 'search']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $isStudent = $request->role === 'student';

        $rules = [
            'name' => 'required|string|max:255',
            'role' => 'required|in:admin,teacher,student',
            'phone' => $isStudent ? 'required|string|max:50|unique:users,phone' : 'nullable|string|max:50',
            'whatsapp' => 'nullable|string|max:50',
            'alt_contact' => 'nullable|string|max:255',
            'grupo_homogeneo' => 'nullable|in:' . implode(',', array_column(GrupoHomogeneo::cases(), 'value')),
            'classroom_id' => 'nullable|exists:classrooms,id',
        ];

        if (!$isStudent) {
            $rules['email'] = 'required|email|unique:users,email';
            $rules['password'] = 'required|string|min:8';
        }

        $validated = $request->validate($rules);

        if (!$isStudent && isset($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        User::create($validated);

        return back()->with('success', 'Utilizador criado com sucesso.');
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $isStudent = $user->role->value === 'student';

        $rules = [
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:50|unique:users,phone,' . $user->id,
            'whatsapp' => 'nullable|string|max:50',
            'alt_contact' => 'nullable|string|max:255',
            'grupo_homogeneo' => 'nullable|in:' . implode(',', array_column(GrupoHomogeneo::cases(), 'value')),
            'classroom_id' => 'nullable|exists:classrooms,id',
        ];

        if (!$isStudent) {
            $rules['email'] = 'required|email|unique:users,email,' . $user->id;
        }

        $validated = $request->validate($rules);

        if ($request->filled('password')) {
            $validated['password'] = Hash::make($request->password);
        }

        $user->update($validated);

        return back()->with('success', 'Utilizador atualizado com sucesso.');
    }

    public function destroy(User $user): RedirectResponse
    {
        $user->delete();
        return back()->with('success', 'Utilizador eliminado.');
    }
}
