<?php

namespace Tests\Feature;

use App\Models\Classroom;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StudentAuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_student_can_login_with_phone(): void
    {
        $classroom = Classroom::factory()->create();
        $student = User::factory()->create([
            'role' => 'student',
            'phone' => '912000001',
            'email' => null,
            'password' => null,
            'classroom_id' => $classroom->id,
        ]);

        $response = $this->post('/entrar', ['phone' => '912000001']);
        $response->assertRedirect('/meu-perfil');
        $this->assertAuthenticatedAs($student);
    }

    public function test_login_redirects_unknown_phone_to_registration(): void
    {
        $response = $this->post('/entrar', ['phone' => '999000000']);
        $response->assertRedirect();
        $this->assertStringContainsString('registar', $response->headers->get('Location'));
    }

    public function test_login_fails_for_admin_phone_lookup(): void
    {
        // Admin has no phone — shouldn't be loginable via /entrar
        $admin = User::factory()->create([
            'role' => 'admin',
            'email' => 'admin@t.com',
            'password' => bcrypt('password'),
            'phone' => null,
        ]);

        $response = $this->post('/entrar', ['phone' => '']);
        $response->assertSessionHasErrors('phone');
    }

    public function test_student_logout_redirects_to_entrar(): void
    {
        $student = User::factory()->create(['role' => 'student', 'phone' => '912000002', 'email' => null, 'password' => null]);
        $response = $this->actingAs($student)->post('/sair');
        $response->assertRedirect('/entrar');
        $this->assertGuest();
    }
}
