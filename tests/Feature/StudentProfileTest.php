<?php

namespace Tests\Feature;

use App\Models\Attendance;
use App\Models\Classroom;
use App\Models\Setting;
use App\Models\StudySession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StudentProfileTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Setting::create(['key' => 'qr_ttl_minutes', 'value' => 15]);
        Setting::create(['key' => 'attendance_threshold', 'value' => 75]);
    }

    public function test_profile_page_returns_correct_data_for_student(): void
    {
        $classroom = Classroom::factory()->create();
        $student = User::factory()->create([
            'role' => 'student',
            'email' => null,
            'password' => null,
            'classroom_id' => $classroom->id,
        ]);

        $session = StudySession::factory()->create([
            'classroom_id' => $classroom->id,
            'status' => 'closed',
        ]);

        Attendance::create([
            'study_session_id' => $session->id,
            'student_id' => $student->id,
            'check_in_method' => 'manual',
            'checked_in_at' => now(),
        ]);

        $response = $this->actingAs($student)->get('/meu-perfil');

        $response->assertOk();
        $response->assertInertia(fn ($page) =>
            $page->component('MeuPerfil')
                ->has('student')
                ->has('stats')
                ->where('stats.attended', 1)
                ->where('stats.total', 1)
                ->where('stats.rate', 100)
        );
    }

    public function test_student_can_update_profile(): void
    {
        $classroom = Classroom::factory()->create();
        $student = User::factory()->create([
            'role' => 'student',
            'phone' => '912100001',
            'email' => null,
            'password' => null,
            'classroom_id' => $classroom->id,
        ]);

        $response = $this->actingAs($student)->put('/perfil/editar', [
            'name' => 'Nome Atualizado',
            'phone' => '912100001',
            'whatsapp' => '912100001',
            'alt_contact' => null,
            'grupo_homogeneo' => 'jovens',
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $this->assertDatabaseHas('users', [
            'id' => $student->id,
            'name' => 'Nome Atualizado',
            'grupo_homogeneo' => 'jovens',
        ]);
    }

    public function test_student_cannot_change_classroom_via_profile_update(): void
    {
        $classroom1 = Classroom::factory()->create();
        $classroom2 = Classroom::factory()->create();
        $student = User::factory()->create([
            'role' => 'student',
            'phone' => '912100002',
            'email' => null,
            'password' => null,
            'classroom_id' => $classroom1->id,
        ]);

        $this->actingAs($student)->put('/perfil/editar', [
            'name' => $student->name,
            'phone' => '912100002',
            'classroom_id' => $classroom2->id, // Should be ignored
        ]);

        // Classroom should remain unchanged
        $this->assertDatabaseHas('users', [
            'id' => $student->id,
            'classroom_id' => $classroom1->id,
        ]);
    }
}
