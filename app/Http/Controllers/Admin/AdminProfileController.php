<?php

namespace App\Http\Controllers\Admin;

use App\Enums\GrupoHomogeneo;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class AdminProfileController extends Controller
{
    public function edit(Request $request): Response
    {
        $user = $request->user();

        $data = [
            'profile' => [
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role->value,
                'phone' => $user->phone,
                'grupo_homogeneo' => $user->grupo_homogeneo?->value,
            ],
        ];

        if ($user->isTeacher()) {
            $data['gruposOptions'] = collect(GrupoHomogeneo::cases())
                ->map(fn ($g) => ['value' => $g->value, 'label' => $g->label()]);
        }

        return Inertia::render('Admin/Perfil', $data);
    }

    public function update(Request $request): RedirectResponse
    {
        $user = $request->user();

        $rules = [
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,' . $user->id,
            'password' => ['nullable', 'confirmed', Password::defaults()],
        ];

        if ($user->isTeacher()) {
            $rules['phone'] = 'nullable|string|max:50|unique:users,phone,' . $user->id;
            $rules['grupo_homogeneo'] = 'nullable|in:' . implode(',', array_column(GrupoHomogeneo::cases(), 'value'));
        }

        $validated = $request->validate($rules, [
            'name.required' => 'O nome é obrigatório.',
            'email.required' => 'O email é obrigatório.',
            'email.email' => 'O email não é válido.',
            'email.unique' => 'Este email já está registado.',
            'phone.unique' => 'Este número de telefone já está registado.',
            'password.confirmed' => 'As passwords não coincidem.',
            'password.min' => 'A password deve ter pelo menos 8 caracteres.',
        ]);

        $user->name = $validated['name'];
        $user->email = $validated['email'];

        if ($user->isTeacher()) {
            $user->phone = $validated['phone'] ?? $user->phone;
            $user->grupo_homogeneo = $validated['grupo_homogeneo'] ?? null;
        }

        if (!empty($validated['password'])) {
            $user->password = Hash::make($validated['password']);
        }

        $user->save();

        return back()->with('success', 'Perfil atualizado com sucesso.');
    }
}
