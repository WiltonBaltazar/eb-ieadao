<?php

namespace Tests\Feature;

use App\Models\Attendance;
use App\Models\Classroom;
use App\Models\Enrollment;
use App\Models\Setting;
use App\Models\StudySession;
use App\Models\User;
use App\Services\PastorReportService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PastorReportTest extends TestCase
{
    use RefreshDatabase;

    private Classroom $classroom;

    /** @var StudySession[] */
    private array $sessions = [];

    protected function setUp(): void
    {
        parent::setUp();
        Setting::create(['key' => 'qr_ttl_minutes', 'value' => 15]);
        Setting::create(['key' => 'attendance_threshold', 'value' => 75]);
        Setting::create(['key' => 'app_name', 'value' => 'IEADAO']);

        $this->classroom = Classroom::factory()->create();

        // 10 sessions in 2026, one per week starting 6 Jan
        for ($i = 0; $i < 10; $i++) {
            $this->sessions[] = StudySession::factory()->create([
                'classroom_id' => $this->classroom->id,
                'session_date' => now()->setDate(2026, 1, 6)->addWeeks($i)->toDateString(),
                'status'       => 'closed',
            ]);
        }
    }

    /** @param array<int, string|null> $locations one location per attended session, in order */
    private function student(string $name, array $locations, ?string $enrolledAt = '2026-01-01'): User
    {
        $student = User::factory()->create([
            'role'         => 'student',
            'name'         => $name,
            'classroom_id' => $this->classroom->id,
        ]);

        if ($enrolledAt) {
            Enrollment::create([
                'student_id'    => $student->id,
                'classroom_id'  => $this->classroom->id,
                'academic_year' => 2026,
                'enrolled_at'   => $enrolledAt,
            ]);
        }

        foreach ($locations as $i => $location) {
            Attendance::create([
                'study_session_id' => $this->sessions[$i]->id,
                'student_id'       => $student->id,
                'check_in_method'  => 'qr',
                'location'         => $location,
                'checked_in_at'    => $this->sessions[$i]->session_date,
            ]);
        }

        return $student;
    }

    private function row(string $name): array
    {
        return app(PastorReportService::class)->rows(2026)->firstWhere('name', $name);
    }

    public function test_majority_online_is_classed_online(): void
    {
        $this->student('Ana', ['online', 'online', 'na_igreja']);

        $row = $this->row('Ana');
        $this->assertSame('Online', $row['modality']);
        $this->assertSame(2, $row['online']);
        $this->assertSame(1, $row['na_igreja']);
        $this->assertSame(30, $row['rate']);
    }

    public function test_tie_null_location_and_no_attendance_count_as_na_igreja(): void
    {
        $this->student('Tie', ['online', 'na_igreja']);
        $this->student('Legacy', [null, null, 'online']);
        $this->student('Absent', []);

        $this->assertSame('Na igreja', $this->row('Tie')['modality']);
        $this->assertSame('Na igreja', $this->row('Legacy')['modality']);
        $this->assertSame(2, $this->row('Legacy')['na_igreja']);
        $this->assertSame('Na igreja', $this->row('Absent')['modality']);
        $this->assertSame(0, $this->row('Absent')['rate']);
    }

    public function test_rate_threshold_is_strictly_greater_than(): void
    {
        $this->student('Thirty', ['online', 'online', 'online']);           // 30%
        $this->student('Forty', ['online', 'online', 'online', 'online']); // 40%
        $this->student('Church', array_fill(0, 5, 'na_igreja'));           // 50%

        $sheets = app(PastorReportService::class)->sheets(2026, 30);

        $this->assertSame(['Forty', 'Thirty'], $sheets['Online']->pluck('name')->all());
        $this->assertSame(['Forty'], $sheets['Online >30%']->pluck('name')->all());
        $this->assertSame(['Church'], $sheets['Na Igreja >30%']->pluck('name')->all());
        $this->assertSame(['Church', 'Forty', 'Thirty'], $sheets['Todos']->pluck('name')->all());
    }

    public function test_sessions_before_enrollment_are_not_counted(): void
    {
        // Enrolled before the 6th session: only sessions 6–10 count (5 sessions)
        $this->student('Late', [], $this->sessions[5]->session_date->toDateString());
        Attendance::create([
            'study_session_id' => $this->sessions[5]->id,
            'student_id'       => User::where('name', 'Late')->value('id'),
            'check_in_method'  => 'manual',
            'checked_in_at'    => $this->sessions[5]->session_date,
        ]);

        $row = $this->row('Late');
        $this->assertSame(5, $row['total']);
        $this->assertSame(1, $row['attended']);
        $this->assertSame(20, $row['rate']);
    }

    public function test_student_without_enrollment_or_attendance_that_year_is_excluded(): void
    {
        $this->student('Ghost', [], null);

        $this->assertNull(app(PastorReportService::class)->rows(2026)->firstWhere('name', 'Ghost'));
    }

    public function test_admin_can_download_workbook_and_student_cannot(): void
    {
        $this->student('Ana', ['online']);
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)
            ->get('/admin/relatorios/pastor/exportar-excel?year=2026&min_rate=30')
            ->assertOk()
            ->assertHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        $student = User::where('name', 'Ana')->first();
        $this->actingAs($student)
            ->get('/admin/relatorios/pastor/exportar-excel?year=2026')
            ->assertRedirect('/meu-perfil');
    }
}
