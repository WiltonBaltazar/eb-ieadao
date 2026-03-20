<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Definicoes', [
            'settings' => [
                'qr_ttl_minutes'       => Setting::qrTtlMinutes(),
                'attendance_threshold' => Setting::attendanceThreshold(),
                'app_name'             => Setting::appName(),
            ],
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $request->validate([
            'qr_ttl_minutes'        => 'required|integer|min:1|max:1440',
            'attendance_threshold'  => 'required|integer|min:1|max:100',
            'app_name'              => 'required|string|max:100',
        ]);

        Setting::set('qr_ttl_minutes', $request->qr_ttl_minutes);
        Setting::set('attendance_threshold', $request->attendance_threshold);
        Setting::set('app_name', $request->app_name);

        return back()->with('success', 'Definições guardadas com sucesso.');
    }
}
