<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        if (!Auth::check()) {
            // Redirect to appropriate login based on the route
            if (in_array('student', $roles)) {
                return redirect()->route('student.login');
            }
            return redirect()->route('login');
        }

        $user = Auth::user();
        $userRole = $user->role->value;

        if (!in_array($userRole, $roles)) {
            // Redirect based on actual role
            if ($user->isStudent()) {
                return redirect()->route('student.profile');
            }
            return redirect()->route('admin.dashboard');
        }

        return $next($request);
    }
}
