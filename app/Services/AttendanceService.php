<?php

namespace App\Services;

use App\Enums\CheckInMethod;
use App\Enums\StudySessionStatus;
use App\Exceptions\AttendanceException;
use App\Exceptions\PhoneNotRegisteredException;
use App\Models\Attendance;
use App\Models\Setting;
use App\Models\StudySession;
use App\Models\User;
use Illuminate\Support\Str;

class AttendanceService
{
    public function openSession(StudySession $session): StudySession
    {
        $ttl = Setting::qrTtlMinutes();
        $code = strtoupper(Str::random(8));
        $now = now();

        $session->update([
            'status' => StudySessionStatus::Open,
            'attendance_opened_at' => $now,
            'check_in_code' => $code,
            'check_in_code_generated_at' => $now,
            'check_in_code_expires_at' => $now->copy()->addMinutes($ttl),
        ]);

        return $session->fresh();
    }

    public function closeSession(StudySession $session): StudySession
    {
        $session->update([
            'status' => StudySessionStatus::Closed,
            'attendance_closed_at' => now(),
        ]);

        return $session->fresh();
    }

    public function regenerateCode(StudySession $session): StudySession
    {
        if (!$session->isOpen()) {
            throw new AttendanceException('A sessão não está aberta.');
        }

        $ttl = Setting::qrTtlMinutes();
        $now = now();

        $session->update([
            'check_in_code' => strtoupper(Str::random(8)),
            'check_in_code_generated_at' => $now,
            'check_in_code_expires_at' => $now->copy()->addMinutes($ttl),
        ]);

        return $session->fresh();
    }

    public function phoneCheckIn(string $phone, int|StudySession $session, string $code): Attendance
    {
        if (!$session instanceof StudySession) {
            $session = StudySession::findOrFail($session);
        }

        // 1. Phone must be registered
        $student = User::where('phone', $phone)
            ->where('role', 'student')
            ->first();

        if (!$student) {
            throw new PhoneNotRegisteredException($phone);
        }

        // 2. Student must belong to the session's classroom
        if ($student->classroom_id !== $session->classroom_id) {
            throw new AttendanceException('Não pertences a esta turma.');
        }

        // 3. Session must be open
        if (!$session->isOpen()) {
            throw new AttendanceException('A sessão não está aberta para presenças.');
        }

        // 4. QR code must match and not be expired
        if ($session->check_in_code !== $code) {
            throw new AttendanceException('Código QR inválido.');
        }

        if ($session->check_in_code_expires_at && now()->isAfter($session->check_in_code_expires_at)) {
            throw new AttendanceException('O código QR expirou. Solicita um novo código ao professor.');
        }

        // 5. Duplicate check + create
        return $this->createAttendance($session, $student, null, CheckInMethod::QR);
    }

    public function markPresent(StudySession $session, User $student, User $markedBy): Attendance
    {
        if (!$session->isOpen()) {
            throw new AttendanceException('A sessão não está aberta.');
        }

        return $this->createAttendance($session, $student, $markedBy, CheckInMethod::Manual);
    }

    public function createAttendance(
        StudySession $session,
        User $student,
        ?User $markedBy,
        CheckInMethod $method
    ): Attendance {
        $existing = Attendance::where('study_session_id', $session->id)
            ->where('student_id', $student->id)
            ->first();

        if ($existing) {
            throw new AttendanceException('Já confirmaste a tua presença nesta sessão.');
        }

        return Attendance::create([
            'study_session_id' => $session->id,
            'student_id' => $student->id,
            'marked_by_id' => $markedBy?->id,
            'check_in_method' => $method,
            'checked_in_at' => now(),
        ]);
    }
}
