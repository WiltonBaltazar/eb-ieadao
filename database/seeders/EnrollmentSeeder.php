<?php

namespace Database\Seeders;

use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * 2026 enrollments only — four cohorts enrolled on different dates.
 *
 * Cohort A (10): enrolled 2026-01-04 → 13 sessions eligible
 * Cohort B  (8): enrolled 2026-02-01 →  9 sessions eligible (Feb 1 onwards)
 * Cohort C  (4): enrolled 2026-03-08 →  4 sessions eligible (Mar 8 onwards)
 * Cohort D  (3): enrolled 2026-03-22 →  2 sessions eligible (Mar 22 onwards)
 *
 * Expected results proving the fix:
 *   André   (D) 2/2 = 100 %   ← would show 2/13 = 15 % without the fix
 *   Inês    (D) 1/2 =  50 %   ← would show 1/13 =  8 % without the fix
 *   Rodrigo (D) 0/2 =   0 %   ← total would wrongly show 13 without the fix
 *   Mariana (C) 4/4 = 100 %   ← would show 4/13 = 31 % without the fix
 */
class EnrollmentSeeder extends Seeder
{
    public function run(): void
    {
        $classroom = Classroom::where('name', 'Escola Bíblica Dominical')->first();

        if (!$classroom) {
            $this->command->warn('Classroom not found — run DatabaseSeeder first.');
            return;
        }

        $enroll = function (string $phone, string $enrolledAt) use ($classroom) {
            $student = User::where('phone', $phone)->first();
            if (!$student) return;
            Enrollment::updateOrCreate(
                ['student_id' => $student->id, 'classroom_id' => $classroom->id, 'academic_year' => 2026],
                ['enrolled_at' => $enrolledAt, 'transferred_at' => null]
            );
        };

        // Cohort A — 10 founding members, enrolled at the first 2026 session
        foreach (['911000001','911000002','911000003','911000004','911000005',
                  '911000006','911000007','911000008','911000009','911000010'] as $phone) {
            $enroll($phone, '2026-01-04');
        }

        // Cohort B — 8 students who joined in February
        foreach (['911000011','911000012','911000013','911000014',
                  '911000015','911000016','911000017','911000018'] as $phone) {
            $enroll($phone, '2026-02-01');
        }

        // Cohort C — 4 students who joined in March (mid-month)
        foreach (['911000019','911000020','911000021','911000022'] as $phone) {
            $enroll($phone, '2026-03-08');
        }

        // Cohort D — 3 very recent students, enrolled 2026-03-22
        foreach (['911000023','911000024','911000025'] as $phone) {
            $enroll($phone, '2026-03-22');
        }

        $this->command->info('Enrollment history seeded (2026 only — 4 cohorts).');
    }
}
