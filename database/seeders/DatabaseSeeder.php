<?php

namespace Database\Seeders;

use App\Models\Attendance;
use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\Setting;
use App\Models\StudySession;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * 2026-only seed — designed to prove enrollment-date attendance scoping.
 *
 * Four cohorts enrolled at different points in 2026:
 *   A — 10 students enrolled 2026-01-04  → eligible for all 13 sessions
 *   B —  8 students enrolled 2026-02-01  → eligible for sessions  5-13 (9 sessions)
 *   C —  4 students enrolled 2026-03-08  → eligible for sessions 10-13 (4 sessions)
 *   D —  3 students enrolled 2026-03-22  → eligible for sessions 12-13 (2 sessions)
 *
 * Group D attendance is explicit so the fix is obvious at a glance:
 *   André   attended both  → 2/2 = 100 %   (without fix: 2/13 = 15 %)
 *   Inês    attended one   → 1/2 =  50 %   (without fix: 1/13 =  8 %)
 *   Rodrigo attended none  → 0/2 =   0 %   (without fix: 0/13 =  0 %, but total shows 13 falsely)
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // ── Settings ──────────────────────────────────────────
        Setting::updateOrCreate(['key' => 'qr_ttl_minutes'],       ['value' => 15]);
        Setting::updateOrCreate(['key' => 'attendance_threshold'],  ['value' => 75]);
        Setting::updateOrCreate(['key' => 'app_name'],              ['value' => 'IEADAO Presenças']);
        Setting::updateOrCreate(['key' => 'current_academic_year'], ['value' => 2026]);

        // ── Staff ─────────────────────────────────────────────
        User::updateOrCreate(
            ['email' => 'admin@ieadao.pt'],
            [
                'name'     => 'Pr. António Ferreira',
                'password' => Hash::make('password'),
                'role'     => 'admin',
            ]
        );

        $teacher = User::updateOrCreate(
            ['email' => 'mario@ieadao.pt'],
            ['name' => 'Diác. Mário Santos', 'password' => Hash::make('password'), 'role' => 'teacher']
        );

        // ── Classroom ─────────────────────────────────────────
        $classroom = Classroom::updateOrCreate(
            ['name' => 'Escola Bíblica Dominical'],
            [
                'description'  => 'Turma única — todos os membros',
                'meeting_day'  => 'Domingo',
                'meeting_time' => '09:30',
                'is_active'    => true,
            ]
        );
        $classroom->teachers()->sync([$teacher->id]);

        // ── Students — four cohorts ───────────────────────────
        $studentsData = [
            // Cohort A — enrolled 2026-01-04 (founding 2026 members, 10 students)
            ['phone' => '911000001', 'name' => 'Carlos Mendes',      'grupo' => 'homens'],
            ['phone' => '911000002', 'name' => 'António Sousa',       'grupo' => 'homens'],
            ['phone' => '911000003', 'name' => 'Manuel Figueiredo',   'grupo' => 'homens'],
            ['phone' => '911000004', 'name' => 'Paulo Gomes',         'grupo' => 'homens'],
            ['phone' => '911000005', 'name' => 'Rui Cardoso',         'grupo' => 'homens'],
            ['phone' => '911000006', 'name' => 'Maria da Conceição',  'grupo' => 'senhoras'],
            ['phone' => '911000007', 'name' => 'Rosa Ferreira',       'grupo' => 'senhoras'],
            ['phone' => '911000008', 'name' => 'Fátima Ribeiro',      'grupo' => 'senhoras'],
            ['phone' => '911000009', 'name' => 'Graça Oliveira',      'grupo' => 'senhoras'],
            ['phone' => '911000010', 'name' => 'Helena Costa',        'grupo' => 'senhoras'],
            // Cohort B — enrolled 2026-02-01 (joined in February, 8 students)
            ['phone' => '911000011', 'name' => 'Jorge Lopes',         'grupo' => 'homens'],
            ['phone' => '911000012', 'name' => 'Fernando Pinto',      'grupo' => 'homens'],
            ['phone' => '911000013', 'name' => 'Eduardo Vieira',      'grupo' => 'homens'],
            ['phone' => '911000014', 'name' => 'Isabel Marques',      'grupo' => 'senhoras'],
            ['phone' => '911000015', 'name' => 'Lurdes Baptista',     'grupo' => 'senhoras'],
            ['phone' => '911000016', 'name' => 'Piedade Santos',      'grupo' => 'senhoras'],
            ['phone' => '911000017', 'name' => 'Filomena Alves',      'grupo' => 'senhoras'],
            ['phone' => '911000018', 'name' => 'Alcinda Monteiro',    'grupo' => 'senhoras'],
            // Cohort C — enrolled 2026-03-08 (joined in March, 4 students)
            ['phone' => '911000019', 'name' => 'Diogo Ferreira',      'grupo' => 'jovens'],
            ['phone' => '911000020', 'name' => 'Mariana Silva',       'grupo' => 'jovens'],
            ['phone' => '911000021', 'name' => 'Tiago Almeida',       'grupo' => 'jovens'],
            ['phone' => '911000022', 'name' => 'Catarina Rocha',      'grupo' => 'jovens'],
            // Cohort D — enrolled 2026-03-22 (very recent, 3 students)
            ['phone' => '911000023', 'name' => 'Rodrigo Moreira',     'grupo' => 'jovens'],
            ['phone' => '911000024', 'name' => 'Inês Carvalho',       'grupo' => 'jovens'],
            ['phone' => '911000025', 'name' => 'André Fonseca',       'grupo' => 'jovens'],
        ];

        $students = [];
        foreach ($studentsData as $sd) {
            $students[$sd['phone']] = User::updateOrCreate(
                ['phone' => $sd['phone']],
                [
                    'name'            => $sd['name'],
                    'phone'           => $sd['phone'],
                    'whatsapp'        => $sd['phone'],
                    'grupo_homogeneo' => $sd['grupo'],
                    'classroom_id'    => $classroom->id,
                    'role'            => 'student',
                    'password'        => null,
                ]
            );
        }

        // ── 2026 Sessions (all 13 Sundays Jan–Mar) ───────────
        // Session 13 (2026-03-29) is open; all others closed.
        $sessions2026 = [
            ['date' => '2026-01-04', 'title' => 'Lição 1 — A Criação e o Propósito de Deus',            'status' => 'closed'],
            ['date' => '2026-01-11', 'title' => 'Lição 2 — O Pecado e a Necessidade de Salvação',        'status' => 'closed'],
            ['date' => '2026-01-18', 'title' => 'Lição 3 — A Graça de Deus — Amor Incondicional',        'status' => 'closed'],
            ['date' => '2026-01-25', 'title' => 'Lição 4 — Fé: O que é e Como Cresce',                   'status' => 'closed'],
            ['date' => '2026-02-01', 'title' => 'Lição 5 — A Oração que Transforma',                     'status' => 'closed'],
            ['date' => '2026-02-08', 'title' => 'Lição 6 — A Bíblia: Palavra Viva e Eficaz',             'status' => 'closed'],
            ['date' => '2026-02-15', 'title' => 'Lição 7 — Arrependimento e Perdão',                     'status' => 'closed'],
            ['date' => '2026-02-22', 'title' => 'Lição 8 — O Batismo: Significado e Chamado',             'status' => 'closed'],
            ['date' => '2026-03-01', 'title' => 'Lição 9 — O Espírito Santo na Vida do Crente',          'status' => 'closed'],
            ['date' => '2026-03-08', 'title' => 'Lição 10 — A Igreja: Corpo de Cristo',                   'status' => 'closed'],
            ['date' => '2026-03-15', 'title' => 'Lição 11 — Discipulado: Seguir a Jesus',                 'status' => 'closed'],
            ['date' => '2026-03-22', 'title' => 'Lição 12 — Mordomia: Administrando o que Deus Deu',      'status' => 'closed'],
            ['date' => '2026-03-29', 'title' => 'Lição 13 — A Família segundo a Bíblia',                  'status' => 'open'],
        ];

        $sessionModels = [];
        foreach ($sessions2026 as $s) {
            $date = Carbon::parse($s['date']);
            $isOpen = $s['status'] === 'open';
            $sessionModels[$s['date']] = StudySession::updateOrCreate(
                ['classroom_id' => $classroom->id, 'session_date' => $s['date']],
                [
                    'title'                      => $s['title'],
                    'teacher_id'                 => $teacher->id,
                    'status'                     => $s['status'],
                    'lesson_type'                => 'Bíblica',
                    'attendance_opened_at'       => $date->copy()->setTime(9, 30),
                    'attendance_closed_at'       => $isOpen ? null : $date->copy()->setTime(11, 30),
                    'check_in_code'              => $isOpen ? 'ABCD1234' : null,
                    'check_in_code_generated_at' => $isOpen ? now() : null,
                    'check_in_code_expires_at'   => $isOpen ? now()->addMinutes(15) : null,
                ]
            );
        }

        // Helper to mark attendance — QR check-ins get a realistic mix of locations
        $attend = function (string $phone, string $date, string $method = 'manual') use ($students, $sessionModels, $teacher) {
            $student = $students[$phone] ?? null;
            $session = $sessionModels[$date] ?? null;
            if (!$student || !$session) return;

            // manual/auto = always na_igreja; qr = ~40 % online (deterministic via hash)
            if ($method === 'qr' && abs(crc32($phone . $date . 'loc')) % 5 < 2) {
                $location = 'online';
            } else {
                $location = 'na_igreja';
            }

            Attendance::updateOrCreate(
                ['study_session_id' => $session->id, 'student_id' => $student->id],
                [
                    'check_in_method' => $method,
                    'location'        => $location,
                    'marked_by_id'    => $method === 'manual' ? $teacher->id : null,
                    'checked_in_at'   => Carbon::parse($date)->setTime(9, rand(30, 55), rand(0, 59)),
                ]
            );
        };

        // ── Cohort A attendance (enrolled 2026-01-04, 13 sessions eligible) ──
        // ~75–85 % rate across all 13 sessions — realistic, varied per student
        $cohortA = ['911000001','911000002','911000003','911000004','911000005',
                    '911000006','911000007','911000008','911000009','911000010'];
        $allDates = array_column($sessions2026, 'date');

        // Each student misses 2-3 sessions spread across the year
        $missPattern = [
            '911000001' => ['2026-01-18', '2026-02-22'],
            '911000002' => ['2026-02-08', '2026-03-15'],
            '911000003' => ['2026-01-25', '2026-03-01', '2026-03-29'],
            '911000004' => ['2026-02-01', '2026-03-08'],
            '911000005' => ['2026-01-11', '2026-02-15', '2026-03-22'],
            '911000006' => ['2026-02-22', '2026-03-29'],
            '911000007' => ['2026-01-18', '2026-03-08'],
            '911000008' => ['2026-01-25', '2026-02-08', '2026-03-22'],
            '911000009' => ['2026-02-01', '2026-03-15'],
            '911000010' => ['2026-01-11', '2026-02-15'],
        ];
        foreach ($cohortA as $phone) {
            $missing = $missPattern[$phone] ?? [];
            foreach ($allDates as $date) {
                if (!in_array($date, $missing)) {
                    $attend($phone, $date, ['manual', 'qr', 'auto'][crc32($phone.$date) % 3]);
                }
            }
        }

        // ── Cohort B attendance (enrolled 2026-02-01, sessions 5-13 eligible) ──
        // ~78 % rate — they were NOT here for Jan sessions (those don't count)
        $cohortBDates = ['2026-02-01','2026-02-08','2026-02-15','2026-02-22',
                         '2026-03-01','2026-03-08','2026-03-15','2026-03-22','2026-03-29'];
        $cohortBMiss = [
            '911000011' => ['2026-02-15', '2026-03-22'],
            '911000012' => ['2026-02-22', '2026-03-08'],
            '911000013' => ['2026-03-01', '2026-03-29'],
            '911000014' => ['2026-02-08', '2026-03-15'],
            '911000015' => ['2026-02-22'],
            '911000016' => ['2026-03-08', '2026-03-22'],
            '911000017' => ['2026-02-15'],
            '911000018' => ['2026-03-01', '2026-03-15'],
        ];
        foreach ($cohortBMiss as $phone => $missing) {
            foreach ($cohortBDates as $date) {
                if (!in_array($date, $missing)) {
                    $attend($phone, $date, ['manual', 'qr'][crc32($phone.$date) % 2]);
                }
            }
        }

        // ── Cohort C attendance (enrolled 2026-03-08, sessions 10-13 eligible) ──
        // Explicit so it's easy to verify: 4 sessions eligible each
        $cohortCDates = ['2026-03-08','2026-03-15','2026-03-22','2026-03-29'];
        //  Diogo   3/4 = 75 %  — misses last
        foreach (['2026-03-08','2026-03-15','2026-03-22'] as $d) { $attend('911000019', $d, 'qr'); }
        //  Mariana 4/4 = 100 %
        foreach ($cohortCDates as $d) { $attend('911000020', $d, 'qr'); }
        //  Tiago   2/4 = 50 %  — misses sessions 11 & 12
        foreach (['2026-03-08','2026-03-29'] as $d) { $attend('911000021', $d, 'manual'); }
        //  Catarina 3/4 = 75 % — attends first, misses last
        foreach (['2026-03-08','2026-03-15','2026-03-22'] as $d) { $attend('911000022', $d, 'qr'); }

        // ── Cohort D attendance (enrolled 2026-03-22, sessions 12-13 eligible) ──
        // The most obvious proof: only 2 sessions should count, not 13
        //  Rodrigo  1/2 =  50 %  — attends first session, misses second
        //  Rodrigo  1/2 =  50 %  — attends first, misses second
        $attend('911000023', '2026-03-22', 'manual');
        //  Inês     1/2 =  50 %  — attended session 12 only
        $attend('911000024', '2026-03-22', 'manual');
        //  André    2/2 = 100 %  — attended both sessions
        $attend('911000025', '2026-03-22', 'manual');
        $attend('911000025', '2026-03-29', 'qr');

        $this->call([EnrollmentSeeder::class]);
    }
}
