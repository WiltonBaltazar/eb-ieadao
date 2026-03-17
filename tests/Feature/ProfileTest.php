<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Breeze /profile routes are not used in this app.
 * Student profile is at /meu-perfil — tested in StudentProfileTest.
 */
class ProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_placeholder(): void
    {
        $this->assertTrue(true);
    }
}
