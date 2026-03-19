<?php

namespace Database\Seeders;

use App\Models\Attendance;
use App\Models\Classroom;
use App\Models\Setting;
use App\Models\StudySession;
use App\Models\User;
use Carbon\Carbon;
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
        Setting::updateOrCreate(['key' => 'current_academic_year'], ['value' => 2026]);

        // ── Staff ──────────────────────────────────────────────
        $admin = User::updateOrCreate(
            ['email' => 'admin@ieadao.pt'],
            [
                'name' => 'Administrador',
                'password' => Hash::make('password'),
                'role' => 'admin',
            ]
        );

        $teachers = [];
        $teacherData = [
            ['name' => 'Professor Silva', 'email' => 'professor@ieadao.pt'],
            ['name' => 'Professora Carvalho', 'email' => 'carvalho@ieadao.pt'],
            ['name' => 'Professor Mendes', 'email' => 'mendes@ieadao.pt'],
        ];
        foreach ($teacherData as $td) {
            $teachers[] = User::updateOrCreate(
                ['email' => $td['email']],
                [
                    'name' => $td['name'],
                    'password' => Hash::make('password'),
                    'role' => 'teacher',
                ]
            );
        }

        // ── Classrooms ────────────────────────────────────────
        $classroomsData = [
            ['name' => 'Turma Alpha', 'description' => 'Turma principal de adultos', 'day' => 'Domingo', 'time' => '09:00', 'active' => true, 'teacher' => 0],
            ['name' => 'Turma Beta', 'description' => 'Turma de jovens', 'day' => 'Domingo', 'time' => '10:30', 'active' => true, 'teacher' => 1],
            ['name' => 'Turma Gamma', 'description' => 'Turma de senhoras', 'day' => 'Sábado', 'time' => '15:00', 'active' => true, 'teacher' => 2],
            ['name' => 'Turma Delta', 'description' => 'Turma antiga (encerrada)', 'day' => 'Domingo', 'time' => '09:00', 'active' => false, 'teacher' => 0],
        ];

        $classrooms = [];
        foreach ($classroomsData as $cd) {
            $c = Classroom::updateOrCreate(
                ['name' => $cd['name']],
                [
                    'description' => $cd['description'],
                    'meeting_day' => $cd['day'],
                    'meeting_time' => $cd['time'],
                    'is_active' => $cd['active'],
                ]
            );
            $c->teachers()->sync([$teachers[$cd['teacher']]->id]);
            $classrooms[] = $c;
        }

        // ── Students ──────────────────────────────────────────
        $studentsData = [
            // Alpha (8 students)
            ['name' => 'João Santos', 'phone' => '912345001', 'grupo' => 'homens', 'classroom' => 0],
            ['name' => 'Manuel Costa', 'phone' => '912345002', 'grupo' => 'homens', 'classroom' => 0],
            ['name' => 'Ricardo Neves', 'phone' => '912345003', 'grupo' => 'homens', 'classroom' => 0],
            ['name' => 'Maria Silva', 'phone' => '912345004', 'grupo' => 'senhoras', 'classroom' => 0],
            ['name' => 'Ana Rodrigues', 'phone' => '912345005', 'grupo' => 'senhoras', 'classroom' => 0],
            ['name' => 'Tomás Ferreira', 'phone' => '912345006', 'grupo' => 'jovens', 'classroom' => 0],
            ['name' => 'Mateus Alves', 'phone' => '912345007', 'grupo' => 'jovens', 'classroom' => 0],
            ['name' => 'Lara Mendes', 'phone' => '912345008', 'grupo' => 'criancas', 'classroom' => 0],
            // Beta (6 students)
            ['name' => 'Pedro Oliveira', 'phone' => '912345009', 'grupo' => 'jovens', 'classroom' => 1],
            ['name' => 'Beatriz Lima', 'phone' => '912345010', 'grupo' => 'jovens', 'classroom' => 1],
            ['name' => 'Diogo Marques', 'phone' => '912345011', 'grupo' => 'jovens', 'classroom' => 1],
            ['name' => 'Carolina Sousa', 'phone' => '912345012', 'grupo' => 'jovens', 'classroom' => 1],
            ['name' => 'Tiago Ramos', 'phone' => '912345013', 'grupo' => 'jovens', 'classroom' => 1],
            ['name' => 'Inês Martins', 'phone' => '912345014', 'grupo' => 'jovens', 'classroom' => 1],
            // Gamma (5 students)
            ['name' => 'Rosa Fernandes', 'phone' => '912345015', 'grupo' => 'senhoras', 'classroom' => 2],
            ['name' => 'Teresa Lopes', 'phone' => '912345016', 'grupo' => 'senhoras', 'classroom' => 2],
            ['name' => 'Fátima Ribeiro', 'phone' => '912345017', 'grupo' => 'senhoras', 'classroom' => 2],
            ['name' => 'Helena Gomes', 'phone' => '912345018', 'grupo' => 'senhoras', 'classroom' => 2],
            ['name' => 'Clara Baptista', 'phone' => '912345019', 'grupo' => 'senhoras', 'classroom' => 2],
            // Delta — inactive (3 students)
            ['name' => 'Sofia Pereira', 'phone' => '912345020', 'grupo' => 'senhoras', 'classroom' => 3],
            ['name' => 'Hugo Cardoso', 'phone' => '912345021', 'grupo' => 'homens', 'classroom' => 3],
            ['name' => 'Leonor Pinto', 'phone' => '912345022', 'grupo' => 'jovens', 'classroom' => 3],
        ];

        $students = [];
        foreach ($studentsData as $sd) {
            $students[] = User::updateOrCreate(
                ['phone' => $sd['phone']],
                [
                    'name' => $sd['name'],
                    'phone' => $sd['phone'],
                    'whatsapp' => $sd['phone'],
                    'grupo_homogeneo' => $sd['grupo'],
                    'classroom_id' => $classrooms[$sd['classroom']]->id,
                    'role' => 'student',
                    'password' => null,
                ]
            );
        }

        // Group students by classroom index
        $studentsByClassroom = [];
        foreach ($studentsData as $i => $sd) {
            $studentsByClassroom[$sd['classroom']][] = $students[$i];
        }

        // ── Sessions & Attendance (last ~3 months, weekly) ───
        $methods = ['manual', 'qr', 'auto'];
        $today = Carbon::today();

        // Lessons per classroom
        $lessonTitles = [
            0 => ['Fé e Obras', 'Oração e Gratidão', 'O Amor ao Próximo', 'Perdão', 'Esperança', 'Humildade', 'Justiça', 'Sabedoria', 'Paciência', 'Generosidade', 'Coragem', 'Fidelidade'],
            1 => ['Identidade em Cristo', 'Propósito de Vida', 'Relacionamentos', 'Decisões', 'Integridade', 'Adoração', 'Servir', 'Comunidade', 'Missões', 'Disciplina', 'Liberdade', 'Compromisso'],
            2 => ['Mulheres da Bíblia', 'Rute e Noemi', 'Ester', 'Maria', 'Sara', 'Ana', 'Débora', 'Raabe', 'Marta e Maria', 'Lídia', 'Priscila', 'A Sunamita'],
            3 => ['Gênesis 1-3', 'Abraão', 'José do Egito', 'Moisés', 'Josué'],
        ];

        foreach ($classrooms as $ci => $classroom) {
            $classroomStudents = $studentsByClassroom[$ci] ?? [];
            if (empty($classroomStudents)) continue;

            $totalStudents = count($classroomStudents);
            $titles = $lessonTitles[$ci];

            // How many weeks back: active classrooms get 12 weeks, inactive gets 5 (old data)
            $weeksBack = $classroom->is_active ? 12 : 5;
            $startOffset = $classroom->is_active ? 0 : 8; // inactive starts further back

            for ($w = 0; $w < $weeksBack; $w++) {
                $weekIndex = $weeksBack - 1 - $w; // 0 = oldest
                $sessionDate = $today->copy()->subWeeks($w + $startOffset);
                $titleIndex = $weekIndex % count($titles);
                $lessonNum = $weekIndex + 1;

                $isCurrent = ($w === 0 && $startOffset === 0);
                $status = $isCurrent ? 'open' : 'closed';

                $session = StudySession::updateOrCreate(
                    ['title' => "Lição {$lessonNum} — {$titles[$titleIndex]}", 'classroom_id' => $classroom->id],
                    [
                        'teacher_id' => $teachers[$ci % count($teachers)]->id,
                        'session_date' => $sessionDate->format('Y-m-d'),
                        'status' => $status,
                        'lesson_type' => 'Bíblica',
                        'attendance_opened_at' => $sessionDate->copy()->setTime(9, 0),
                        'attendance_closed_at' => $isCurrent ? null : $sessionDate->copy()->setTime(11, 0),
                        'check_in_code' => $isCurrent ? 'ABCD1234' : null,
                        'check_in_code_generated_at' => $isCurrent ? now() : null,
                        'check_in_code_expires_at' => $isCurrent ? now()->addMinutes(15) : null,
                    ]
                );

                // Vary attendance: 50-100% of students, trending upward for recent weeks
                // This creates a nice visual pattern on the chart
                $baseRate = 0.5;
                $recentBoost = $weeksBack > 1 ? ($w / ($weeksBack - 1)) * 0.3 : 0; // newer weeks → more boost but inverted
                $attendRate = $baseRate + (1 - $w / max($weeksBack - 1, 1)) * 0.35;
                $attendRate = min($attendRate, 0.95);

                // Add some randomness via a simple deterministic variation
                $variation = (($session->id * 7 + $w * 13) % 20 - 10) / 100;
                $attendRate = max(0.3, min(1.0, $attendRate + $variation));

                $numAttending = max(1, (int) round($totalStudents * $attendRate));
                $numAttending = min($numAttending, $totalStudents);

                // Pick which students attend (rotate based on week for variety)
                $rotated = collect($classroomStudents);
                // Shift the collection so different students miss different weeks
                $shifted = $rotated->slice($w % $totalStudents)->merge($rotated->take($w % $totalStudents));
                $attending = $shifted->take($numAttending);

                foreach ($attending as $student) {
                    $method = $methods[($student->id + $w) % count($methods)];
                    Attendance::updateOrCreate(
                        ['study_session_id' => $session->id, 'student_id' => $student->id],
                        [
                            'check_in_method' => $method,
                            'marked_by_id' => $method === 'manual' ? $teachers[$ci % count($teachers)]->id : null,
                            'checked_in_at' => $sessionDate->copy()->setTime(9, rand(0, 45), rand(0, 59)),
                        ]
                    );
                }
            }
        }

        // ── New features ──────────────────────────────────────────────────
        $this->call([
            EnrollmentSeeder::class,
        ]);
    }
}
