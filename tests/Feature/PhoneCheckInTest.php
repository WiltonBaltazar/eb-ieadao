<?php

namespace Tests\Feature;

use App\Models\Attendance;
use App\Models\Classroom;
use App\Models\Setting;
use App\Models\StudySession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PhoneCheckInTest extends TestCase
{
    use RefreshDatabase;

    protected Classroom $classroom;
    protected StudySession $session;
    protected User $student;

    protected function setUp(): void
    {
        parent::setUp();

        Setting::create(['key' => 'qr_ttl_minutes', 'value' => 15]);

        $this->classroom = Classroom::factory()->create(['is_active' => true]);
        $this->student = User::factory()->create([
            'role' => 'student',
            'phone' => '912111111',
            'email' => null,
            'password' => null,
            'classroom_id' => $this->classroom->id,
        ]);

        $this->session = StudySession::factory()->create([
            'classroom_id' => $this->classroom->id,
            'status' => 'open',
            'check_in_code' => 'TESTCODE',
            'check_in_code_generated_at' => now(),
            'check_in_code_expires_at' => now()->addMinutes(15),
        ]);
    }

    public function test_successful_phone_check_in(): void
    {
        $response = $this->post("/check-in/{$this->session->id}", [
            'phone' => '912111111',
            'code' => 'TESTCODE',
        ]);

        $response->assertSessionHas('success');
        $this->assertDatabaseHas('attendances', [
            'study_session_id' => $this->session->id,
            'student_id' => $this->student->id,
            'check_in_method' => 'qr',
        ]);
    }

    public function test_duplicate_check_in_shows_friendly_message(): void
    {
        // First check-in
        Attendance::create([
            'study_session_id' => $this->session->id,
            'student_id' => $this->student->id,
            'check_in_method' => 'qr',
            'checked_in_at' => now(),
        ]);

        $response = $this->post("/check-in/{$this->session->id}", [
            'phone' => '912111111',
            'code' => 'TESTCODE',
        ]);

        $response->assertSessionHas('info');
    }

    public function test_check_in_fails_for_wrong_classroom(): void
    {
        $otherClassroom = Classroom::factory()->create();
        $otherStudent = User::factory()->create([
            'role' => 'student',
            'phone' => '912999999',
            'email' => null,
            'password' => null,
            'classroom_id' => $otherClassroom->id,
        ]);

        $response = $this->post("/check-in/{$this->session->id}", [
            'phone' => '912999999',
            'code' => 'TESTCODE',
        ]);

        $response->assertSessionHasErrors('phone');
    }

    public function test_check_in_fails_with_expired_code(): void
    {
        $this->session->update([
            'check_in_code_expires_at' => now()->subMinutes(1),
        ]);

        $response = $this->post("/check-in/{$this->session->id}", [
            'phone' => '912111111',
            'code' => 'TESTCODE',
        ]);

        $response->assertSessionHasErrors('general');
    }

    public function test_check_in_with_unknown_phone_redirects_to_registration(): void
    {
        $response = $this->post("/check-in/{$this->session->id}", [
            'phone' => '912000000',
            'code' => 'TESTCODE',
        ]);

        $response->assertRedirect();
        $this->assertStringContainsString('registar', $response->headers->get('Location'));
    }

    public function test_duplicate_attendance_cannot_be_created(): void
    {
        Attendance::create([
            'study_session_id' => $this->session->id,
            'student_id' => $this->student->id,
            'check_in_method' => 'qr',
            'checked_in_at' => now(),
        ]);

        $this->expectException(\Illuminate\Database\UniqueConstraintViolationException::class);

        Attendance::create([
            'study_session_id' => $this->session->id,
            'student_id' => $this->student->id,
            'check_in_method' => 'manual',
            'checked_in_at' => now(),
        ]);
    }
}
