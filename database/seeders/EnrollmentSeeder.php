<?php

namespace Database\Seeders;

use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Enrollment history for the single annual class.
 *
 * Cohort growth across years:
 *   2024 — 18 founding members
 *   2025 — 21 (18 continued + 3 new: Diogo, Mariana, Tiago)
 *   2026 — 25 (21 continued + 4 new: Catarina, Rodrigo, Inês, André)
 *
 * One mid-year transfer in 2025: Carlos left in September (transferred_at),
 * demonstrating the transfer trail on the student detail page.
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

        $enroll = function (string $phone, int $year, string $enrolledAt, ?string $transferredAt = null) use ($classroom) {
            $student = User::where('phone', $phone)->first();
            if (!$student) return;
            Enrollment::updateOrCreate(
                ['student_id' => $student->id, 'classroom_id' => $classroom->id, 'academic_year' => $year],
                ['enrolled_at' => $enrolledAt, 'transferred_at' => $transferredAt]
            );
        };

        // ── 2024 — 18 founding members ────────────────────────
        $cohort2024 = [
            '911000001','911000002','911000003','911000004',
            '911000005','911000006','911000007','911000008', // homens
            '911000009','911000010','911000011','911000012',
            '911000013','911000014','911000015','911000016', // senhoras (8 of 10)
        ];
        // + 2 jovens who were there from the start
        $cohort2024 = array_merge($cohort2024, ['911000017', '911000018']);

        foreach ($cohort2024 as $phone) {
            $enroll($phone, 2024, '2024-01-14');
        }

        // ── 2025 — same 18 + 3 new (phones 019, 020, 021) ───
        // Carlos Mendes left mid-year (transferred out in September)
        $continuing2025 = array_diff($cohort2024, ['911000001']); // everyone except Carlos
        foreach ($continuing2025 as $phone) {
            $enroll($phone, 2025, '2025-01-12');
        }
        // Carlos: enrolled Jan 2025, transferred out Sep 2025
        $enroll('911000001', 2025, '2025-01-12', '2025-09-14');

        // 3 new members in 2025
        foreach (['911000019', '911000020', '911000021'] as $phone) {
            $enroll($phone, 2025, '2025-03-02'); // joined mid-year (after Easter)
        }

        // ── 2026 — 21 continued + 4 new (phones 022–025) ────
        // Carlos returned in 2026 (new enrollment record, no transferred_at)
        $returning2026 = array_diff($continuing2025, []); // everyone who didn't leave
        $returning2026 = array_merge(array_values($returning2026), ['911000019','911000020','911000021']);
        // Add Carlos back
        $returning2026[] = '911000001';

        foreach ($returning2026 as $phone) {
            $enroll($phone, 2026, '2026-01-12');
        }

        // 4 new members in 2026
        foreach (['911000022','911000023','911000024','911000025'] as $phone) {
            $enroll($phone, 2026, '2026-01-12');
        }

        $this->command->info('Enrollment history seeded (2024, 2025, 2026).');
    }
}
