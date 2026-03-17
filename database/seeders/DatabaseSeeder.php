<?php

namespace Database\Seeders;

use App\Enums\CheckInMethod;
use App\Enums\GrupoHomogeneo;
use App\Enums\StudySessionStatus;
use App\Models\Attendance;
use App\Models\Classroom;
use App\Models\Setting;
use App\Models\StudySession;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Settings
        Setting::updateOrCreate(['key' => 'qr_ttl_minutes'], ['value' => 15]);
        Setting::updateOrCreate(['key' => 'attendance_threshold'], ['value' => 75]);
        Setting::updateOrCreate(['key' => 'app_name'], ['value' => 'IEADAO Presenças']);

        // Admin
        $admin = User::updateOrCreate(
            ['email' => 'admin@ieadao.pt'],
            [
                'name' => 'Administrador',
                'password' => Hash::make('password'),
                'role' => 'admin',
            ]
        );

        // Teacher
        $teacher = User::updateOrCreate(
            ['email' => 'professor@ieadao.pt'],
            [
                'name' => 'Professor Silva',
                'password' => Hash::make('password'),
                'role' => 'teacher',
            ]
        );

        // Classrooms
        $turma1 = Classroom::updateOrCreate(
            ['name' => 'Turma Alpha'],
            [
                'description' => 'Turma principal de adultos',
                'teacher_id' => $teacher->id,
                'meeting_day' => 'Domingo',
                'meeting_time' => '09:00',
                'is_active' => true,
            ]
        );

        $turma2 = Classroom::updateOrCreate(
            ['name' => 'Turma Beta'],
            [
                'description' => 'Turma de jovens',
                'teacher_id' => $teacher->id,
                'meeting_day' => 'Domingo',
                'meeting_time' => '10:30',
                'is_active' => false,
            ]
        );

        // 10 students
        $studentsData = [
            ['name' => 'João Santos', 'phone' => '912345001', 'grupo_homogeneo' => 'homens', 'classroom_id' => $turma1->id],
            ['name' => 'Manuel Costa', 'phone' => '912345002', 'grupo_homogeneo' => 'homens', 'classroom_id' => $turma1->id],
            ['name' => 'Pedro Oliveira', 'phone' => '912345003', 'grupo_homogeneo' => 'homens', 'classroom_id' => $turma2->id],
            ['name' => 'Maria Silva', 'phone' => '912345004', 'grupo_homogeneo' => 'senhoras', 'classroom_id' => $turma1->id],
            ['name' => 'Ana Rodrigues', 'phone' => '912345005', 'grupo_homogeneo' => 'senhoras', 'classroom_id' => $turma1->id],
            ['name' => 'Sofia Pereira', 'phone' => '912345006', 'grupo_homogeneo' => 'senhoras', 'classroom_id' => $turma2->id],
            ['name' => 'Tomás Ferreira', 'phone' => '912345007', 'grupo_homogeneo' => 'jovens', 'classroom_id' => $turma1->id],
            ['name' => 'Beatriz Lima', 'phone' => '912345008', 'grupo_homogeneo' => 'jovens', 'classroom_id' => $turma2->id],
            ['name' => 'Mateus Alves', 'phone' => '912345009', 'grupo_homogeneo' => 'criancas', 'classroom_id' => $turma1->id],
            ['name' => 'Inês Martins', 'phone' => '912345010', 'grupo_homogeneo' => 'criancas', 'classroom_id' => $turma2->id],
        ];

        $students = [];
        foreach ($studentsData as $data) {
            $students[] = User::updateOrCreate(
                ['phone' => $data['phone']],
                [
                    ...$data,
                    'whatsapp' => $data['phone'],
                    'alt_contact' => null,
                    'role' => 'student',
                    'password' => null,
                ]
            );
        }

        // Study sessions
        $closedSession = StudySession::updateOrCreate(
            ['title' => 'Lição 1 — Fé e Obras', 'classroom_id' => $turma1->id],
            [
                'session_date' => now()->subWeeks(2)->format('Y-m-d'),
                'status' => 'closed',
                'lesson_type' => 'Bíblica',
                'attendance_opened_at' => now()->subWeeks(2)->setTime(9, 0),
                'attendance_closed_at' => now()->subWeeks(2)->setTime(11, 0),
            ]
        );

        $closedSession2 = StudySession::updateOrCreate(
            ['title' => 'Lição 2 — Oração e Gratidão', 'classroom_id' => $turma1->id],
            [
                'session_date' => now()->subWeek()->format('Y-m-d'),
                'status' => 'closed',
                'lesson_type' => 'Bíblica',
                'attendance_opened_at' => now()->subWeek()->setTime(9, 0),
                'attendance_closed_at' => now()->subWeek()->setTime(11, 0),
            ]
        );

        $openSession = StudySession::updateOrCreate(
            ['title' => 'Lição 3 — O Amor ao Próximo', 'classroom_id' => $turma1->id],
            [
                'session_date' => now()->format('Y-m-d'),
                'status' => 'open',
                'lesson_type' => 'Bíblica',
                'attendance_opened_at' => now()->setTime(9, 0),
                'check_in_code' => 'ABCD1234',
                'check_in_code_generated_at' => now(),
                'check_in_code_expires_at' => now()->addMinutes(15),
            ]
        );

        // Attendance records
        $turma1Students = collect($students)->filter(fn ($s) => $s->classroom_id === $turma1->id);

        foreach ([$closedSession, $closedSession2] as $session) {
            foreach ($turma1Students->take(4) as $student) {
                Attendance::updateOrCreate(
                    ['study_session_id' => $session->id, 'student_id' => $student->id],
                    [
                        'check_in_method' => 'manual',
                        'marked_by_id' => $teacher->id,
                        'checked_in_at' => now()->subWeeks(1),
                    ]
                );
            }
        }

        // First student also in open session
        Attendance::updateOrCreate(
            ['study_session_id' => $openSession->id, 'student_id' => $students[0]->id],
            [
                'check_in_method' => 'qr',
                'marked_by_id' => null,
                'checked_in_at' => now(),
            ]
        );
    }
}
