<?php

namespace App\Http\Controllers;

use App\Enums\AttendanceLocation;
use App\Exceptions\AttendanceException;
use App\Exceptions\PhoneNotRegisteredException;
use App\Models\StudySession;
use App\Services\AttendanceService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class CheckInController extends Controller
{
    public function __construct(private readonly AttendanceService $attendanceService)
    {
    }

    public function show(StudySession $studySession): Response
    {
        $studySession->load('classroom');

        return Inertia::render('AcessoSessao', [
            'session' => [
                'id' => $studySession->id,
                'title' => $studySession->title,
                'session_date' => $studySession->session_date->format('Y-m-d'),
                'status' => $studySession->status->value,
                'status_label' => $studySession->status->label(),
                'classroom' => [
                    'name' => $studySession->classroom->name,
                ],
                'check_in_code' => $studySession->check_in_code,
                'check_in_code_expires_at' => $studySession->check_in_code_expires_at?->toISOString(),
            ],
            'auth_phone' => Auth::check() && (Auth::user()->isStudent() || Auth::user()->isTeacher())
                ? Auth::user()->phone
                : null,
            'auth_name' => Auth::check() && (Auth::user()->isStudent() || Auth::user()->isTeacher())
                ? Auth::user()->name
                : null,
        ]);
    }

    public function store(Request $request, StudySession $studySession): RedirectResponse
    {
        $request->validate([
            'phone' => 'required|string',
            'code' => 'required|string',
            'location' => ['required', 'in:na_igreja,online'],
        ]);

        $location = AttendanceLocation::from($request->location);

        try {
            $this->attendanceService->phoneCheckIn(
                $request->phone,
                $studySession,
                $request->code,
                $location
            );

            return back()->with('success', 'Presença confirmada!');
        } catch (PhoneNotRegisteredException $e) {
            return redirect()->route('registration.show', $studySession)
                ->with('phone', $e->phone)
                ->withInput(['phone' => $e->phone]);
        } catch (AttendanceException $e) {
            $message = $e->getMessage();

            if (str_contains($message, 'Já confirmaste')) {
                return back()->with('info', $message);
            }

            if (str_contains($message, 'turma')) {
                return back()->withErrors(['phone' => $message]);
            }

            if (str_contains($message, 'aberta')) {
                return back()->withErrors(['general' => $message]);
            }

            return back()->withErrors(['general' => $message]);
        }
    }
}
