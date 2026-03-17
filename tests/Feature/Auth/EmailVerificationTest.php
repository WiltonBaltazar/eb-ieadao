<?php

namespace Tests\Feature\Auth;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Email verification is not used in this app (students use phone auth,
 * admins/teachers are created by seeder). Tests are intentionally minimal.
 */
class EmailVerificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_placeholder(): void
    {
        $this->assertTrue(true);
    }
}
