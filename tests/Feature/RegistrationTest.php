<?php

namespace Tests\Feature;

use App\Models\Classroom;
use App\Models\Setting;
use App\Models\StudySession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    protected Classroom $classroom;
    protected StudySession $session;

    protected function setUp(): void
    {
        parent::setUp();

        Setting::create(['key' => 'qr_ttl_minutes', 'value' => 15]);

        $this->classroom = Classroom::factory()->create(['is_active' => true]);

        $this->session = StudySession::factory()->create([
            'classroom_id' => $this->classroom->id,
            'status' => 'open',
            'check_in_code' => 'REG1CODE',
            'check_in_code_generated_at' => now(),
            'check_in_code_expires_at' => now()->addMinutes(15),
        ]);
    }

    public function test_student_self_registration_creates_account_and_logs_in(): void
    {
        $response = $this->post("/registar/{$this->session->id}", [
            'name' => 'Novo Estudante',
            'phone' => '912888888',
            'whatsapp' => '912888888',
            'alt_contact' => null,
            'grupo_homogeneo' => 'homens',
            'classroom_id' => $this->classroom->id,
            'code' => 'REG1CODE',
        ]);

        $response->assertRedirect('/meu-perfil');

        $this->assertDatabaseHas('users', [
            'phone' => '912888888',
            'role' => 'student',
            'classroom_id' => $this->classroom->id,
        ]);

        $this->assertAuthenticated();
    }

    public function test_registration_fails_without_required_fields(): void
    {
        $response = $this->post("/registar/{$this->session->id}", [
            'name' => '',
            'phone' => '',
            'grupo_homogeneo' => '',
            'classroom_id' => '',
        ]);

        $response->assertSessionHasErrors(['name', 'phone', 'grupo_homogeneo', 'classroom_id']);
    }

    public function test_registration_fails_with_duplicate_phone(): void
    {
        User::factory()->create([
            'phone' => '912777777',
            'role' => 'student',
            'email' => null,
            'password' => null,
        ]);

        $response = $this->post("/registar/{$this->session->id}", [
            'name' => 'Outro Estudante',
            'phone' => '912777777',
            'grupo_homogeneo' => 'homens',
            'classroom_id' => $this->classroom->id,
        ]);

        $response->assertSessionHasErrors('phone');
    }

    public function test_whatsapp_defaults_to_phone_when_blank(): void
    {
        $this->post("/registar/{$this->session->id}", [
            'name' => 'Test User',
            'phone' => '912666666',
            'whatsapp' => '',
            'grupo_homogeneo' => 'senhoras',
            'classroom_id' => $this->classroom->id,
            'code' => 'REG1CODE',
        ]);

        $this->assertDatabaseHas('users', [
            'phone' => '912666666',
            'whatsapp' => '912666666',
        ]);
    }
}
