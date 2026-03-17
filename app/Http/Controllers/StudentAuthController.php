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
        $request->validate(['phone' => 'required|string']);

        $user = User::where('phone', $request->phone)
            ->where('role', 'student')
            ->first();

        if (!$user) {
            return back()->withErrors([
                'phone' => 'Número não registado. Regista-te através do QR code de uma sessão.',
            ]);
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
