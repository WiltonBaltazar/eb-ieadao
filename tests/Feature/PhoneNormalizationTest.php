<?php

namespace Tests\Feature;

use App\Models\User;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class PhoneNormalizationTest extends TestCase
{
    public static function phones(): array
    {
        return [
            'mozambique doubled' => ['+258258827622902', '+258827622902'],
            'portugal doubled' => ['+351351912345678', '+351912345678'],
            'brazil doubled' => ['+555511987654321', '+5511987654321'],
            'south africa doubled' => ['+2727821234567', '+27821234567'],
            'uk doubled' => ['+44447911123456', '+447911123456'],
            'usa doubled' => ['+112025550123', '+12025550123'],
            'cape verde doubled' => ['+2382389912345', '+2389912345'],
            'mozambique valid' => ['+258827622902', '+258827622902'],
            'french number starting with 33' => ['+33333123456', '+33333123456'],
            'kazakh number starting with 7' => ['+77012345678', '+77012345678'],
            'italian mobile starting with 39' => ['+393912345678', '+393912345678'],
            'not international' => ['827622902', '827622902'],
        ];
    }

    #[DataProvider('phones')]
    public function test_normalize_phone_drops_only_repeated_country_code(string $input, string $expected): void
    {
        $this->assertSame($expected, User::normalizePhone($input));
    }
}
