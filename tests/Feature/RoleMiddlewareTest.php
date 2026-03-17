<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoleMiddlewareTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Seed minimum settings
        \App\Models\Setting::create(['key' => 'qr_ttl_minutes', 'value' => 15]);
        \App\Models\Setting::create(['key' => 'attendance_threshold', 'value' => 75]);
    }

    public function test_guest_hitting_student_route_redirects_to_entrar(): void
    {
        $response = $this->get('/meu-perfil');
        $response->assertRedirect('/entrar');
    }

    public function test_guest_hitting_admin_route_redirects_to_login(): void
    {
        $response = $this->get('/admin');
        $response->assertRedirect('/login');
    }

    public function test_student_cannot_access_admin_route(): void
    {
        $student = User::factory()->create(['role' => 'student']);
        $response = $this->actingAs($student)->get('/admin');
        $response->assertRedirect('/meu-perfil');
    }

    public function test_admin_hitting_student_route_redirects_to_admin(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'email' => 'admin@test.com', 'password' => bcrypt('password')]);
        $response = $this->actingAs($admin)->get('/meu-perfil');
        $response->assertRedirect('/admin');
    }

    public function test_student_can_access_student_route(): void
    {
        $classroom = \App\Models\Classroom::factory()->create();
        $student = User::factory()->create([
            'role' => 'student',
            'classroom_id' => $classroom->id,
            'email' => null,
            'password' => null,
        ]);
        $response = $this->actingAs($student)->get('/meu-perfil');
        $response->assertOk();
    }

    public function test_admin_can_access_admin_route(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'email' => 'admin2@test.com', 'password' => bcrypt('password')]);
        $response = $this->actingAs($admin)->get('/admin');
        $response->assertOk();
    }

    public function test_teacher_can_access_admin_route(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher', 'email' => 'teacher@test.com', 'password' => bcrypt('password')]);
        $response = $this->actingAs($teacher)->get('/admin');
        $response->assertOk();
    }
}
