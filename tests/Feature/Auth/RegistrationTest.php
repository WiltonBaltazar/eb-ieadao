<?php

namespace Tests\Feature\Auth;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Public registration is disabled — students self-register via /registar/{session}.
 * Admins/teachers are created by seeder only.
 */
class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_route_does_not_exist(): void
    {
        $response = $this->get('/register');
        $response->assertStatus(404);
    }
}
