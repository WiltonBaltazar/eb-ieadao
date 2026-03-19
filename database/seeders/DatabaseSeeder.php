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

        $teacherData = [
            ['name' => 'Diác. Mário Santos',  'email' => 'mario@ieadao.pt'],
            ['name' => 'Irmã Conceição Neves', 'email' => 'conceicao@ieadao.pt'],
        ];
        $teachers = [];
        foreach ($teacherData as $td) {
            $teachers[] = User::updateOrCreate(
                ['email' => $td['email']],
                ['name' => $td['name'], 'password' => Hash::make('password'), 'role' => 'teacher']
            );
        }

        // ── One classroom for everyone ────────────────────────
        // No gender/age separation — all members attend together.
        // The same classroom persists year over year; annual enrollments
        // track which students were active each year.
        $classroom = Classroom::updateOrCreate(
            ['name' => 'Escola Bíblica Dominical'],
            [
                'description'  => 'Turma única — todos os membros',
                'meeting_day'  => 'Domingo',
                'meeting_time' => '09:30',
                'is_active'    => true,
            ]
        );
        $classroom->teachers()->sync([$teachers[0]->id]);

        // ── Students (25) — mixed grupos, all in the same classroom ──
        $studentsData = [
            // Homens (8)
            ['name' => 'Carlos Mendes',      'phone' => '911000001', 'grupo' => 'homens'],
            ['name' => 'António Sousa',       'phone' => '911000002', 'grupo' => 'homens'],
            ['name' => 'Manuel Figueiredo',   'phone' => '911000003', 'grupo' => 'homens'],
            ['name' => 'Paulo Gomes',         'phone' => '911000004', 'grupo' => 'homens'],
            ['name' => 'Rui Cardoso',         'phone' => '911000005', 'grupo' => 'homens'],
            ['name' => 'Jorge Lopes',         'phone' => '911000006', 'grupo' => 'homens'],
            ['name' => 'Fernando Pinto',      'phone' => '911000007', 'grupo' => 'homens'],
            ['name' => 'Eduardo Vieira',      'phone' => '911000008', 'grupo' => 'homens'],
            // Senhoras (10)
            ['name' => 'Maria da Conceição',  'phone' => '911000009', 'grupo' => 'senhoras'],
            ['name' => 'Rosa Ferreira',        'phone' => '911000010', 'grupo' => 'senhoras'],
            ['name' => 'Fátima Ribeiro',       'phone' => '911000011', 'grupo' => 'senhoras'],
            ['name' => 'Graça Oliveira',       'phone' => '911000012', 'grupo' => 'senhoras'],
            ['name' => 'Helena Costa',         'phone' => '911000013', 'grupo' => 'senhoras'],
            ['name' => 'Isabel Marques',       'phone' => '911000014', 'grupo' => 'senhoras'],
            ['name' => 'Lurdes Baptista',      'phone' => '911000015', 'grupo' => 'senhoras'],
            ['name' => 'Piedade Santos',       'phone' => '911000016', 'grupo' => 'senhoras'],
            ['name' => 'Filomena Alves',       'phone' => '911000017', 'grupo' => 'senhoras'],
            ['name' => 'Alcinda Monteiro',     'phone' => '911000018', 'grupo' => 'senhoras'],
            // Jovens (7)
            ['name' => 'Diogo Ferreira',       'phone' => '911000019', 'grupo' => 'jovens'],
            ['name' => 'Mariana Silva',        'phone' => '911000020', 'grupo' => 'jovens'],
            ['name' => 'Tiago Almeida',        'phone' => '911000021', 'grupo' => 'jovens'],
            ['name' => 'Catarina Rocha',       'phone' => '911000022', 'grupo' => 'jovens'],
            ['name' => 'Rodrigo Moreira',      'phone' => '911000023', 'grupo' => 'jovens'],
            ['name' => 'Inês Carvalho',        'phone' => '911000024', 'grupo' => 'jovens'],
            ['name' => 'André Fonseca',        'phone' => '911000025', 'grupo' => 'jovens'],
        ];

        $students = [];
        foreach ($studentsData as $sd) {
            $students[] = User::updateOrCreate(
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

        // ── Sessions & Attendance ─────────────────────────────
        // Weekly Sunday sessions across three academic years.
        // The classroom is the same every year; the year is derived from session_date.

        $methods   = ['manual', 'qr', 'auto'];
        $teacher   = $teachers[0];

        // Lesson series cycling through biblical topics (24 titles)
        $titles = [
            'A Criação e o Propósito de Deus',
            'O Pecado e a Necessidade de Salvação',
            'A Graça de Deus — Amor Incondicional',
            'Fé: O que é e Como Cresce',
            'A Oração que Transforma',
            'A Bíblia: Palavra Viva e Eficaz',
            'Arrependimento e Perdão',
            'O Batismo: Significado e Chamado',
            'O Espírito Santo na Vida do Crente',
            'A Igreja: Corpo de Cristo',
            'Discipulado: Seguir a Jesus',
            'Mordomia: Administrando o que Deus Deu',
            'A Família segundo a Bíblia',
            'Trabalho e Vocação Cristã',
            'Sofrimento e a Soberania de Deus',
            'Esperança e Vida Eterna',
            'O Grande Mandamento: Amar a Deus e ao Próximo',
            'A Grande Comissão: Ir e Fazer Discípulos',
            'Integridade e Carácter Cristão',
            'Gratidão: Uma Vida de Adoração',
            'Servir: O Caminho para a Grandeza',
            'Comunidade e Responsabilidade Mútua',
            'O Regresso de Cristo',
            'Viver pela Fé no Dia a Dia',
        ];
        $titlesLen = count($titles);

        // Find last Sunday on or before today
        $today      = Carbon::today();
        $lastSunday = $today->isSunday() ? $today->copy() : $today->previous(Carbon::SUNDAY);

        // Build the full list of Sunday dates to seed
        $sundays = [];

        // 2024: all Sundays (Jan 7 → Dec 29)
        for ($d = Carbon::create(2024, 1, 7); $d->year === 2024; $d->addWeek()) {
            $sundays[] = $d->copy();
        }
        // 2025: all Sundays (Jan 5 → Dec 28)
        for ($d = Carbon::create(2025, 1, 5); $d->year === 2025; $d->addWeek()) {
            $sundays[] = $d->copy();
        }
        // 2026: Jan 4 → last Sunday
        for ($d = Carbon::create(2026, 1, 4); $d->lte($lastSunday); $d->addWeek()) {
            $sundays[] = $d->copy();
        }

        $totalSundays = count($sundays);

        foreach ($sundays as $idx => $sunday) {
            $lessonNum   = $idx + 1;
            $titleIndex  = $idx % $titlesLen;
            $isCurrent   = $sunday->equalTo($lastSunday);
            $status      = $isCurrent ? 'open' : 'closed';

            $session = StudySession::updateOrCreate(
                ['classroom_id' => $classroom->id, 'session_date' => $sunday->format('Y-m-d')],
                [
                    'title'                      => "Lição {$lessonNum} — {$titles[$titleIndex]}",
                    'teacher_id'                 => $teacher->id,
                    'status'                     => $status,
                    'lesson_type'                => 'Bíblica',
                    'attendance_opened_at'       => $sunday->copy()->setTime(9, 30),
                    'attendance_closed_at'       => $isCurrent ? null : $sunday->copy()->setTime(11, 30),
                    'check_in_code'              => $isCurrent ? 'ABCD1234' : null,
                    'check_in_code_generated_at' => $isCurrent ? now() : null,
                    'check_in_code_expires_at'   => $isCurrent ? now()->addMinutes(15) : null,
                ]
            );

            // Which students were enrolled this year?
            // EnrollmentSeeder defines the per-year cohorts. For attendance we
            // use the students whose classroom_id is set — they are all in this class.
            // We'll vary attendance between 60–90 % to create realistic chart data.
            $attendRate = 0.60 + (sin($idx * 0.4) * 0.15) + (($idx % 7) * 0.01);
            $attendRate = max(0.45, min(0.92, $attendRate));

            $numAttending = max(1, (int) round(count($students) * $attendRate));
            $numAttending = min($numAttending, count($students));

            // Rotate which students are present each week
            $rotated   = collect($students);
            $shifted   = $rotated->slice($idx % count($students))->merge($rotated->take($idx % count($students)));
            $attending = $shifted->take($numAttending);

            foreach ($attending as $student) {
                $method = $methods[($student->id + $idx) % count($methods)];
                Attendance::updateOrCreate(
                    ['study_session_id' => $session->id, 'student_id' => $student->id],
                    [
                        'check_in_method' => $method,
                        'marked_by_id'    => $method === 'manual' ? $teacher->id : null,
                        'checked_in_at'   => $sunday->copy()->setTime(9, rand(25, 60), rand(0, 59)),
                    ]
                );
            }
        }

        $this->call([EnrollmentSeeder::class]);
    }
}
