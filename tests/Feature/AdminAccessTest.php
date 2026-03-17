<?php

namespace Tests\Feature;

use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminAccessTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Setting::create(['key' => 'qr_ttl_minutes', 'value' => 15]);
        Setting::create(['key' => 'attendance_threshold', 'value' => 75]);
        Setting::create(['key' => 'app_name', 'value' => 'IEADAO']);
    }

    public function test_admin_can_login_with_email_and_access_dashboard(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'email' => 'admin@test.com',
            'password' => bcrypt('password'),
        ]);

        $loginResponse = $this->post('/login', [
            'email' => 'admin@test.com',
            'password' => 'password',
        ]);

        $loginResponse->assertRedirect('/admin');

        $dashResponse = $this->actingAs($admin)->get('/admin');
        $dashResponse->assertOk();
    }

    public function test_teacher_can_access_admin_panel(): void
    {
        $teacher = User::factory()->create([
            'role' => 'teacher',
            'email' => 'teacher@test.com',
            'password' => bcrypt('password'),
        ]);

        $response = $this->actingAs($teacher)->get('/admin');
        $response->assertOk();
    }

    public function test_student_cannot_access_settings(): void
    {
        $student = User::factory()->create([
            'role' => 'student',
            'phone' => '912300001',
            'email' => null,
            'password' => null,
        ]);

        $response = $this->actingAs($student)->get('/admin/definicoes');
        $response->assertRedirect('/meu-perfil');
    }

    public function test_teacher_cannot_access_settings(): void
    {
        $teacher = User::factory()->create([
            'role' => 'teacher',
            'email' => 'teacher2@test.com',
            'password' => bcrypt('password'),
        ]);

        $response = $this->actingAs($teacher)->get('/admin/definicoes');
        // Teacher should be redirected (not admin)
        $response->assertRedirect('/admin');
    }
}
