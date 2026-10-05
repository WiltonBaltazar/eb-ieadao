<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class StudentAuthController extends Controller
{
    public function showLogin(): Response
    {
        return Inertia::render('Entrar');
    }

    public function login(Request $request): RedirectResponse
    {
        $request->validate([
            'phone' => 'required|string',
            'phone_local' => 'nullable|string',
        ]);

        // Try the full number (with country prefix) first, then the number as typed
        // without prefix, for accounts saved before the country selector existed
        $user = collect([$request->phone, $request->phone_local])
            ->filter()
            ->unique()
            ->map(fn ($phone) => User::matchingPhone($phone)
                ->whereIn('role', ['student', 'teacher'])
                ->first())
            ->first(fn ($user) => $user !== null);

        if (!$user) {
            return redirect()->route('registration.general', ['phone' => $request->phone]);
        }

        Auth::login($user, $request->boolean('remember'));
        $request->session()->regenerate();

        return redirect()->route('student.profile');
    }

    public function logout(Request $request): RedirectResponse
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('student.login');
    }
}
