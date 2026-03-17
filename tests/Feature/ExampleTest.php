<?php

namespace Tests\Feature;

use Tests\TestCase;

class ExampleTest extends TestCase
{
    /**
     * Root URL redirects to /entrar (student login page).
     */
    public function test_the_application_root_redirects_to_entrar(): void
    {
        $response = $this->get('/');

        $response->assertRedirect('/entrar');
    }
}
