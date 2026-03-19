<?php

namespace Database\Seeders;

use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class EnrollmentSeeder extends Seeder
{
    public function run(): void
    {
        // Ensure the current_academic_year setting exists
        Setting::updateOrCreate(['key' => 'current_academic_year'], ['value' => 2026]);

        $alpha  = Classroom::where('name', 'Turma Alpha')->first();
        $beta   = Classroom::where('name', 'Turma Beta')->first();
        $gamma  = Classroom::where('name', 'Turma Gamma')->first();
        $delta  = Classroom::where('name', 'Turma Delta')->first();

        if (!$alpha || !$beta || !$gamma || !$delta) {
            $this->command->warn('Classrooms not found — run DatabaseSeeder first.');
            return;
        }

        // ── 2026 enrollments (current year) ──────────────────────────────
        // These were backfilled by the migration, but we use updateOrCreate so
        // running the seeder multiple times stays safe.

        $currentStudents = User::where('role', 'student')->whereNotNull('classroom_id')->get();
        foreach ($currentStudents as $student) {
            Enrollment::updateOrCreate(
                [
                    'student_id'   => $student->id,
                    'classroom_id' => $student->classroom_id,
                    'academic_year'=> 2026,
                ],
                [
                    'enrolled_at'    => now()->startOfYear(),
                    'transferred_at' => null,
                ]
            );
        }

        // ── 2025 history ─────────────────────────────────────────────────
        // Most Alpha students were already in Alpha; João Santos was in Beta
        // and transferred to Alpha mid-year (shows transfer trail).

        $joao    = User::where('phone', '912345001')->first(); // João Santos → Alpha now
        $manuel  = User::where('phone', '912345002')->first(); // Manuel Costa → Alpha
        $ricardo = User::where('phone', '912345003')->first(); // Ricardo Neves → Alpha
        $maria   = User::where('phone', '912345004')->first(); // Maria Silva → Alpha
        $ana     = User::where('phone', '912345005')->first(); // Ana Rodrigues → Alpha
        $tomas   = User::where('phone', '912345006')->first(); // Tomás Ferreira → Alpha
        $pedro   = User::where('phone', '912345009')->first(); // Pedro Oliveira → Beta
        $beatriz = User::where('phone', '912345010')->first(); // Beatriz Lima → Beta
        $rosa    = User::where('phone', '912345015')->first(); // Rosa Fernandes → Gamma
        $teresa  = User::where('phone', '912345016')->first(); // Teresa Lopes → Gamma

        // João Santos: was in Beta in 2025, transferred to Alpha in October 2025
        if ($joao) {
            Enrollment::updateOrCreate(
                ['student_id' => $joao->id, 'classroom_id' => $beta->id, 'academic_year' => 2025],
                [
                    'enrolled_at'    => '2025-01-15',
                    'transferred_at' => '2025-10-05', // transferred mid-year
                ]
            );
            Enrollment::updateOrCreate(
                ['student_id' => $joao->id, 'classroom_id' => $alpha->id, 'academic_year' => 2025],
                [
                    'enrolled_at'    => '2025-10-05',
                    'transferred_at' => null,
                ]
            );
        }

        // Others were in their current classrooms in 2025 too
        $alpha2025 = [$manuel, $ricardo, $maria, $ana, $tomas];
        foreach (array_filter($alpha2025) as $student) {
            Enrollment::updateOrCreate(
                ['student_id' => $student->id, 'classroom_id' => $alpha->id, 'academic_year' => 2025],
                ['enrolled_at' => '2025-01-15', 'transferred_at' => null]
            );
        }

        $beta2025 = [$pedro, $beatriz];
        foreach (array_filter($beta2025) as $student) {
            Enrollment::updateOrCreate(
                ['student_id' => $student->id, 'classroom_id' => $beta->id, 'academic_year' => 2025],
                ['enrolled_at' => '2025-01-15', 'transferred_at' => null]
            );
        }

        $gamma2025 = [$rosa, $teresa];
        foreach (array_filter($gamma2025) as $student) {
            Enrollment::updateOrCreate(
                ['student_id' => $student->id, 'classroom_id' => $gamma->id, 'academic_year' => 2025],
                ['enrolled_at' => '2025-01-15', 'transferred_at' => null]
            );
        }

        // ── 2024 history ─────────────────────────────────────────────────
        // Smaller set; João was in Delta in 2024, Manuel was in Gamma,
        // showing people can move across years.

        if ($joao) {
            Enrollment::updateOrCreate(
                ['student_id' => $joao->id, 'classroom_id' => $delta->id, 'academic_year' => 2024],
                ['enrolled_at' => '2024-01-20', 'transferred_at' => null]
            );
        }
        if ($manuel) {
            Enrollment::updateOrCreate(
                ['student_id' => $manuel->id, 'classroom_id' => $gamma->id, 'academic_year' => 2024],
                ['enrolled_at' => '2024-01-20', 'transferred_at' => null]
            );
        }
        if ($pedro) {
            Enrollment::updateOrCreate(
                ['student_id' => $pedro->id, 'classroom_id' => $alpha->id, 'academic_year' => 2024],
                ['enrolled_at' => '2024-01-20', 'transferred_at' => null]
            );
        }
        if ($rosa) {
            Enrollment::updateOrCreate(
                ['student_id' => $rosa->id, 'classroom_id' => $gamma->id, 'academic_year' => 2024],
                ['enrolled_at' => '2024-01-20', 'transferred_at' => null]
            );
        }
        if ($teresa) {
            Enrollment::updateOrCreate(
                ['student_id' => $teresa->id, 'classroom_id' => $gamma->id, 'academic_year' => 2024],
                ['enrolled_at' => '2024-01-20', 'transferred_at' => null]
            );
        }

        $this->command->info('Enrollment history seeded (2024, 2025, 2026).');
    }
}
