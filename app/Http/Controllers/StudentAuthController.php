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

        $phone = trim($request->phone);
        $altPhone = str_starts_with($phone, '+') ? ltrim($phone, '+') : '+' . $phone;

        $user = User::whereIn('phone', [$phone, $altPhone])
            ->whereIn('role', ['student', 'teacher'])
            ->first();

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
